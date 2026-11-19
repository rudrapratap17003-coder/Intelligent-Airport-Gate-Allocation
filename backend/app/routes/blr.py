"""
GateWise BLR — Kempegowda International Airport API Router.
Endpoints for airport configuration, terminal operations, aircraft compatibility,
turnaround occupancy timeline, alerts, and operational simulation clock.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import Flight, Gate
from app.core.airport_config import (
    get_airport_overview,
    BLR_TERMINALS,
    DEMO_BLR_STANDS,
    AIRCRAFT_CATEGORIES
)
from app.services.blr_service import (
    get_terminal_summary,
    list_terminals_overview,
    check_aircraft_gate_compatibility,
    calculate_turnaround_occupancies,
    detect_turnaround_conflicts,
    generate_operational_alerts
)
from app.services.simulation_clock_service import sim_clock

router = APIRouter(prefix="/blr", tags=["BLR Digital Twin"])


# Request schemas
class CompatibilityCheckRequest(BaseModel):
    flight_id: str = Field(..., description="ID of flight to verify")
    gate_id: str = Field(..., description="ID of gate/stand to verify")


class ClockControlRequest(BaseModel):
    action: str = Field(..., description="'start', 'pause', 'resume', 'reset', 'tick', 'speed', or 'set_time'")
    speed: Optional[int] = Field(None, description="Speed multiplier (1, 2, 5, 10)")
    time_str: Optional[str] = Field(None, description="Time string HH:MM when action is set_time")
    advance_minutes: Optional[int] = Field(5, description="Minutes to advance on tick")


class VerifyAllocationRequest(BaseModel):
    allocations: List[Dict[str, str]] = Field(..., description="List of dicts with flight_id and gate_id")


@router.get("/config", summary="Get BLR Airport Configuration & Metadata")
def get_config():
    """Returns verified public BLR airport metadata, runways, terminals, aircraft categories, and data tiers."""
    return get_airport_overview()


@router.get("/terminals", summary="List All Terminal Summaries")
def list_terminals(db: Session = Depends(get_db)):
    """Returns operational summaries and metrics for Terminal 1 and Terminal 2."""
    return list_terminals_overview(db)


@router.get("/terminals/{terminal_id}", summary="Get Detailed Terminal Overview")
def get_terminal(terminal_id: str, db: Session = Depends(get_db)):
    """Returns operational summary for a specific terminal (T1 or T2)."""
    t_id = terminal_id.upper()
    if t_id not in BLR_TERMINALS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terminal {terminal_id} not recognized. Valid terminals are T1, T2."
        )
    return get_terminal_summary(db, t_id)


@router.get("/stands", summary="List Apron Stands with Aircraft Compatibility")
def list_stands(
    terminal: Optional[str] = Query(None, description="Filter stands by terminal (T1 or T2)"),
    db: Session = Depends(get_db)
):
    """Returns all airport gates/stands enriched with BLR stand specifications."""
    query = db.query(Gate)
    if terminal:
        query = query.filter(Gate.terminal == terminal.upper())
    gates = query.order_by(Gate.terminal, Gate.gate_number).all()

    enriched_stands = []
    for g in gates:
        enriched_stands.append({
            "id": g.id,
            "gate_number": g.gate_number,
            "stand_number": f"Stand {g.gate_number.replace('G', '').replace('g', '')}",
            "terminal": g.terminal,
            "gate_type": g.gate_type,
            "supported_aircraft": g.supported_aircraft,
            "max_capacity": g.max_capacity,
            "status": g.status,
            "stand_type": getattr(g, "stand_type", "Contact Aerobridge") or "Contact Aerobridge",
            "has_jetway": bool(getattr(g, "has_jetway", 1)),
            "aircraft_category": getattr(g, "aircraft_category", "Code C") or "Code C",
            "max_wingspan_m": getattr(g, "max_wingspan_m", 36.0) or 36.0,
            "max_length_m": getattr(g, "max_length_m", 45.0) or 45.0,
            "is_remote": bool(getattr(g, "is_remote", 0)),
            "data_tier": getattr(g, "data_tier", "CONFIGURABLE_DEMONSTRATION_DATA")
        })

    return enriched_stands


@router.post("/compatibility/check", summary="Check Aircraft-Gate Compatibility")
def check_compatibility(payload: CompatibilityCheckRequest, db: Session = Depends(get_db)):
    """Evaluates whether an aircraft can physically and operationally dock at a designated stand."""
    flight = db.query(Flight).filter(Flight.id == payload.flight_id).first()
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight {payload.flight_id} not found."
        )

    gate = db.query(Gate).filter(Gate.id == payload.gate_id).first()
    if not gate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gate/Stand {payload.gate_id} not found."
        )

    return check_aircraft_gate_compatibility(flight, gate)


@router.get("/turnaround/timeline", summary="Get Aircraft Turnaround Occupancy Timeline")
def get_turnaround_timeline(
    terminal: Optional[str] = Query(None, description="Filter by terminal (T1 or T2)"),
    db: Session = Depends(get_db)
):
    """Calculates turnaround windows, buffers, and occupancy metrics for all registered flights."""
    return calculate_turnaround_occupancies(db, terminal_filter=terminal)


@router.post("/turnaround/verify-allocation", summary="Verify Turnaround Overlap in Allocation")
def verify_allocation_turnaround(payload: VerifyAllocationRequest, db: Session = Depends(get_db)):
    """Checks whether an allocation causes any two aircraft to overlap in stand occupancy."""
    flights = {f.id: f for f in db.query(Flight).all()}
    conflicts = detect_turnaround_conflicts(payload.allocations, flights)
    return {
        "valid": len(conflicts) == 0,
        "conflicts_count": len(conflicts),
        "conflicts": conflicts
    }


@router.get("/alerts", summary="Get Airport Operational Alerts")
def get_alerts(
    terminal: Optional[str] = Query(None, description="Filter alerts by terminal"),
    db: Session = Depends(get_db)
):
    """Returns rule-generated alerts for flight delays, stand maintenance, and terminal bottlenecks."""
    return generate_operational_alerts(db, terminal_filter=terminal)


@router.get("/simulation/clock", summary="Get Simulated Operational Clock State")
def get_clock():
    """Returns the current state of the BLR digital twin simulation clock."""
    return sim_clock.get_state()


@router.post("/simulation/clock/control", summary="Control Simulation Clock")
def control_clock(payload: ClockControlRequest):
    """Start, pause, resume, reset, speed up, or advance the simulated clock."""
    act = payload.action.lower()
    if act == "start" or act == "resume":
        return sim_clock.set_running(True)
    elif act == "pause" or act == "stop":
        return sim_clock.set_running(False)
    elif act == "reset":
        return sim_clock.reset()
    elif act == "tick":
        return sim_clock.tick(advance_minutes=payload.advance_minutes or 5)
    elif act == "speed":
        if not payload.speed:
            raise HTTPException(status_code=400, detail="Speed parameter required (1, 2, 5, 10).")
        return sim_clock.set_speed(payload.speed)
    elif act == "set_time":
        if not payload.time_str:
            raise HTTPException(status_code=400, detail="time_str parameter required (HH:MM).")
        return sim_clock.set_time(payload.time_str)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown action '{payload.action}'. Valid: start, pause, resume, reset, tick, speed, set_time."
        )
