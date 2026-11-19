"""
GateWise API v1 — Gates Router.
Full CRUD operations with SQLite / SQLAlchemy persistence.
"""

import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import Gate, SimulationGate
from app.schemas.api_schemas import GateCreate, GateUpdate, GateResponse
from app.services.activity_service import log_activity

router = APIRouter(prefix="/gates", tags=["Gates"])


@router.get("", response_model=List[GateResponse], summary="List all airport gates")
def list_gates(db: Session = Depends(get_db)):
    """Return all airport gates ordered by gate number."""
    return db.query(Gate).order_by(Gate.gate_number).all()


@router.get("/{gate_id}", response_model=GateResponse, summary="Get gate by ID")
def get_gate(gate_id: str, db: Session = Depends(get_db)):
    """Return a single gate by its ID."""
    gate = db.query(Gate).filter(Gate.id == gate_id).first()
    if not gate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate with ID {gate_id} not found."
        )
    return gate


@router.post("", response_model=GateResponse, status_code=status.HTTP_201_CREATED, summary="Create new gate")
def create_gate(payload: GateCreate, db: Session = Depends(get_db)):
    """Register a new airport gate with duplicate prevention."""
    clean_num = payload.gate_number.strip().upper()
    gate_id = payload.id or f"GT-{str(int(time.time() * 1000))[-4:]}"

    # Check duplicate gate number
    existing = db.query(Gate).filter(Gate.gate_number == clean_num).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Gate number {clean_num} already exists in airport registry."
        )

    # Check duplicate ID
    if db.query(Gate).filter(Gate.id == gate_id).first():
        gate_id = f"GT-{str(int(time.time() * 1000))[-6:]}"

    new_gate = Gate(
        id=gate_id,
        gate_number=clean_num,
        terminal=payload.terminal,
        gate_type=payload.gate_type,
        supported_aircraft=payload.supported_aircraft,
        max_capacity=payload.max_capacity,
        status=payload.status,
        stand_type=payload.stand_type or "Contact Aerobridge",
        has_jetway=payload.has_jetway if payload.has_jetway is not None else 1,
        aircraft_category=payload.aircraft_category or "Code C",
        max_wingspan_m=payload.max_wingspan_m or 36.0,
        max_length_m=payload.max_length_m or 45.0,
        is_remote=payload.is_remote if payload.is_remote is not None else 0,
        data_tier=payload.data_tier or "CONFIGURABLE_DEMONSTRATION_DATA"
    )
    db.add(new_gate)
    log_activity(
        db=db,
        action_type="GATE_CREATED",
        entity_type="Gate",
        entity_id=gate_id,
        title=f"Gate {clean_num} Registered",
        detail=f"Activated gate {clean_num} ({payload.terminal}, {payload.supported_aircraft}) in facility hub.",
        status="info"
    )
    db.commit()
    db.refresh(new_gate)
    return new_gate


@router.put("/{gate_id}", response_model=GateResponse, summary="Update gate")
def update_gate(gate_id: str, payload: GateUpdate, db: Session = Depends(get_db)):
    """Update existing gate properties while preserving ID and checking duplicate codes."""
    gate = db.query(Gate).filter(Gate.id == gate_id).first()
    if not gate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate with ID {gate_id} not found."
        )

    update_dict = payload.model_dump(exclude_unset=True)

    if "gate_number" in update_dict and update_dict["gate_number"]:
        clean_num = update_dict["gate_number"].strip().upper()
        conflict = db.query(Gate).filter(Gate.id != gate_id, Gate.gate_number == clean_num).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another gate with number {clean_num} already exists."
            )
        update_dict["gate_number"] = clean_num

    for key, value in update_dict.items():
        setattr(gate, key, value)

    log_activity(
        db=db,
        action_type="GATE_UPDATED",
        entity_type="Gate",
        entity_id=gate_id,
        title=f"Gate {gate.gate_number} Updated",
        detail=f"Modified gate parameters for {gate.gate_number} ({gate.terminal}).",
        status="info"
    )
    db.commit()
    db.refresh(gate)
    return gate


@router.delete("/{gate_id}", status_code=status.HTTP_200_OK, summary="Delete gate")
def delete_gate(gate_id: str, db: Session = Depends(get_db)):
    """Delete a gate. Blocks deletion if actively referenced in an active simulation scenario."""
    gate = db.query(Gate).filter(Gate.id == gate_id).first()
    if not gate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate with ID {gate_id} not found."
        )

    linked_count = db.query(SimulationGate).filter(SimulationGate.gate_id == gate_id).count()
    if linked_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete gate {gate.gate_number}. It is actively referenced in {linked_count} simulation scenario(s). Remove it from those scenarios first."
        )

    g_num = gate.gate_number
    log_activity(
        db=db,
        action_type="GATE_DELETED",
        entity_type="Gate",
        entity_id=gate_id,
        title=f"Gate {g_num} Removed",
        detail=f"Decommissioned gate {g_num} from facility hub.",
        status="warning"
    )
    db.delete(gate)
    db.commit()
    return {"success": True, "message": f"Gate {gate.gate_number} was deleted."}
