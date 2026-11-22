"""
GateWise API v1 — Simulations Router.
Full CRUD, duplication, traffic generation, simulation pipeline, What-If analysis,
and relationship management with SQLite / SQLAlchemy persistence.
"""

import time
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import (
    Simulation,
    SimulationFlight,
    SimulationGate,
    Flight,
    Gate,
    RestrictionMatrix,
    SimulationRun
)
from app.schemas.api_schemas import (
    SimulationCreate,
    SimulationUpdate,
    SimulationResponse,
    SimulationRunResponse,
    TrafficScenarioGenerateRequest,
    WhatIfRequest,
    WhatIfResponse,
    BottleneckAnalysisResponse
)
from app.services.activity_service import log_activity
from app.services.traffic_generator_service import TrafficGeneratorService
from app.services.simulation_pipeline_service import SimulationPipelineService
from app.services.what_if_service import WhatIfService
from app.services.bottleneck_analysis_service import BottleneckAnalysisService

router = APIRouter(prefix="/simulations", tags=["Simulations"])


def _format_simulation_response(sim: Simulation) -> SimulationResponse:
    """Format ORM Simulation entity into Pydantic SimulationResponse."""
    return SimulationResponse(
        id=sim.id,
        name=sim.name,
        description=sim.description,
        category=getattr(sim, "category", "Normal Operations") or "Normal Operations",
        date=getattr(sim, "date", None),
        time_window=getattr(sim, "time_window", None),
        created_at=sim.created_at,
        updated_at=sim.updated_at,
        status=sim.status,
        selected_flight_ids=[link.flight_id for link in sim.selected_flights],
        selected_gate_ids=[link.gate_id for link in sim.selected_gates]
    )


def _format_run_response(run: SimulationRun) -> SimulationRunResponse:
    """Format ORM SimulationRun into Pydantic response."""
    return SimulationRunResponse(
        id=run.id,
        simulation_id=run.simulation_id,
        run_number=run.run_number,
        status=run.status,
        created_at=run.created_at,
        duration_ms=run.duration_ms,
        matrix_rows=run.matrix_rows,
        matrix_cols=run.matrix_cols,
        forbidden_cell_count=run.forbidden_cell_count,
        rook_coefficients=json.loads(run.rook_coefficients) if run.rook_coefficients else [1],
        rook_polynomial=run.rook_polynomial,
        pie_valid_allocations=run.pie_valid_allocations,
        pie_total_possible=run.pie_total_possible,
        feasibility_percentage=run.feasibility_percentage,
        generated_allocations_count=run.generated_allocations_count,
        verification_status=run.verification_status,
        matrix_snapshot=json.loads(run.matrix_snapshot_json) if run.matrix_snapshot_json else None,
        allocations_sample=json.loads(run.allocations_json) if run.allocations_json else None,
        notes=run.notes
    )


@router.get("", response_model=List[SimulationResponse], summary="List all simulations")
def list_simulations(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Return all simulation scenarios, optionally filtered by category."""
    query = db.query(Simulation)
    if category:
        query = query.filter(Simulation.category == category)
    sims = query.order_by(Simulation.created_at.desc()).all()
    return [_format_simulation_response(s) for s in sims]


@router.get("/{sim_id}", response_model=SimulationResponse, summary="Get simulation by ID")
def get_simulation(sim_id: str, db: Session = Depends(get_db)):
    """Return a single simulation scenario."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario with ID {sim_id} not found."
        )
    return _format_simulation_response(sim)


