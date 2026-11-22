"""
GateWise API v1 — Analytics & Mathematical Insights Router (Phase 22).
Provides aggregated and per-simulation mathematical analytics, restriction density comparisons,
Rook polynomial coefficient distributions, and PIE term breakdowns.
"""

import json
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import Flight, Gate, Simulation, RestrictionMatrix
from app.schemas.api_schemas import (
    AnalyticsOverviewResponse,
    SimulationAnalyticsItem,
    FeasibilityExtremum,
    SimulationDetailedAnalyticsResponse,
    RookCoefficientDetail,
    PieTermDetail,
    AllocationAnalyticsSummary
)
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.rook_polynomial_service import validate_restriction_matrix
from app.services.allocation_generator_service import AllocationGeneratorService
from app.services.conflict_detection_service import ConflictDetectionService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Get aggregated database-driven mathematical analytics across all simulations"
)
def get_analytics_overview(db: Session = Depends(get_db)):
    """Evaluate and aggregate mathematical characteristics of all simulation scenarios."""
    flights_count = db.query(Flight).count()
    gates_count = db.query(Gate).count()
    simulations = db.query(Simulation).order_by(Simulation.created_at.desc()).all()

    total_sims = len(simulations)
    valid_count = 0
    incompatible_count = 0
    feasible_count = 0
    infeasible_count = 0

    density_sum = 0.0
    highest_feasibility: Optional[FeasibilityExtremum] = None
    lowest_feasibility: Optional[FeasibilityExtremum] = None

    items: List[SimulationAnalyticsItem] = []

    for sim in simulations:
        f_count = len(sim.selected_flights)
        g_count = len(sim.selected_gates)
        matrix_rec = sim.restriction_matrix

        is_valid_config = False
        val_msg = ""
        matrix_size = None
        forbidden_cnt = 0
        allowed_cnt = 0
        density = 0.0
        tot_possible = 0
        exact_valid = 0
        invalid_assignments = 0
        feasibility_pct = 0.0
        is_feasible = False
        poly_str = None
        coeffs = []
        degree = 0

        if f_count == 0 or g_count == 0:
            val_msg = "Incomplete: No flights or gates selected."
            incompatible_count += 1
        elif f_count != g_count:
            val_msg = f"Unbalanced: {f_count} flights vs {g_count} gates (requires square n x n)."
            incompatible_count += 1
        elif not matrix_rec:
            val_msg = "Incomplete: Restriction matrix not initialized."
            incompatible_count += 1
        else:
            try:
                matrix = json.loads(matrix_rec.matrix_data)
                validate_restriction_matrix(matrix)
                n = len(matrix)
                if n != f_count:
                    val_msg = f"Dimension mismatch: matrix {n}x{n} != flights ({f_count})."
                    incompatible_count += 1
                else:
                    is_valid_config = True
                    matrix_size = n
                    val_msg = f"Valid balanced configuration ({n} × {n})."
                    valid_count += 1

                    # Compute mathematical derivation via Inclusion-Exclusion Engine
                    pie_res = InclusionExclusionService.calculate(matrix)
                    forbidden_cnt = pie_res["forbidden_cell_count"]
                    allowed_cnt = (n * n) - forbidden_cnt
                    density = round((forbidden_cnt / (n * n) * 100.0), 2) if (n * n) > 0 else 0.0
                    tot_possible = pie_res["total_possible_assignments"]
                    exact_valid = pie_res["valid_assignments"]
                    invalid_assignments = pie_res["invalid_assignments"]
                    feasibility_pct = pie_res["feasibility_percentage"]
                    is_feasible = (exact_valid > 0)
                    poly_str = pie_res["polynomial"]
                    coeffs = pie_res["rook_coefficients"]
                    degree = max([idx for idx, c in enumerate(coeffs) if c > 0] or [0])

                    density_sum += density
                    if is_feasible:
                        feasible_count += 1
                    else:
                        infeasible_count += 1

                    # Track extrema
                    if highest_feasibility is None or feasibility_pct > highest_feasibility.feasibility_percentage:
                        highest_feasibility = FeasibilityExtremum(
                            simulation_id=sim.id,
                            simulation_name=sim.name,
                            matrix_size=n,
                            feasibility_percentage=feasibility_pct,
                            exact_valid_assignments=exact_valid,
                            total_possible_assignments=tot_possible
                        )

                    if lowest_feasibility is None or feasibility_pct < lowest_feasibility.feasibility_percentage:
                        lowest_feasibility = FeasibilityExtremum(
                            simulation_id=sim.id,
                            simulation_name=sim.name,
                            matrix_size=n,
                            feasibility_percentage=feasibility_pct,
                            exact_valid_assignments=exact_valid,
                            total_possible_assignments=tot_possible
                        )
            except Exception as ex:
                val_msg = f"Invalid restriction matrix: {str(ex)}"
                incompatible_count += 1

        items.append(
            SimulationAnalyticsItem(
                id=sim.id,
                name=sim.name,
                matrix_size=matrix_size,
                flight_count=f_count,
                gate_count=g_count,
                is_valid_config=is_valid_config,
                validation_message=val_msg,
                forbidden_count=forbidden_cnt,
                allowed_count=allowed_cnt,
                restriction_density=density,
                total_possible_assignments=tot_possible,
                exact_valid_assignments=exact_valid,
                invalid_assignments=invalid_assignments,
                feasibility_percentage=feasibility_pct,
                is_feasible=is_feasible,
                rook_polynomial=poly_str,
                rook_coefficients=coeffs,
                polynomial_degree=degree
            )
        )

    avg_density = round(density_sum / valid_count, 2) if valid_count > 0 else 0.0

    return AnalyticsOverviewResponse(
        total_simulations=total_sims,
        valid_simulations_count=valid_count,
        incompatible_simulations_count=incompatible_count,
        total_flights=flights_count,
        total_gates=gates_count,
        average_restriction_density=avg_density,
        feasible_simulations_count=feasible_count,
        infeasible_simulations_count=infeasible_count,
        highest_feasibility=highest_feasibility,
        lowest_feasibility=lowest_feasibility,
        simulations=items
    )


