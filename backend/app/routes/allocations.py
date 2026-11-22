"""
GateWise API v1 — Allocations & Calculations Router.
Connects the mathematical calculation engine, allocation generator,
and independent conflict detection service to the REST API.
"""

import json
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import Simulation, RestrictionMatrix
from app.schemas.api_schemas import (
    InclusionExclusionResponse,
    AllocationGenerationResponse,
    AllocationPlan,
    ConflictDetectionResponse,
    AllocationValidationRequest
)
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.allocation_generator_service import AllocationGeneratorService, AllocationGeneratorError
from app.services.conflict_detection_service import ConflictDetectionService, ConflictDetectionError
from app.services.rook_polynomial_service import InvalidMatrixError
from app.services.activity_service import log_activity


router = APIRouter(tags=["Allocations & Calculations"])


def _get_simulation_context(sim_id: str, db: Session):
    """Retrieve and validate the simulation and its square restriction matrix."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario with ID {sim_id} not found."
        )

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restriction matrix for simulation {sim_id} not found."
        )

    matrix = json.loads(matrix_record.matrix_data)
    rows = matrix_record.rows_count
    cols = matrix_record.cols_count

    if rows == 0 or cols == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Simulation {sim_id} restriction matrix cannot be empty (0 rows or 0 columns). Currently: {rows} x {cols}."
        )

    # Resolve ordered flight IDs and gate IDs
    flight_ids = [sf.flight_id for sf in sim.selected_flights]
    gate_ids = [sg.gate_id for sg in sim.selected_gates]

    if len(flight_ids) != rows or len(gate_ids) != cols:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Mismatch between linked entities (flights: {len(flight_ids)}, gates: {len(gate_ids)}) and matrix dimensions ({rows} x {cols})."
        )

    return sim, matrix, flight_ids, gate_ids


@router.get(
    "/simulations/{sim_id}/calculate",
    response_model=InclusionExclusionResponse,
    summary="Compute exact Rook Polynomial and Inclusion-Exclusion for simulation"
)
def calculate_simulation(sim_id: str, db: Session = Depends(get_db)):
    """Calculate the exact mathematical counts of valid flight-to-gate assignments."""
    sim, matrix, _, _ = _get_simulation_context(sim_id, db)
    try:
        result = InclusionExclusionService.calculate(matrix)
        log_activity(
            db=db,
            action_type="CALCULATION_PERFORMED",
            entity_type="Allocation",
            entity_id=sim_id,
            title=f"Math Engine Evaluated for {sim.name}",
            detail=f"Evaluated exact PIE: N = {result['valid_assignments']} valid assignments ({result['feasibility_percentage']}% feasible) from {result['total_possible_assignments']} unrestricted permutations.",
            status="success"
        )
        db.commit()
        return InclusionExclusionResponse(**result)
    except (InvalidMatrixError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(err)
        )


@router.get(
    "/simulations/{sim_id}/allocations",
    response_model=AllocationGenerationResponse,
    summary="Generate valid flight-to-gate allocations with independent conflict validation"
)
def generate_simulation_allocations(
    sim_id: str,
    max_results: int = Query(default=100, ge=1, le=10000, description="Maximum allocations to generate"),
    db: Session = Depends(get_db)
):
    """Generate actual conflict-free flight-to-gate assignments using backtracking,

    independently validated via Phase 17 Conflict Detection Service.
    """
    sim, matrix, flight_ids, gate_ids = _get_simulation_context(sim_id, db)
    try:
        # 1. Generate allocations using Phase 16 Backtracking Engine
        gen_result = AllocationGeneratorService.generate(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            max_results=max_results
        )

        # 2. Independently validate every generated allocation using Phase 17 Conflict Detector
        # Optimized with pre-validated ConflictDetector to avoid redundant matrix re-validation
        detector = ConflictDetectionService.create_detector(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids
        )
        validated_allocations = []
        for alloc in gen_result["allocations"]:
            validation_diag = detector.detect_conflicts(alloc["assignments"])
            validated_allocations.append(
                AllocationPlan(
                    allocation_number=alloc["allocation_number"],
                    assignments=alloc["assignments"],
                    validation=ConflictDetectionResponse(**validation_diag)
                )
            )

        log_activity(
            db=db,
            action_type="ALLOCATION_GENERATED",
            entity_type="Allocation",
            entity_id=sim_id,
            title=f"Allocations Generated for {sim.name}",
            detail=f"Generated and validated {gen_result['generated_count']} conflict-free allocations (limit={max_results}, complete={gen_result['generation_complete']}).",
            status="success"
        )
        db.commit()

        return AllocationGenerationResponse(
            matrix_size=gen_result["matrix_size"],
            total_possible_assignments=gen_result["total_possible_assignments"],
            total_valid_assignments=gen_result["total_valid_assignments"],
            generated_count=gen_result["generated_count"],
            max_results=gen_result["max_results"],
            generation_complete=gen_result["generation_complete"],
            has_more=gen_result["has_more"],
            algorithm=gen_result["algorithm"],
            allocations=validated_allocations
        )
    except (AllocationGeneratorError, InvalidMatrixError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(err)
        )


@router.post(
    "/simulations/{sim_id}/validate-allocation",
    response_model=ConflictDetectionResponse,
    summary="Independently validate a specific allocation against simulation constraints"
)
def validate_simulation_allocation(
    sim_id: str,
    payload: Any = Body(...),
    db: Session = Depends(get_db)
):
    """Independently audit an externally supplied allocation against the simulation scenario."""
    _, matrix, flight_ids, gate_ids = _get_simulation_context(sim_id, db)
    try:
        diag = ConflictDetectionService.detect_conflicts(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            allocation=payload
        )
        return ConflictDetectionResponse(**diag)
    except (InvalidMatrixError, ConflictDetectionError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(err)
        )


@router.post(
    "/allocations/validate",
    response_model=ConflictDetectionResponse,
    summary="Independently validate an allocation against an arbitrary restriction matrix"
)
def validate_arbitrary_allocation(payload: AllocationValidationRequest):
    """Independently audit an allocation against any given binary matrix and identifier sets."""
    try:
        diag = ConflictDetectionService.detect_conflicts(
            matrix=payload.matrix,
            flight_ids=payload.flight_ids,
            gate_ids=payload.gate_ids,
            allocation=payload.allocation
        )
        return ConflictDetectionResponse(**diag)
    except (InvalidMatrixError, ConflictDetectionError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(err)
        )
