"""
GateWise BLR — Airport Service Layer.
Implements terminal operations, aircraft-stand compatibility verification,
turnaround calculations, and operational alert generation.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, time as dt_time
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.airport_config import (
    BLR_AIRPORT_METADATA,
    BLR_RUNWAYS,
    BLR_TERMINALS,
    AIRCRAFT_CATEGORIES,
    DEMO_BLR_STANDS,
    DataTier
)
from app.models.entities import Flight, Gate, Simulation, ActivityLog


def parse_time_to_minutes(time_str: str) -> int:
    """Convert 'HH:MM' string to minutes from midnight."""
    try:
        parts = time_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0


def minutes_to_time_str(minutes: int) -> str:
    """Convert minutes from midnight to 'HH:MM' string."""
    norm = minutes % (24 * 60)
    h = norm // 60
    m = norm % 60
    return f"{h:02d}:{m:02d}"


def get_terminal_summary(db: Session, terminal_id: str) -> Dict[str, Any]:
    """Retrieve operational summary for a specific terminal (T1 or T2)."""
    t_config = BLR_TERMINALS.get(terminal_id.upper())
    if not t_config:
        return {"error": f"Terminal {terminal_id} not found"}

    # Fetch gates/stands for this terminal
    gates = db.query(Gate).filter(Gate.terminal == terminal_id.upper()).all()
    flights = db.query(Flight).filter(Flight.terminal == terminal_id.upper()).all()

    total_stands = len(gates)
    available_stands = sum(1 for g in gates if g.status.lower() == "available")
    occupied_stands = sum(1 for g in gates if g.status.lower() == "occupied")
    restricted_stands = sum(1 for g in gates if g.status.lower() in ["restricted", "maintenance", "closed"])

    contact_stands = sum(1 for g in gates if getattr(g, "has_jetway", 1) == 1)
    remote_stands = total_stands - contact_stands

    domestic_flights = sum(1 for f in flights if getattr(f, "flight_type", "Domestic") == "Domestic")
    intl_flights = len(flights) - domestic_flights
    delayed_flights = sum(1 for f in flights if f.status.lower() == "delayed")

    return {
        "terminal_id": terminal_id.upper(),
        "name": t_config["name"],
        "role": t_config["role"],
        "opened_year": t_config["opened_year"],
        "area_sq_m": t_config["area_sq_m"],
        "primary_airlines": t_config["primary_airlines"],
        "allowed_flight_types": t_config["allowed_flight_types"],
        "supported_aircraft_categories": t_config["supported_aircraft_categories"],
        "max_wingspan_m": t_config["max_wingspan_m"],
        "operational_status": t_config["operational_status"],
        "data_tier": t_config["data_tier"],
        "statistics": {
            "total_stands": total_stands,
            "available_stands": available_stands,
            "occupied_stands": occupied_stands,
            "restricted_stands": restricted_stands,
            "contact_stands": contact_stands,
            "remote_stands": remote_stands,
            "total_flights": len(flights),
            "domestic_flights": domestic_flights,
            "international_flights": intl_flights,
            "delayed_flights": delayed_flights,
            "stand_utilization_pct": round((occupied_stands / total_stands * 100), 1) if total_stands > 0 else 0.0
        }
    }


def list_terminals_overview(db: Session) -> List[Dict[str, Any]]:
    """Return list of all terminals with summary statistics."""
    return [get_terminal_summary(db, tid) for tid in ["T1", "T2"]]


def check_aircraft_gate_compatibility(
    flight: Flight,
    gate: Gate
) -> Dict[str, Any]:
    """
    Evaluates aircraft and stand compatibility across 4 aviation dimensions:
    1. Terminal Eligibility: Flight type (Domestic vs International) must match terminal rules.
    2. Wingspan & Category Compatibility: Aircraft code must not exceed stand category.
    3. Stand Operational Status: Stand must not be under maintenance/restricted.
    4. Passenger Capacity: Stand/gate max capacity must accommodate passenger load.
    """
    checks = []
    is_compatible = True
    diagnostic_reasons = []

    # 1. Terminal Check
    f_terminal = (flight.terminal or "T1").upper()
    g_terminal = (gate.terminal or "T1").upper()
    f_type = getattr(flight, "flight_type", "Domestic") or "Domestic"

    if f_terminal != g_terminal:
        is_compatible = False
        reason = f"Terminal Mismatch: Flight belongs to {f_terminal}, but Stand is located in {g_terminal}."
        diagnostic_reasons.append(reason)
        checks.append({"rule": "TERMINAL_LOCATION", "passed": False, "detail": reason})
    else:
        checks.append({"rule": "TERMINAL_LOCATION", "passed": True, "detail": f"Both located in {g_terminal}."})

    # Terminal Role Check: International flights cannot use T1
    if f_type.lower() == "international" and g_terminal == "T1":
        is_compatible = False
        reason = "Terminal Restriction: Terminal 1 is dedicated to Domestic operations. International flights must be assigned to Terminal 2."
        diagnostic_reasons.append(reason)
        checks.append({"rule": "TERMINAL_ROLE", "passed": False, "detail": reason})
    else:
        checks.append({"rule": "TERMINAL_ROLE", "passed": True, "detail": f"Flight type '{f_type}' is permitted in {g_terminal}."})

    # 2. Aircraft Category / Wingspan Check
    # Category hierarchy: Code C (1) < Code D (2) < Code E (3) < Code F (4)
    cat_rank = {"Code C": 1, "Code D": 2, "Code E": 3, "Code F": 4}

    # Infer category if not explicit
    f_cat = getattr(flight, "aircraft_category", None)
    if not f_cat:
        if "wide" in flight.aircraft_type.lower() or "b777" in flight.aircraft_type.lower() or "a350" in flight.aircraft_type.lower():
            f_cat = "Code E"
        elif "a380" in flight.aircraft_type.lower():
            f_cat = "Code F"
        else:
            f_cat = "Code C"

    g_cat = getattr(gate, "aircraft_category", None)
    if not g_cat:
        if "wide" in gate.supported_aircraft.lower() or "all" in gate.supported_aircraft.lower():
            g_cat = "Code E"
        else:
            g_cat = "Code C"

    f_rank = cat_rank.get(f_cat, 1)
    g_rank = cat_rank.get(g_cat, 1)

    if f_rank > g_rank:
        is_compatible = False
        reason = f"Aircraft Category Limit Exceeded: Flight aircraft is {f_cat}, but Stand supports up to {g_cat} only."
        diagnostic_reasons.append(reason)
        checks.append({"rule": "AIRCRAFT_CATEGORY", "passed": False, "detail": reason})
    else:
        checks.append({"rule": "AIRCRAFT_CATEGORY", "passed": True, "detail": f"Aircraft {f_cat} fits within Stand capacity {g_cat}."})

    # 3. Stand Operational Status
    if gate.status.lower() in ["maintenance", "closed", "restricted"]:
        is_compatible = False
        reason = f"Resource Unavailable: Stand {gate.gate_number} is currently marked as '{gate.status}'."
        diagnostic_reasons.append(reason)
        checks.append({"rule": "STAND_STATUS", "passed": False, "detail": reason})
    else:
        checks.append({"rule": "STAND_STATUS", "passed": True, "detail": f"Stand status is '{gate.status}'."})

    # 4. Capacity Check
    if flight.passenger_capacity > gate.max_capacity:
        is_compatible = False
        reason = f"Capacity Exceeded: Flight has {flight.passenger_capacity} passengers, but Stand capacity is {gate.max_capacity}."
        diagnostic_reasons.append(reason)
        checks.append({"rule": "PASSENGER_CAPACITY", "passed": False, "detail": reason})
    else:
        checks.append({"rule": "PASSENGER_CAPACITY", "passed": True, "detail": f"Capacity check passed ({flight.passenger_capacity} <= {gate.max_capacity})."})

    status_str = "Compatible" if is_compatible else ("Restricted" if gate.status.lower() == "restricted" else "Incompatible")

    return {
        "flight_id": flight.id,
        "flight_number": flight.flight_number,
        "aircraft_category": f_cat,
        "gate_id": gate.id,
        "gate_number": gate.gate_number,
        "stand_category": g_cat,
        "is_compatible": is_compatible,
        "status": status_str,
        "diagnostic_reasons": diagnostic_reasons,
        "checks": checks,
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    }


def calculate_turnaround_occupancies(db: Session, terminal_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Computes aircraft turnaround windows and detects physical stand occupancy overlaps.
    Turnaround window = [arrival_time, arrival_time + turnaround_duration + safety_buffer].
    """
    flights_query = db.query(Flight)
    if terminal_filter:
        flights_query = flights_query.filter(Flight.terminal == terminal_filter.upper())
    flights = flights_query.all()

    gates_query = db.query(Gate)
    if terminal_filter:
        gates_query = gates_query.filter(Gate.terminal == terminal_filter.upper())
    gates = {g.id: g for g in gates_query.all()}

    occupancies = []
    for f in flights:
        arr_min = parse_time_to_minutes(f.arrival_time)
        dep_min = parse_time_to_minutes(f.departure_time)
        if dep_min < arr_min:
            dep_min += 24 * 60  # Crosses midnight

        turnaround = getattr(f, "turnaround_duration", 45) or 45
        cat = getattr(f, "aircraft_category", "Code C") or "Code C"
        buffer_min = AIRCRAFT_CATEGORIES.get(cat, {}).get("min_buffer_min", 15)
        total_occupancy_min = turnaround + buffer_min

        sched_occupancy_min = dep_min - arr_min

        occupancies.append({
            "flight_id": f.id,
            "flight_number": f.flight_number,
            "airline": f.airline,
            "aircraft_type": f.aircraft_type,
            "aircraft_category": cat,
            "terminal": f.terminal,
            "arrival_time": f.arrival_time,
            "departure_time": f.departure_time,
            "arrival_minutes": arr_min,
            "departure_minutes": dep_min,
            "turnaround_duration_min": turnaround,
            "safety_buffer_min": buffer_min,
            "total_occupancy_min": total_occupancy_min,
            "window_end_time": minutes_to_time_str(arr_min + total_occupancy_min),
            "status": f.status,
            "data_tier": DataTier.SIMULATED_OPERATIONAL.value
        })

    return occupancies


