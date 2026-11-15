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
        f_count = len(sim.selected_flights)
        g_count = len(sim.selected_gates)
        default_matrix = [[0 for _ in range(g_count)] for _ in range(f_count)]
        now = datetime.now(timezone.utc)
        matrix_record = RestrictionMatrix(
            simulation_id=sim_id,
            rows_count=f_count,
            cols_count=g_count,
            matrix_data=json.dumps(default_matrix),
            created_at=now,
            updated_at=now
        )
        db.add(matrix_record)
        db.commit()
        db.refresh(matrix_record)

    return RestrictionResponse(
        simulation_id=sim_id,
        rows_count=matrix_record.rows_count,
        cols_count=matrix_record.cols_count,
        matrix=json.loads(matrix_record.matrix_data),
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

    now = datetime.now(timezone.utc)
    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()

    if matrix_record:
        matrix_record.rows_count = rows_count
        matrix_record.cols_count = cols_count
        matrix_record.matrix_data = json.dumps(matrix_data)
        matrix_record.updated_at = now
    else:
        matrix_record = RestrictionMatrix(
            simulation_id=sim_id,
            rows_count=rows_count,
            cols_count=cols_count,
            matrix_data=json.dumps(matrix_data),
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

    return RestrictionResponse(
        simulation_id=sim_id,
        rows_count=matrix_record.rows_count,
        cols_count=matrix_record.cols_count,
        matrix=json.loads(matrix_record.matrix_data),
        updated_at=matrix_record.updated_at
    )
