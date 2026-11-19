"""
GateWise API v1 — Simulations Router.
Full CRUD, duplication, and relationship management with SQLite / SQLAlchemy persistence.
"""

import time
import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import (
    Simulation,
    SimulationFlight,
    SimulationGate,
    Flight,
    Gate,
    RestrictionMatrix
)
from app.schemas.api_schemas import (
    SimulationCreate,
    SimulationUpdate,
    SimulationResponse
)
from app.services.activity_service import log_activity

router = APIRouter(prefix="/simulations", tags=["Simulations"])


def _format_simulation_response(sim: Simulation) -> SimulationResponse:
    """Format ORM Simulation entity into Pydantic SimulationResponse."""
    return SimulationResponse(
        id=sim.id,
        name=sim.name,
        description=sim.description,
        created_at=sim.created_at,
        updated_at=sim.updated_at,
        status=sim.status,
        selected_flight_ids=[link.flight_id for link in sim.selected_flights],
        selected_gate_ids=[link.gate_id for link in sim.selected_gates]
    )


@router.get("", response_model=List[SimulationResponse], summary="List all simulations")
def list_simulations(db: Session = Depends(get_db)):
    """Return all simulation scenarios."""
    sims = db.query(Simulation).order_by(Simulation.created_at.desc()).all()
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
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one flight must be selected.")
    if not gate_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one gate must be selected.")

    # Check non-existent flights
    found_flights = db.query(Flight.id).filter(Flight.id.in_(flight_ids)).all()
    found_f_set = {f[0] for f in found_flights}
    missing_f = set(flight_ids) - found_f_set
    if missing_f:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Flight IDs do not exist: {list(missing_f)}")

    # Check non-existent gates
    found_gates = db.query(Gate.id).filter(Gate.id.in_(gate_ids)).all()
    found_g_set = {g[0] for g in found_gates}
    missing_g = set(gate_ids) - found_g_set
    if missing_g:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Gate IDs do not exist: {list(missing_g)}")

    sim = Simulation(
        id=sim_id,
        name=clean_name,
        description=payload.description,
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

    now = datetime.now(timezone.utc)
    sim.updated_at = now

    # Update flights if provided
    if payload.selected_flight_ids is not None:
        flight_ids = list(set(payload.selected_flight_ids))
        if not flight_ids:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one flight must be selected.")
        db.query(SimulationFlight).filter(SimulationFlight.simulation_id == sim_id).delete()
        for f_id in flight_ids:
            db.add(SimulationFlight(simulation_id=sim_id, flight_id=f_id))

    # Update gates if provided
    if payload.selected_gate_ids is not None:
        gate_ids = list(set(payload.selected_gate_ids))
        if not gate_ids:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one gate must be selected.")
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