@router.post("", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED, summary="Create new simulation")
def create_simulation(payload: SimulationCreate, db: Session = Depends(get_db)):
    """Create a new simulation scenario with linked flights, gates, and an initial zero matrix."""
    clean_name = payload.name.strip()

    # Name uniqueness check
    if db.query(Simulation).filter(Simulation.name == clean_name).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A simulation named '{clean_name}' already exists."
        )

    sim_id = payload.id or f"SIM-{str(int(time.time() * 1000))[-4:]}"
    now = datetime.now(timezone.utc)

    # Validate that selected flights exist
    flight_ids = list(set(payload.selected_flight_ids))
    gate_ids = list(set(payload.selected_gate_ids))

    if not flight_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="At least one flight must be selected.")
    if not gate_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="At least one gate must be selected.")

    # Check non-existent flights
    found_flights = db.query(Flight.id).filter(Flight.id.in_(flight_ids)).all()
    found_f_set = {f[0] for f in found_flights}
    missing_f = set(flight_ids) - found_f_set
    if missing_f:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Flight IDs do not exist: {list(missing_f)}")

    # Check non-existent gates
    found_gates = db.query(Gate.id).filter(Gate.id.in_(gate_ids)).all()
    found_g_set = {g[0] for g in found_gates}
    missing_g = set(gate_ids) - found_g_set
    if missing_g:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Gate IDs do not exist: {list(missing_g)}")

    sim = Simulation(
        id=sim_id,
        name=clean_name,
        description=payload.description,
        category=payload.category or "Normal Operations",
        date=payload.date,
        time_window=payload.time_window,
        status="Ready" if len(flight_ids) == len(gate_ids) else "Draft",
        created_at=now,
        updated_at=now
    )
    db.add(sim)
    db.flush()

    for f_id in flight_ids:
        db.add(SimulationFlight(simulation_id=sim.id, flight_id=f_id))

    for g_id in gate_ids:
        db.add(SimulationGate(simulation_id=sim.id, gate_id=g_id))

    # Initialize zero restriction matrix
    default_matrix = [[0 for _ in range(len(gate_ids))] for _ in range(len(flight_ids))]
    db.add(RestrictionMatrix(
        simulation_id=sim.id,
        rows_count=len(flight_ids),
        cols_count=len(gate_ids),
        matrix_data=json.dumps(default_matrix),
        row_flight_ids=json.dumps(flight_ids) if flight_ids else None,
        column_gate_ids=json.dumps(gate_ids) if gate_ids else None,
        created_at=now,
        updated_at=now
    ))

    log_activity(
        db=db,
        action_type="SIMULATION_CREATED",
        entity_type="Simulation",
        entity_id=sim.id,
        title=f"Simulation '{clean_name}' Created",
        detail=f"Created scenario {sim.id} with {len(flight_ids)} flights and {len(gate_ids)} gates.",
        status="info"
    )

    db.commit()
    db.refresh(sim)
    return _format_simulation_response(sim)


