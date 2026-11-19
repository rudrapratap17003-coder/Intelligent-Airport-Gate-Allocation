"""
GateWise API v1 — Restrictions Router.
Persist and retrieve binary restriction matrix for a simulation scenario.
"""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import Simulation, RestrictionMatrix
from app.schemas.api_schemas import RestrictionUpdate, RestrictionResponse
from app.services.activity_service import log_activity

router = APIRouter(tags=["Restrictions"])


@router.get("/simulations/{sim_id}/restrictions", response_model=RestrictionResponse, summary="Get restriction matrix for scenario")
@router.get("/restrictions/{sim_id}", response_model=RestrictionResponse, summary="Get restriction matrix for scenario (alias)")
def get_restrictions(sim_id: str, db: Session = Depends(get_db)):
    """Retrieve the binary restriction matrix for a simulation scenario."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario with ID {sim_id} not found."
        )

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        # Default initialize matrix from linked counts
        f_ids = [link.flight_id for link in sim.selected_flights]
        g_ids = [link.gate_id for link in sim.selected_gates]
        f_count = len(f_ids)
        g_count = len(g_ids)
        default_matrix = [[0 for _ in range(g_count)] for _ in range(f_count)]
        now = datetime.now(timezone.utc)
        matrix_record = RestrictionMatrix(
            simulation_id=sim_id,
            rows_count=f_count,
            cols_count=g_count,
            matrix_data=json.dumps(default_matrix),
            row_flight_ids=json.dumps(f_ids) if f_ids else None,
            column_gate_ids=json.dumps(g_ids) if g_ids else None,
            created_at=now,
            updated_at=now
        )
        db.add(matrix_record)
        db.commit()
        db.refresh(matrix_record)

    parsed_row_ids = json.loads(matrix_record.row_flight_ids) if matrix_record.row_flight_ids else None
    parsed_col_ids = json.loads(matrix_record.column_gate_ids) if matrix_record.column_gate_ids else None

    # Backward compatibility: if record in DB predated row_flight_ids / column_gate_ids,
    # fall back to simulation's selected flights/gates if lengths match
    if parsed_row_ids is None and sim.selected_flights and len(sim.selected_flights) == matrix_record.rows_count:
        parsed_row_ids = [link.flight_id for link in sim.selected_flights]
    if parsed_col_ids is None and sim.selected_gates and len(sim.selected_gates) == matrix_record.cols_count:
        parsed_col_ids = [link.gate_id for link in sim.selected_gates]

    return RestrictionResponse(
        simulation_id=sim_id,
        rows_count=matrix_record.rows_count,
        cols_count=matrix_record.cols_count,
        matrix=json.loads(matrix_record.matrix_data),
        row_flight_ids=parsed_row_ids,
        column_gate_ids=parsed_col_ids,
        rowFlightIds=parsed_row_ids,
        columnGateIds=parsed_col_ids,
        updated_at=matrix_record.updated_at
    )


@router.put("/simulations/{sim_id}/restrictions", response_model=RestrictionResponse, summary="Update restriction matrix for scenario")
@router.put("/restrictions/{sim_id}", response_model=RestrictionResponse, summary="Update restriction matrix for scenario (alias)")
def update_restrictions(sim_id: str, payload: RestrictionUpdate, db: Session = Depends(get_db)):
    """Update and persist the binary restriction matrix for a simulation scenario."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario with ID {sim_id} not found."
        )

    matrix_data = payload.matrix
    rows_count = len(matrix_data)
    cols_count = len(matrix_data[0]) if rows_count > 0 else 0

    # Ensure all cells are 0 or 1
    for r in range(rows_count):
        for c in range(len(matrix_data[r])):
            if matrix_data[r][c] not in (0, 1):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Cell at ({r}, {c}) must be binary 0 or 1. Received: {matrix_data[r][c]}"
                )

    row_f_ids = payload.rowFlightIds if payload.rowFlightIds is not None else payload.row_flight_ids
    col_g_ids = payload.columnGateIds if payload.columnGateIds is not None else payload.column_gate_ids

    # Validate row_flight_ids and column_gate_ids lengths if provided
    if row_f_ids is not None and len(row_f_ids) != rows_count:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"rowFlightIds length ({len(row_f_ids)}) must match matrix rows count ({rows_count})."
        )
    if col_g_ids is not None and len(col_g_ids) != cols_count:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"columnGateIds length ({len(col_g_ids)}) must match matrix columns count ({cols_count})."
        )

    now = datetime.now(timezone.utc)
    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()

    if matrix_record:
        matrix_record.rows_count = rows_count
        matrix_record.cols_count = cols_count
        matrix_record.matrix_data = json.dumps(matrix_data)
        if row_f_ids is not None:
            matrix_record.row_flight_ids = json.dumps(row_f_ids)
        if col_g_ids is not None:
            matrix_record.column_gate_ids = json.dumps(col_g_ids)
        matrix_record.updated_at = now
    else:
        matrix_record = RestrictionMatrix(
            simulation_id=sim_id,
            rows_count=rows_count,
            cols_count=cols_count,
            matrix_data=json.dumps(matrix_data),
            row_flight_ids=json.dumps(row_f_ids) if row_f_ids is not None else None,
            column_gate_ids=json.dumps(col_g_ids) if col_g_ids is not None else None,
            created_at=now,
            updated_at=now
        )
        db.add(matrix_record)

    forbidden_cnt = sum(c == 1 for row in matrix_data for c in row)
    log_activity(
        db=db,
        action_type="RESTRICTION_UPDATED",
        entity_type="RestrictionMatrix",
        entity_id=sim_id,
        title=f"Restriction Board Updated: {sim.name}",
        detail=f"Configured {rows_count} × {cols_count} matrix with {forbidden_cnt} forbidden cells for scenario {sim_id}.",
        status="warning"
    )

    db.commit()
    db.refresh(matrix_record)

    parsed_row_ids = json.loads(matrix_record.row_flight_ids) if matrix_record.row_flight_ids else None
    parsed_col_ids = json.loads(matrix_record.column_gate_ids) if matrix_record.column_gate_ids else None

    # Fall back to payload values if present
    if parsed_row_ids is None and row_f_ids:
        parsed_row_ids = row_f_ids
    if parsed_col_ids is None and col_g_ids:
        parsed_col_ids = col_g_ids

    return RestrictionResponse(
        simulation_id=sim_id,
        rows_count=matrix_record.rows_count,
        cols_count=matrix_record.cols_count,
        matrix=json.loads(matrix_record.matrix_data),
        row_flight_ids=parsed_row_ids,
        column_gate_ids=parsed_col_ids,
        rowFlightIds=parsed_row_ids,
        columnGateIds=parsed_col_ids,
        updated_at=matrix_record.updated_at
    )