def detect_turnaround_conflicts(
    allocations: List[Dict[str, str]],
    flights_map: Dict[str, Flight]
) -> List[Dict[str, Any]]:
    """
    Given an allocation of flights to gates, detects any temporal overlaps
    where two flights assigned to the same gate overlap in their turnaround window.
    """
    # Group flights by gate_id
    gate_assignments: Dict[str, List[Flight]] = {}
    for alloc in allocations:
        g_id = alloc.get("gate_id")
        f_id = alloc.get("flight_id")
        if g_id and f_id and f_id in flights_map:
            gate_assignments.setdefault(g_id, []).append(flights_map[f_id])

    conflicts = []
    for g_id, assigned_flights in gate_assignments.items():
        if len(assigned_flights) < 2:
            continue

        # Sort by arrival time
        sorted_flights = sorted(
            assigned_flights,
            key=lambda fl: parse_time_to_minutes(fl.arrival_time)
        )

        for i in range(len(sorted_flights) - 1):
            f1 = sorted_flights[i]
            f2 = sorted_flights[i + 1]

            f1_arr = parse_time_to_minutes(f1.arrival_time)
            f1_turnaround = getattr(f1, "turnaround_duration", 45) or 45
            f1_cat = getattr(f1, "aircraft_category", "Code C") or "Code C"
            f1_buffer = AIRCRAFT_CATEGORIES.get(f1_cat, {}).get("min_buffer_min", 15)
            f1_release = f1_arr + f1_turnaround + f1_buffer

            f2_arr = parse_time_to_minutes(f2.arrival_time)

            if f2_arr < f1_release:
                overlap_min = f1_release - f2_arr
                conflicts.append({
                    "gate_id": g_id,
                    "flight_1": {
                        "id": f1.id,
                        "flight_number": f1.flight_number,
                        "arrival_time": f1.arrival_time,
                        "release_time": minutes_to_time_str(f1_release)
                    },
                    "flight_2": {
                        "id": f2.id,
                        "flight_number": f2.flight_number,
                        "arrival_time": f2.arrival_time
                    },
                    "overlap_minutes": overlap_min,
                    "reason": f"Physical Stand Overlap: Flight {f2.flight_number} arrives at {f2.arrival_time} before Stand is released by Flight {f1.flight_number} at {minutes_to_time_str(f1_release)} ({overlap_min} min overlap).",
                    "severity": "CRITICAL",
                    "data_tier": DataTier.SIMULATED_OPERATIONAL.value
                })

    return conflicts


