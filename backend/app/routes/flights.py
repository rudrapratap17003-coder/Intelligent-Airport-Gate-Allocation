"""
GateWise API v1 — Flights Router.
Full CRUD operations with SQLite / SQLAlchemy persistence.
"""

import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database.connection import get_db
from app.models.entities import Flight, SimulationFlight
from app.schemas.api_schemas import FlightCreate, FlightUpdate, FlightResponse
from app.services.activity_service import log_activity

router = APIRouter(prefix="/flights", tags=["Flights"])


@router.get("", response_model=List[FlightResponse], summary="List all registered flights")
def list_flights(db: Session = Depends(get_db)):
    """Return all flights ordered by arrival time."""
    return db.query(Flight).order_by(Flight.arrival_time).all()


@router.get("/{flight_id}", response_model=FlightResponse, summary="Get flight by ID")
def get_flight(flight_id: str, db: Session = Depends(get_db)):
    """Return a single flight by its ID."""
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found."
        )
    return flight


@router.post("", response_model=FlightResponse, status_code=status.HTTP_201_CREATED, summary="Create new flight")
def create_flight(payload: FlightCreate, db: Session = Depends(get_db)):
    """Register a new flight with duplicate prevention."""
    clean_num = payload.flight_number.strip().toUpperCase() if hasattr(payload.flight_number, 'toUpperCase') else payload.flight_number.strip().upper()
    flight_id = payload.id or f"FL-{str(int(time.time() * 1000))[-4:]}"

    # Check duplicate flight number
    existing = db.query(Flight).filter(Flight.flight_number == clean_num).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Flight number {clean_num} already exists in registry."
        )

    # Check duplicate ID
    if db.query(Flight).filter(Flight.id == flight_id).first():
        flight_id = f"FL-{str(int(time.time() * 1000))[-6:]}"

    new_flight = Flight(
        id=flight_id,
        flight_number=clean_num,
        airline=payload.airline.strip(),
        aircraft_type=payload.aircraft_type,
        arrival_time=payload.arrival_time,
        departure_time=payload.departure_time,
        passenger_capacity=payload.passenger_capacity,
        terminal=payload.terminal,
        status=payload.status,
        origin=payload.origin or "DEL",
        destination=payload.destination or "BLR",
        flight_type=payload.flight_type or "Domestic",
        priority=payload.priority or "Standard",
        estimated_time=payload.estimated_time or payload.arrival_time,
        actual_time=payload.actual_time,
        turnaround_duration=payload.turnaround_duration or 45,
        aircraft_registration=payload.aircraft_registration or "VT-BLR",
        aircraft_category=payload.aircraft_category or "Code C",
        data_tier=payload.data_tier or "SIMULATED_OPERATIONAL_DATA"
    )
    db.add(new_flight)
    log_activity(
        db=db,
        action_type="FLIGHT_CREATED",
        entity_type="Flight",
        entity_id=flight_id,
        title=f"Flight {clean_num} Registered",
        detail=f"Added flight {clean_num} ({payload.airline}, {payload.aircraft_type}) to fleet registry.",
        status="info"
    )
    db.commit()
    db.refresh(new_flight)
    return new_flight


@router.put("/{flight_id}", response_model=FlightResponse, summary="Update flight")
def update_flight(flight_id: str, payload: FlightUpdate, db: Session = Depends(get_db)):
    """Update existing flight properties while preserving ID and checking duplicate callsigns."""
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found."
        )

    update_dict = payload.model_dump(exclude_unset=True)

    if "flight_number" in update_dict and update_dict["flight_number"]:
        clean_num = update_dict["flight_number"].strip().upper()
        conflict = db.query(Flight).filter(Flight.id != flight_id, Flight.flight_number == clean_num).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another flight with number {clean_num} already exists."
            )
        update_dict["flight_number"] = clean_num

    for key, value in update_dict.items():
        setattr(flight, key, value)

    log_activity(
        db=db,
        action_type="FLIGHT_UPDATED",
        entity_type="Flight",
        entity_id=flight_id,
        title=f"Flight {flight.flight_number} Updated",
        detail=f"Modified parameters for flight {flight.flight_number} ({flight.airline}).",
        status="info"
    )
    db.commit()
    db.refresh(flight)
    return flight


@router.delete("/{flight_id}", status_code=status.HTTP_200_OK, summary="Delete flight")
def delete_flight(flight_id: str, db: Session = Depends(get_db)):
    """Delete a flight. Blocks deletion if actively referenced in an active simulation scenario."""
    flight = db.query(Flight).filter(Flight.id == flight_id).first()
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found."
        )

    # Check referential integrity: is it used in simulations?
    linked_count = db.query(SimulationFlight).filter(SimulationFlight.flight_id == flight_id).count()
    if linked_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete flight {flight.flight_number}. It is actively referenced in {linked_count} simulation scenario(s). Remove it from those scenarios first."
        )

    f_num = flight.flight_number
    log_activity(
        db=db,
        action_type="FLIGHT_DELETED",
        entity_type="Flight",
        entity_id=flight_id,
        title=f"Flight {f_num} Removed",
        detail=f"Deleted flight {f_num} from fleet registry.",
        status="warning"
    )
    db.delete(flight)
    db.commit()
    return {"success": True, "message": f"Flight {flight.flight_number} was deleted."}
