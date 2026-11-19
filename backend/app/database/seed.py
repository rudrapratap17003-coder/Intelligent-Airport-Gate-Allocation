"""
GateWise — Database Seeder.
Initializes the database with benchmark sample flights, gates, simulations, and restrictions
without duplicating existing records.
"""

import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.entities import (
    Flight,
    Gate,
    Simulation,
    SimulationFlight,
    SimulationGate,
    RestrictionMatrix,
    ActivityLog
)
from app.core.logging import logger

SAMPLE_FLIGHTS = [
    {
        "id": "FL-001",
        "flight_number": "AI101",
        "airline": "Air India",
        "aircraft_type": "Wide-Body (B777)",
        "arrival_time": "08:30",
        "departure_time": "10:00",
        "passenger_capacity": 342,
        "terminal": "T2",
        "status": "Scheduled",
        "origin": "DEL",
        "destination": "LHR",
        "flight_type": "International",
        "priority": "Standard",
        "estimated_time": "08:30",
        "actual_time": "08:30",
        "turnaround_duration": 90,
        "aircraft_registration": "VT-ALQ",
        "aircraft_category": "Code E",
        "data_tier": "SIMULATED_OPERATIONAL_DATA"
    },
    {
        "id": "FL-002",
        "flight_number": "UK202",
        "airline": "Vistara",
        "aircraft_type": "Narrow-Body (A320)",
        "arrival_time": "08:45",
        "departure_time": "09:45",
        "passenger_capacity": 164,
        "terminal": "T2",
        "status": "Scheduled",
        "origin": "BOM",
        "destination": "BLR",
        "flight_type": "Domestic",
        "priority": "Standard",
        "estimated_time": "08:45",
        "actual_time": "08:45",
        "turnaround_duration": 45,
        "aircraft_registration": "VT-TNB",
        "aircraft_category": "Code C",
        "data_tier": "SIMULATED_OPERATIONAL_DATA"
    },
    {
        "id": "FL-003",
        "flight_number": "6E303",
        "airline": "IndiGo",
        "aircraft_type": "Narrow-Body (A321)",
        "arrival_time": "09:00",
        "departure_time": "10:15",
        "passenger_capacity": 222,
        "terminal": "T1",
        "status": "Boarding",
        "origin": "HYD",
        "destination": "BLR",
        "flight_type": "Domestic",
        "priority": "Standard",
        "estimated_time": "09:00",
        "actual_time": "09:00",
        "turnaround_duration": 50,
        "aircraft_registration": "VT-IMD",
        "aircraft_category": "Code C",
        "data_tier": "SIMULATED_OPERATIONAL_DATA"
    },
    {
        "id": "FL-004",
        "flight_number": "SG404",
        "airline": "SpiceJet",
        "aircraft_type": "Narrow-Body (B737)",
        "arrival_time": "09:15",
        "departure_time": "10:30",
        "passenger_capacity": 189,
        "terminal": "T1",
        "status": "Scheduled",
        "origin": "DEL",
        "destination": "BLR",
        "flight_type": "Domestic",
        "priority": "Standard",
        "estimated_time": "09:15",
        "actual_time": "09:15",
        "turnaround_duration": 45,
        "aircraft_registration": "VT-SZR",
        "aircraft_category": "Code C",
        "data_tier": "SIMULATED_OPERATIONAL_DATA"
    },
    {
        "id": "FL-005",
        "flight_number": "AI505",
        "airline": "Air India",
        "aircraft_type": "Wide-Body (A350)",
        "arrival_time": "09:30",
        "departure_time": "11:15",
        "passenger_capacity": 316,
        "terminal": "T2",
        "status": "Delayed",
        "origin": "DXB",
        "destination": "BLR",
        "flight_type": "International",
        "priority": "Standard",
        "estimated_time": "10:00",
        "actual_time": "10:00",
        "turnaround_duration": 90,
        "aircraft_registration": "VT-JRH",
        "aircraft_category": "Code E",
        "data_tier": "SIMULATED_OPERATIONAL_DATA"
    },
    {
        "id": "FL-006",
        "flight_number": "UK606",
        "airline": "Vistara",
        "aircraft_type": "Narrow-Body (A320)",
        "arrival_time": "09:45",
        "departure_time": "10:45",
        "passenger_capacity": 164,
        "terminal": "T2",
        "status": "Scheduled",
        "origin": "CCU",
        "destination": "BLR",
        "flight_type": "Domestic",
        "priority": "Standard",
        "estimated_time": "09:45",
        "actual_time": "09:45",
        "turnaround_duration": 45,
        "aircraft_registration": "VT-TNC",
        "aircraft_category": "Code C",
        "data_tier": "SIMULATED_OPERATIONAL_DATA"
    }
]

