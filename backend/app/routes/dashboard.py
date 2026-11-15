"""
GateWise API v1 — Dashboard Router.
Consolidates real operational telemetry, simulation overviews, mathematical summaries,
and genuine activity history into an authoritative dashboard dataset.
"""

import json
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import Flight, Gate, Simulation, RestrictionMatrix, ActivityLog
from app.schemas.api_schemas import (
    DashboardSummaryResponse,
    FlightStats,
    GateStats,
    SimulationStats,
    SimulationOverviewItem,
    MathematicalSummary,
    ActivityLogItem
)
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.rook_polynomial_service import validate_restriction_matrix, InvalidMatrixError

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Get unified live dashboard operational summary"
)
def get_dashboard_summary(
    simulation_id: Optional[str] = Query(default=None, description="Optional target simulation ID for mathematical summary"),
    db: Session = Depends(get_db)
):
    """Retrieve live statistics for flights, gates, simulations, math calculations, and activity history."""
    # 1. Flight Statistics
    flights = db.query(Flight).all()
    total_flights = len(flights)
    flight_status_map = {}
    for f in flights:
        st = f.status.strip().title() if f.status else "Scheduled"
        flight_status_map[st] = flight_status_map.get(st, 0) + 1

    flight_stats = FlightStats(
        total=total_flights,
        by_status=flight_status_map,
        scheduled=flight_status_map.get("Scheduled", 0),
        boarding=flight_status_map.get("Boarding", 0),
        delayed=flight_status_map.get("Delayed", 0),
        arrived=flight_status_map.get("Arrived", 0)
    )

    # 2. Gate Statistics
    gates = db.query(Gate).all()
    total_gates = len(gates)
    gate_status_map = {}
    for g in gates:
        gst = g.status.strip().title() if g.status else "Available"
        gate_status_map[gst] = gate_status_map.get(gst, 0) + 1

    gate_stats = GateStats(
        total=total_gates,
        by_status=gate_status_map,
        available=gate_status_map.get("Available", 0),
        occupied=gate_status_map.get("Occupied", 0),
        maintenance=gate_status_map.get("Maintenance", 0) + gate_status_map.get("Unavailable", 0)
    )

    # 3. Simulation Statistics & Overviews
    simulations = db.query(Simulation).order_by(Simulation.updated_at.desc()).all()
    total_sims = len(simulations)
    valid_count = 0
    invalid_count = 0
    sim_overview_items: List[SimulationOverviewItem] = []

    sim_matrices_map = {}
    for sim in simulations:
        f_count = len(sim.selected_flights)
        g_count = len(sim.selected_gates)
        matrix_rec = sim.restriction_matrix

        is_valid = False
        val_msg = ""
        matrix_status = "Not Initialized"
        matrix_data_parsed = None

        if f_count == 0 or g_count == 0:
            val_msg = "Incomplete: No flights or gates selected."
        elif f_count != g_count:
            val_msg = f"Unbalanced: {f_count} flights vs {g_count} gates (requires square n x n)."
        elif not matrix_rec:
            val_msg = "Incomplete: Restriction matrix not initialized."
        else:
            try:
                matrix_data_parsed = json.loads(matrix_rec.matrix_data)
                validate_restriction_matrix(matrix_data_parsed)
                if len(matrix_data_parsed) != f_count:
                    val_msg = f"Dimension mismatch: matrix is {len(matrix_data_parsed)}x{len(matrix_data_parsed)}, but scenario has {f_count} flights."
                else:
                    is_valid = True
                    val_msg = f"Valid balanced configuration ({f_count} × {g_count})."
                    forbidden_cnt = sum(cell == 1 for row in matrix_data_parsed for cell in row)
                    matrix_status = f"{f_count} × {g_count} ({forbidden_cnt} restricted)"
                    sim_matrices_map[sim.id] = (matrix_data_parsed, forbidden_cnt)
            except Exception as ex:
                val_msg = f"Invalid restriction matrix: {str(ex)}"

        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        sim_overview_items.append(
            SimulationOverviewItem(
                id=sim.id,
                name=sim.name,
                description=sim.description,
                flight_count=f_count,
                gate_count=g_count,
                matrix_status=matrix_status,
                is_valid=is_valid,
                validation_message=val_msg,
                created_at=sim.created_at,
                updated_at=sim.updated_at
            )
        )

    most_recent_sim = simulations[0] if simulations else None

    simulation_stats = SimulationStats(
        total=total_sims,
        valid_count=valid_count,
        invalid_count=invalid_count,
        most_recent_id=most_recent_sim.id if most_recent_sim else None,
        most_recent_name=most_recent_sim.name if most_recent_sim else None,
        most_recent_updated_at=most_recent_sim.updated_at if most_recent_sim else None,
        simulations=sim_overview_items
    )

    # 4. Mathematical Summary for Target Simulation
    target_sim = None
    if simulation_id:
        target_sim = next((s for s in simulations if s.id == simulation_id), None)
        if not target_sim:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Simulation scenario '{simulation_id}' not found."
            )
    else:
        # Default to first valid simulation, or first simulation
        target_sim = next((s for s in simulations if s.id in sim_matrices_map), None)
        if not target_sim and simulations:
            target_sim = simulations[0]

    math_summary: Optional[MathematicalSummary] = None
    if target_sim and target_sim.id in sim_matrices_map:
        matrix, forbidden_cnt = sim_matrices_map[target_sim.id]
        n = len(matrix)
        try:
            pie_res = InclusionExclusionService.calculate(matrix)
            total_cells = n * n
            density = round((forbidden_cnt / total_cells * 100.0), 2) if total_cells > 0 else 0.0
            math_summary = MathematicalSummary(
                simulation_id=target_sim.id,
                simulation_name=target_sim.name,
                matrix_size=n,
                total_possible_assignments=pie_res["total_possible_assignments"],
                exact_valid_assignments=pie_res["valid_assignments"],
                forbidden_assignment_count=forbidden_cnt,
                restriction_density=density,
                feasibility_percentage=pie_res["feasibility_percentage"],
                rook_polynomial=pie_res["polynomial"],
                rook_coefficients=pie_res["rook_coefficients"]
            )
        except Exception:
            math_summary = None

    # 5. Recent Activity Logs
    recent_logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(15).all()
    activity_items = [ActivityLogItem.model_validate(l) for l in recent_logs]

    return DashboardSummaryResponse(
        flights=flight_stats,
        gates=gate_stats,
        simulations=simulation_stats,
        mathematical_summary=math_summary,
        recent_activities=activity_items
    )


@router.get(
    "/activities",
    response_model=List[ActivityLogItem],
    summary="Get recent activity logs"
)
def get_recent_activities(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve chronological operational activity logs."""
    logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
    return [ActivityLogItem.model_validate(l) for l in logs]