@router.put("/{sim_id}", response_model=SimulationResponse, summary="Update simulation")
def update_simulation(sim_id: str, payload: SimulationUpdate, db: Session = Depends(get_db)):
    """Update simulation metadata and linked entities."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario with ID {sim_id} not found."
        )

    if payload.name:
        clean_name = payload.name.strip()
        conflict = db.query(Simulation).filter(Simulation.id != sim_id, Simulation.name == clean_name).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another simulation named '{clean_name}' already exists."
            )
        sim.name = clean_name

    if payload.description is not None:
        sim.description = payload.description

    if payload.category is not None:
        sim.category = payload.category

    if payload.date is not None:
        sim.date = payload.date

    if payload.time_window is not None:
        sim.time_window = payload.time_window

    now = datetime.now(timezone.utc)
    sim.updated_at = now

    # Update flights if provided
    if payload.selected_flight_ids is not None:
        flight_ids = list(set(payload.selected_flight_ids))
        if not flight_ids:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="At least one flight must be selected.")
        db.query(SimulationFlight).filter(SimulationFlight.simulation_id == sim_id).delete()
        for f_id in flight_ids:
            db.add(SimulationFlight(simulation_id=sim_id, flight_id=f_id))

    # Update gates if provided
    if payload.selected_gate_ids is not None:
        gate_ids = list(set(payload.selected_gate_ids))
        if not gate_ids:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="At least one gate must be selected.")
        db.query(SimulationGate).filter(SimulationGate.simulation_id == sim_id).delete()
        for g_id in gate_ids:
            db.add(SimulationGate(simulation_id=sim_id, gate_id=g_id))

    if payload.status:
        sim.status = payload.status
    else:
        # Recompute status based on dimensions
        cur_f = db.query(SimulationFlight).filter(SimulationFlight.simulation_id == sim_id).count()
        cur_g = db.query(SimulationGate).filter(SimulationGate.simulation_id == sim_id).count()
        sim.status = "Ready" if cur_f == cur_g else "Draft"

    log_activity(
        db=db,
        action_type="SIMULATION_UPDATED",
        entity_type="Simulation",
        entity_id=sim.id,
        title=f"Simulation '{sim.name}' Updated",
        detail=f"Modified simulation parameters and configuration for {sim.id}.",
        status="info"
    )

    db.commit()
    db.refresh(sim)
    return _format_simulation_response(sim)


@router.post("/{sim_id}/duplicate", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED, summary="Duplicate simulation")
def duplicate_simulation(sim_id: str, db: Session = Depends(get_db)):
    """Clone an existing simulation scenario, its flight/gate linkages, and its restriction matrix."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario with ID {sim_id} not found."
        )

    # Determine unique copy name
    copy_idx = 1
    candidate_name = f"{sim.name} (Copy)"
    while db.query(Simulation).filter(Simulation.name == candidate_name).first():
        copy_idx += 1
        candidate_name = f"{sim.name} (Copy {copy_idx})"

    dup_id = f"SIM-{str(int(time.time() * 1000))[-4:]}"
    now = datetime.now(timezone.utc)

    new_sim = Simulation(
        id=dup_id,
        name=candidate_name,
        description=sim.description,
        category=sim.category,
        date=sim.date,
        time_window=sim.time_window,
        status=sim.status,
        created_at=now,
        updated_at=now
    )
    db.add(new_sim)
    db.flush()

    for sf in sim.selected_flights:
        db.add(SimulationFlight(simulation_id=new_sim.id, flight_id=sf.flight_id))

    for sg in sim.selected_gates:
        db.add(SimulationGate(simulation_id=new_sim.id, gate_id=sg.gate_id))

    # Clone restriction matrix if exists
    if sim.restriction_matrix:
        db.add(RestrictionMatrix(
            simulation_id=new_sim.id,
            rows_count=sim.restriction_matrix.rows_count,
            cols_count=sim.restriction_matrix.cols_count,
            matrix_data=sim.restriction_matrix.matrix_data,
            row_flight_ids=sim.restriction_matrix.row_flight_ids,
            column_gate_ids=sim.restriction_matrix.column_gate_ids,
            created_at=now,
            updated_at=now
        ))

    log_activity(
        db=db,
        action_type="SIMULATION_CREATED",
        entity_type="Simulation",
        entity_id=new_sim.id,
        title=f"Simulation Cloned: '{candidate_name}'",
        detail=f"Duplicated from {sim_id} with {len(sim.selected_flights)} flights and {len(sim.selected_gates)} gates.",
        status="info"
    )

    db.commit()
    db.refresh(new_sim)
    return _format_simulation_response(new_sim)