SAMPLE_GATES = [
    {
        "id": "GT-001",
        "gate_number": "G1",
        "terminal": "T1",
        "gate_type": "Domestic",
        "supported_aircraft": "Narrow-Body Only",
        "max_capacity": 230,
        "status": "Available",
        "stand_type": "Contact Aerobridge",
        "has_jetway": 1,
        "aircraft_category": "Code C",
        "max_wingspan_m": 36.0,
        "max_length_m": 45.0,
        "is_remote": 0,
        "data_tier": "CONFIGURABLE_DEMONSTRATION_DATA"
    },
    {
        "id": "GT-002",
        "gate_number": "G2",
        "terminal": "T1",
        "gate_type": "Domestic",
        "supported_aircraft": "Narrow-Body Only",
        "max_capacity": 230,
        "status": "Available",
        "stand_type": "Contact Aerobridge",
        "has_jetway": 1,
        "aircraft_category": "Code C",
        "max_wingspan_m": 36.0,
        "max_length_m": 45.0,
        "is_remote": 0,
        "data_tier": "CONFIGURABLE_DEMONSTRATION_DATA"
    },
    {
        "id": "GT-003",
        "gate_number": "G3",
        "terminal": "T2",
        "gate_type": "Universal",
        "supported_aircraft": "All Categories (Narrow & Wide)",
        "max_capacity": 450,
        "status": "Available",
        "stand_type": "Contact Aerobridge",
        "has_jetway": 1,
        "aircraft_category": "Code E",
        "max_wingspan_m": 65.0,
        "max_length_m": 75.0,
        "is_remote": 0,
        "data_tier": "CONFIGURABLE_DEMONSTRATION_DATA"
    },
    {
        "id": "GT-004",
        "gate_number": "G4",
        "terminal": "T2",
        "gate_type": "Universal",
        "supported_aircraft": "All Categories (Narrow & Wide)",
        "max_capacity": 450,
        "status": "Available",
        "stand_type": "Contact Aerobridge",
        "has_jetway": 1,
        "aircraft_category": "Code E",
        "max_wingspan_m": 65.0,
        "max_length_m": 75.0,
        "is_remote": 0,
        "data_tier": "CONFIGURABLE_DEMONSTRATION_DATA"
    },
    {
        "id": "GT-005",
        "gate_number": "G5",
        "terminal": "T2",
        "gate_type": "International",
        "supported_aircraft": "Wide-Body Only",
        "max_capacity": 500,
        "status": "Occupied",
        "stand_type": "Contact Aerobridge",
        "has_jetway": 1,
        "aircraft_category": "Code E",
        "max_wingspan_m": 65.0,
        "max_length_m": 75.0,
        "is_remote": 0,
        "data_tier": "CONFIGURABLE_DEMONSTRATION_DATA"
    },
    {
        "id": "GT-006",
        "gate_number": "G6",
        "terminal": "T2",
        "gate_type": "International",
        "supported_aircraft": "All Categories (Narrow & Wide)",
        "max_capacity": 450,
        "status": "Available",
        "stand_type": "Contact Dual Aerobridge",
        "has_jetway": 1,
        "aircraft_category": "Code F",
        "max_wingspan_m": 80.0,
        "max_length_m": 80.0,
        "is_remote": 0,
        "data_tier": "CONFIGURABLE_DEMONSTRATION_DATA"
    }
]