@router.get(
    "/simulations/{sim_id}",
    response_model=SimulationDetailedAnalyticsResponse,
    summary="Get deep mathematical and allocation analytics for a specific simulation"
)
def get_simulation_detailed_analytics(
    sim_id: str,
    include_sample: bool = Query(default=False, description="Generate and audit a sample allocation batch"),
    sample_limit: int = Query(default=50, ge=1, le=500, description="Max allocations for sample audit"),
    db: Session = Depends(get_db)
):
    """Retrieve detailed Rook polynomial, PIE derivations, and allocation telemetry for a simulation."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario '{sim_id}' not found."
        )

    f_count = len(sim.selected_flights)
    g_count = len(sim.selected_gates)

    if f_count == 0 or g_count == 0 or f_count != g_count:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Simulation '{sim_id}' is unbalanced ({f_count} flights vs {g_count} gates). Requires square n x n."
        )

    matrix_rec = sim.restriction_matrix
    if not matrix_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Restriction matrix for simulation '{sim_id}' not found."
        )

    matrix = json.loads(matrix_rec.matrix_data)
    n = validate_restriction_matrix(matrix)
    if n != f_count:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Matrix dimension ({n}) does not match flight count ({f_count})."
        )

    # 1. Evaluate exact PIE and Rook Polynomial
    pie_res = InclusionExclusionService.calculate(matrix)
    forbidden_cnt = pie_res["forbidden_cell_count"]
    allowed_cnt = (n * n) - forbidden_cnt
    density = round((forbidden_cnt / (n * n) * 100.0), 2) if (n * n) > 0 else 0.0
    coeffs = pie_res["rook_coefficients"]
    degree = max([idx for idx, c in enumerate(coeffs) if c > 0] or [0])

    # 2. Build detailed coefficient interpretations
    coeffs_detail: List[RookCoefficientDetail] = []
    for k, val in enumerate(coeffs):
        if k == 0:
            meaning = f"r₀ = 1: Unconstrained base state (0 non-attacking rooks on forbidden cells)."
        elif k == 1:
            meaning = f"r₁ = {val}: Exactly {val} individual forbidden flight-to-gate restriction pairings on the {n}×{n} board."
        else:
            meaning = (
                f"r_{k} = {val}: Exactly {val} ways to place {k} non-attacking rooks on forbidden cells "
                f"(simultaneous constraint violations across different flights and gates)."
            )
        coeffs_detail.append(
            RookCoefficientDetail(
                k=k,
                coefficient=val,
                meaning=meaning
            )
        )

    # 3. Build itemized PIE terms
    pie_terms_detail: List[PieTermDetail] = []
    pos_sum = 0
    neg_sum = 0

    for term in pie_res["inclusion_exclusion_terms"]:
        k = term["k"]
        rk = term["rook_coefficient"]
        fac = term["factorial_value"]
        sign = term["sign"]
        contrib = term["contribution"]
        is_pos = (sign > 0)

        if is_pos:
            pos_sum += contrib
        else:
            neg_sum += abs(contrib)

        pie_terms_detail.append(
            PieTermDetail(
                k=k,
                rook_coefficient=rk,
                factorial_value=fac,
                sign=sign,
                contribution=contrib,
                is_positive=is_pos
            )
        )

    # 4. Optional Allocation Sample Audit
    alloc_summary: Optional[AllocationAnalyticsSummary] = None
    if include_sample:
        flight_ids = [sf.flight_id for sf in sim.selected_flights]
        gate_ids = [sg.gate_id for sg in sim.selected_gates]
        gen_res = AllocationGeneratorService.generate(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            max_results=sample_limit,
            pie_result=pie_res
        )

        detector = ConflictDetectionService.create_detector(matrix, flight_ids, gate_ids)
        valid_cnt = 0
        invalid_cnt = 0
        for a in gen_res["allocations"]:
            diag = detector.detect_conflicts(a["assignments"])
            if diag["is_valid"]:
                valid_cnt += 1
            else:
                invalid_cnt += 1

        alloc_summary = AllocationAnalyticsSummary(
            generated_count=gen_res["generated_count"],
            max_requested=sample_limit,
            independently_validated=len(gen_res["allocations"]),
            valid_count=valid_cnt,
            invalid_count=invalid_cnt,
            generation_complete=gen_res["generation_complete"],
            algorithm=gen_res["algorithm"]
        )

    return SimulationDetailedAnalyticsResponse(
        simulation_id=sim.id,
        simulation_name=sim.name,
        matrix_size=n,
        flight_count=f_count,
        gate_count=g_count,
        forbidden_count=forbidden_cnt,
        allowed_count=allowed_cnt,
        restriction_density=density,
        total_possible_assignments=pie_res["total_possible_assignments"],
        exact_valid_assignments=pie_res["valid_assignments"],
        invalid_assignments=pie_res["invalid_assignments"],
        feasibility_percentage=pie_res["feasibility_percentage"],
        is_feasible=(pie_res["valid_assignments"] > 0),
        rook_polynomial=pie_res["polynomial"],
        polynomial_degree=degree,
        coefficients_detail=coeffs_detail,
        pie_terms_detail=pie_terms_detail,
        positive_contributions_sum=pos_sum,
        negative_contributions_sum=neg_sum,
        allocation_analytics=alloc_summary
    )