@router.delete("/{sim_id}", status_code=status.HTTP_200_OK, summary="Delete simulation")
def delete_simulation(sim_id: str, db: Session = Depends(get_db)):
    """Delete a simulation scenario and cascade delete its link records and restriction matrix."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario with ID {sim_id} not found."
        )

    sim_name = sim.name
    log_activity(
        db=db,
        action_type="SIMULATION_DELETED",
        entity_type="Simulation",
        entity_id=sim_id,
        title=f"Simulation '{sim_name}' Deleted",
        detail=f"Removed simulation scenario {sim_id} and associated restriction matrix.",
        status="warning"
    )

    db.delete(sim)
    db.commit()
    return {"success": True, "message": f"Simulation {sim.name} deleted successfully."}


@router.post("/generate-traffic", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED, summary="Generate realistic traffic scenario")
def generate_traffic_scenario(payload: TrafficScenarioGenerateRequest, db: Session = Depends(get_db)):
    """Generate a reproducible simulated flight/gate scenario with physical airport constraints."""
    clean_name = payload.scenario_name.strip()
    if db.query(Simulation).filter(Simulation.name == clean_name).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A simulation named '{clean_name}' already exists."
        )

    try:
        sim = TrafficGeneratorService.generate_scenario(
            db=db,
            scenario_name=clean_name,
            category=payload.category,
            profile=payload.profile,
            flight_count=payload.flight_count or 6,
            gate_count=payload.gate_count or 6,
            target_terminal=payload.target_terminal or "ALL",
            density=payload.density or "moderate"
        )
        return _format_simulation_response(sim)
    except Exception as err:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(err))


@router.post("/{sim_id}/run", summary="Execute unified mathematical simulation pipeline")
def run_simulation(
    sim_id: str,
    max_allocations: int = Query(default=100, ge=1, le=10000),
    notes: Optional[str] = Body(default=None, embed=True),
    db: Session = Depends(get_db)
):
    """Execute the full 10-step simulation pipeline and save an immutable SimulationRun snapshot."""
    try:
        result = SimulationPipelineService.execute_simulation(
            db=db,
            simulation_id=sim_id,
            max_allocations=max_allocations,
            notes=notes
        )
        return result
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(err))
    except Exception as err:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))


@router.get("/{sim_id}/runs", response_model=List[SimulationRunResponse], summary="List execution history runs for a simulation")
def list_simulation_runs(sim_id: str, db: Session = Depends(get_db)):
    """Return all historical execution run snapshots for this scenario."""
    runs = db.query(SimulationRun).filter(SimulationRun.simulation_id == sim_id).order_by(SimulationRun.created_at.desc()).all()
    return [_format_run_response(r) for r in runs]


@router.get("/runs/{run_id}", response_model=SimulationRunResponse, summary="Get simulation run snapshot by ID")
def get_simulation_run(run_id: str, db: Session = Depends(get_db)):
    """Retrieve an immutable execution snapshot by ID."""
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Simulation run {run_id} not found.")
    return _format_run_response(run)


@router.post("/{sim_id}/what-if", response_model=WhatIfResponse, summary="Evaluate hypothetical scenario changes")
def evaluate_what_if(sim_id: str, payload: WhatIfRequest, db: Session = Depends(get_db)):
    """Evaluate hypothetical operational changes in isolation without mutating persistent database state."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Simulation scenario {sim_id} not found.")

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Restriction matrix for simulation {sim_id} not found.")

    baseline_matrix = json.loads(matrix_record.matrix_data)
    flight_ids = [sf.flight_id for sf in sim.selected_flights]
    gate_ids = [sg.gate_id for sg in sim.selected_gates]

    try:
        return WhatIfService.evaluate(
            baseline_matrix=baseline_matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            disabled_gate_ids=payload.disabled_gate_ids,
            additional_restrictions=payload.additional_restrictions,
            modified_matrix=payload.modified_matrix,
            simulation_id=sim.id,
            simulation_name=sim.name
        )
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(err))


@router.get("/{sim_id}/bottlenecks", response_model=BottleneckAnalysisResponse, summary="Analyze allocation bottlenecks")
def analyze_bottlenecks(sim_id: str, db: Session = Depends(get_db)):
    """Analyze row-and-column restrictions for flight bottlenecks and gate contention."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Simulation scenario {sim_id} not found.")

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Restriction matrix for simulation {sim_id} not found.")

    matrix = json.loads(matrix_record.matrix_data)
    flights = [sf.flight for sf in sim.selected_flights]
    gates = [sg.gate for sg in sim.selected_gates]
    flight_ids = [f.id for f in flights]
    gate_ids = [g.id for g in gates]

    flights_map = {f.id: f for f in flights}
    gates_map = {g.id: g for g in gates}

    try:
        return BottleneckAnalysisService.analyze(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            flights_meta=flights_map,
            gates_meta=gates_map,
            simulation_id=sim.id
        )
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(err))