def generate_operational_alerts(db: Session, terminal_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Evaluates current airport operational state and generates structured operational alerts:
    - Delayed flights alerts
    - Maintenance / closed stand alerts
    - High utilization alerts
    - Compatibility alerts
    """
    alerts = []
    alert_idx = 1
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Delayed Flights
    flights_q = db.query(Flight)
    if terminal_filter:
        flights_q = flights_q.filter(Flight.terminal == terminal_filter.upper())
    flights = flights_q.all()

    for f in flights:
        if f.status.lower() == "delayed":
            alerts.append({
                "id": f"ALT-{alert_idx:04d}",
                "category": "FLIGHT_DELAY",
                "severity": "WARNING",
                "terminal": f.terminal,
                "entity_type": "Flight",
                "entity_id": f.id,
                "entity_identifier": f.flight_number,
                "timestamp": now_str,
                "title": f"Flight {f.flight_number} Delayed",
                "explanation": f"{f.airline} flight {f.flight_number} ({f.aircraft_type}) scheduled for arrival at {f.arrival_time} has reported an operational delay.",
                "recommended_action": f"Re-verify stand availability for Terminal {f.terminal} and adjust gate occupancy buffer.",
                "data_tier": DataTier.SIMULATED_OPERATIONAL.value
            })
            alert_idx += 1

    # 2. Stand Maintenance / Restricted
    gates_q = db.query(Gate)
    if terminal_filter:
        gates_q = gates_q.filter(Gate.terminal == terminal_filter.upper())
    gates = gates_q.all()

    for g in gates:
        if g.status.lower() in ["maintenance", "restricted", "closed"]:
            alerts.append({
                "id": f"ALT-{alert_idx:04d}",
                "category": "RESOURCE_UNAVAILABLE",
                "severity": "CRITICAL" if g.status.lower() == "maintenance" else "WARNING",
                "terminal": g.terminal,
                "entity_type": "Gate",
                "entity_id": g.id,
                "entity_identifier": g.gate_number,
                "timestamp": now_str,
                "title": f"Stand {g.gate_number} {g.status.capitalize()}",
                "explanation": f"Apron stand {g.gate_number} in Terminal {g.terminal} is currently unavailable ({g.status}). Aircraft allocations cannot be assigned.",
                "recommended_action": f"Ensure restriction matrix cell for {g.gate_number} is set to 1 (forbidden) for all active scenarios.",
                "data_tier": DataTier.CONFIGURABLE_DEMO.value
            })
            alert_idx += 1

    # 3. Terminal Utilization Alert
    total_stands = len(gates)
    occupied_stands = sum(1 for g in gates if g.status.lower() == "occupied")
    if total_stands > 0 and (occupied_stands / total_stands) > 0.8:
        alerts.append({
            "id": f"ALT-{alert_idx:04d}",
            "category": "CAPACITY_BOTTLENECK",
            "severity": "WARNING",
            "terminal": terminal_filter or "ALL",
            "entity_type": "Terminal",
            "entity_id": terminal_filter or "BLR",
            "entity_identifier": f"Terminal {terminal_filter or 'Airport'}",
            "timestamp": now_str,
            "title": f"High Apron Stand Utilization ({round(occupied_stands/total_stands*100)}%)",
            "explanation": f"{occupied_stands} of {total_stands} stands are currently occupied in the selected view.",
            "recommended_action": "Consider redirecting domestic overflow flights to remote parking aprons.",
            "data_tier": DataTier.SIMULATED_OPERATIONAL.value
        })
        alert_idx += 1

    return alerts