SAMPLE_SIMULATIONS = [
    {
        "id": "SIM-001",
        "name": "Morning Peak Allocation (6x6 Benchmark)",
        "description": "Baseline morning allocation window comparing 6 international & domestic flights across 6 terminal gates.",
        "flight_ids": ["FL-001", "FL-002", "FL-003", "FL-004", "FL-005", "FL-006"],
        "gate_ids": ["GT-001", "GT-002", "GT-003", "GT-004", "GT-005", "GT-006"],
        "status": "Ready",
        "matrix": [
            [0, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [1, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0]
        ]
    },
    {
        "id": "SIM-002",
        "name": "Regional Shuttle Window (3x3 Sample)",
        "description": "Compact 3-flight sub-schedule testing narrow-body terminal turnaround constraints.",
        "flight_ids": ["FL-002", "FL-003", "FL-004"],
        "gate_ids": ["GT-001", "GT-002", "GT-003"],
        "status": "Ready",
        "matrix": [
            [0, 1, 0],
            [0, 0, 1],
            [1, 0, 0]
        ]
    },
    {
        "id": "SIM-003",
        "name": "Evening International Hub (Draft)",
        "description": "Preliminary planning scenario for heavy wide-body overnight departures.",
        "flight_ids": ["FL-001", "FL-005"],
        "gate_ids": ["GT-005", "GT-006"],
        "status": "Draft",
        "matrix": [
            [0, 0],
            [0, 0]
        ]
    }
]


def seed_database(db: Session):
    """Seed the database with initial benchmark datasets in a strictly idempotent manner.
    - Preserves existing user-created records.
    - Never overwrites existing entity attributes or restriction matrices.
    - Repeated executions produce zero duplicate records.
    """
    seeded_flights_count = 0
    for f in SAMPLE_FLIGHTS:
        existing = db.query(Flight).filter(
            (Flight.id == f["id"]) | (Flight.flight_number == f["flight_number"])
        ).first()
        if not existing:
            db.add(Flight(**f))
            seeded_flights_count += 1
        else:
            for k in ["origin", "destination", "flight_type", "priority", "turnaround_duration", "aircraft_registration", "aircraft_category", "data_tier", "estimated_time", "actual_time"]:
                if k in f:
                    setattr(existing, k, f[k])

    seeded_gates_count = 0
    for g in SAMPLE_GATES:
        existing = db.query(Gate).filter(
            (Gate.id == g["id"]) | (Gate.gate_number == g["gate_number"])
        ).first()
        if not existing:
            db.add(Gate(**g))
            seeded_gates_count += 1
        else:
            for k in ["stand_type", "has_jetway", "aircraft_category", "max_wingspan_m", "max_length_m", "is_remote", "data_tier"]:
                if k in g:
                    setattr(existing, k, g[k])

    if seeded_flights_count > 0 or seeded_gates_count > 0:
        db.flush()

    seeded_sims_count = 0
    for s in SAMPLE_SIMULATIONS:
        existing_sim = db.query(Simulation).filter(
            (Simulation.id == s["id"]) | (Simulation.name == s["name"])
        ).first()

        if not existing_sim:
            sim = Simulation(
                id=s["id"],
                name=s["name"],
                description=s["description"],
                status=s["status"],
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(sim)
            db.flush()

            for f_id in s["flight_ids"]:
                # Ensure referenced flight exists before linking
                if db.query(Flight).filter(Flight.id == f_id).first():
                    db.add(SimulationFlight(simulation_id=sim.id, flight_id=f_id))

            for g_id in s["gate_ids"]:
                # Ensure referenced gate exists before linking
                if db.query(Gate).filter(Gate.id == g_id).first():
                    db.add(SimulationGate(simulation_id=sim.id, gate_id=g_id))

            # Restriction board - only created with new simulation
            matrix_json = json.dumps(s["matrix"])
            db.add(RestrictionMatrix(
                simulation_id=sim.id,
                rows_count=len(s["matrix"]),
                cols_count=len(s["matrix"][0]) if s["matrix"] else 0,
                matrix_data=matrix_json,
                row_flight_ids=json.dumps(s["flight_ids"]) if s.get("flight_ids") else None,
                column_gate_ids=json.dumps(s["gate_ids"]) if s.get("gate_ids") else None,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            ))
            seeded_sims_count += 1

    # Seed initial activity log history if empty
    if db.query(ActivityLog).count() == 0:
        now = datetime.now(timezone.utc)
        bootstrap_activities = [
            ActivityLog(
                action_type="INITIAL_BOOTSTRAP",
                entity_type="Flight",
                entity_id="FL-001",
                title="Fleet Registry Initialized",
                detail="Registered 6 benchmark flights (AI101, UK202, 6E303, SG404, AI505, UK606) across Terminal 1 & 2.",
                timestamp=now,
                status="info"
            ),
            ActivityLog(
                action_type="INITIAL_BOOTSTRAP",
                entity_type="Gate",
                entity_id="GT-001",
                title="Terminal Gates Configured",
                detail="Configured 6 docking positions (Gates G1 through G6) with jetway compatibility metadata.",
                timestamp=now,
                status="info"
            ),
            ActivityLog(
                action_type="SIMULATION_CREATED",
                entity_type="Simulation",
                entity_id="SIM-001",
                title="Standard Benchmark Scenario Created",
                detail="Created scenario SIM-001 with 6 flights and 6 gates for morning peak rush.",
                timestamp=now,
                status="info"
            ),
            ActivityLog(
                action_type="RESTRICTION_UPDATED",
                entity_type="RestrictionMatrix",
                entity_id="SIM-001",
                title="Restriction Board Initialized",
                detail="Configured 5 forbidden assignments on 6 × 6 binary restriction board for SIM-001.",
                timestamp=now,
                status="warning"
            ),
            ActivityLog(
                action_type="CALCULATION_PERFORMED",
                entity_type="Allocation",
                entity_id="SIM-001",
                title="Mathematical Engine Evaluated",
                detail="Computed Rook Polynomial and PIE exact count: N = 309 valid conflict-free assignments out of 720.",
                timestamp=now,
                status="success"
            )
        ]
        db.add_all(bootstrap_activities)

    db.commit()
    if seeded_flights_count > 0 or seeded_gates_count > 0 or seeded_sims_count > 0:
        logger.info(
            f"Database seeded: {seeded_flights_count} flights, {seeded_gates_count} gates, {seeded_sims_count} simulations."
        )
