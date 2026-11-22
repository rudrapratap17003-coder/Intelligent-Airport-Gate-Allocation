"""
GateWise — Traffic Scenario Generator Service.
Generates reproducible simulated flight-to-gate operational scenarios based on
Kempegowda International Airport (BLR / VOBL) operational profiles.
"""

import json
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.models.entities import (
    Simulation,
    SimulationFlight,
    SimulationGate,
    Flight,
    Gate,
    RestrictionMatrix
)
from app.services.activity_service import log_activity


# BLR-based aircraft and flight templates
BLR_AIRLINES = [
    ("IndiGo", "6E", "Narrow-Body (A320neo)", 186, "Domestic", "Code C"),
    ("Air India", "AI", "Wide-Body (B777-300ER)", 342, "International", "Code E"),
    ("Vistara", "UK", "Narrow-Body (A321neo)", 188, "Domestic", "Code C"),
    ("Akasa Air", "QP", "Narrow-Body (B737 MAX 8)", 189, "Domestic", "Code C"),
    ("Air India Express", "IX", "Narrow-Body (B737-800)", 180, "Domestic", "Code C"),
    ("Emirates", "EK", "Wide-Body (A380-800)", 515, "International", "Code F"),
    ("Singapore Airlines", "SQ", "Wide-Body (A350-900)", 303, "International", "Code E"),
    ("Lufthansa", "LH", "Wide-Body (B747-8i)", 364, "International", "Code F"),
    ("SpiceJet", "SG", "Narrow-Body (B737)", 189, "Domestic", "Code C"),
    ("Qatar Airways", "QR", "Wide-Body (B787-9)", 311, "International", "Code E"),
    ("Alliance Air", "9I", "Turboprop (ATR 72-600)", 72, "Domestic", "Code C"),
    ("Star Air", "S5", "Regional (Embraer E175)", 76, "Domestic", "Code C"),
]

BLR_CITIES = ["DEL", "BOM", "HYD", "MAA", "CCU", "GOI", "COK", "DXB", "SIN", "LHR", "DOH", "FRA"]


class TrafficGeneratorService:
    """Service generating realistic, reproducible flight & gate simulation scenarios."""

    @classmethod
    def generate_scenario(
        cls,
        db: Session,
        scenario_name: str,
        category: str = "Normal Operations",
        profile: str = "normal",
        flight_count: int = 6,
        gate_count: int = 6,
        target_terminal: str = "ALL",
        density: str = "moderate"
    ) -> Simulation:
        """Create a complete scenario with generated or mapped flights, gates, and restriction matrix."""
        clean_name = scenario_name.strip()
        now = datetime.now(timezone.utc)
        sim_id = f"SIM-{profile.upper()[:3]}-{str(int(time.time() * 1000))[-4:]}"

        # Adjust dimensions based on standard profiles
        if profile == "low":
            flight_count = 4
            gate_count = 6
            category = "Low-Traffic"
        elif profile == "normal":
            flight_count = 6
            gate_count = 6
            category = "Normal Operations"
        elif profile in ("high", "peak"):
            flight_count = 8
            gate_count = 8
            category = "Peak-Hour Traffic"
        elif profile == "maintenance":
            flight_count = 6
            gate_count = 6
            category = "Gate Maintenance"
        elif profile == "terminal_restricted":
            flight_count = 6
            gate_count = 6
            category = "Terminal Overload"
        elif profile == "emergency":
            flight_count = 5
            gate_count = 5
            category = "Emergency Restriction"

        # 1. Fetch or create flights
        selected_flights = cls._ensure_flights(db, flight_count, profile, target_terminal)

        # 2. Fetch or create gates
        selected_gates = cls._ensure_gates(db, gate_count, profile, target_terminal)

        # 3. Create Simulation entity
        sim = Simulation(
            id=sim_id,
            name=clean_name,
            description=f"Automated {category} scenario ({flight_count} flights, {gate_count} gates) with {profile} operational profile at BLR.",
            category=category,
            date=now.strftime("%Y-%m-%d"),
            time_window=cls._get_time_window(profile),
            status="Ready" if len(selected_flights) == len(selected_gates) else "Draft",
            created_at=now,
            updated_at=now
        )
        db.add(sim)
        db.flush()

        # 4. Link flights and gates
        for f in selected_flights:
            db.add(SimulationFlight(simulation_id=sim.id, flight_id=f.id))
        for g in selected_gates:
            db.add(SimulationGate(simulation_id=sim.id, gate_id=g.id))

        # 5. Generate realistic restriction matrix based on flight/gate compatibility
        matrix = cls._build_compatibility_matrix(selected_flights, selected_gates, profile, density)

        flight_ids = [f.id for f in selected_flights]
        gate_ids = [g.id for g in selected_gates]

        db.add(RestrictionMatrix(
            simulation_id=sim.id,
            rows_count=len(selected_flights),
            cols_count=len(selected_gates),
            matrix_data=json.dumps(matrix),
            row_flight_ids=json.dumps(flight_ids),
            column_gate_ids=json.dumps(gate_ids),
            created_at=now,
            updated_at=now
        ))

        log_activity(
            db=db,
            action_type="SCENARIO_GENERATED",
            entity_type="Simulation",
            entity_id=sim.id,
            title=f"Scenario Generated: {clean_name}",
            detail=f"Auto-generated {category} scenario ({profile} profile, {len(selected_flights)}x{len(selected_gates)} matrix).",
            status="info"
        )

        db.commit()
        db.refresh(sim)
        return sim

    @staticmethod
    def _get_time_window(profile: str) -> str:
        windows = {
            "low": "02:00 - 05:30",
            "normal": "08:00 - 10:30",
            "high": "18:00 - 21:00",
            "peak": "07:30 - 10:30",
            "maintenance": "11:00 - 14:00",
            "terminal_restricted": "14:00 - 17:00",
            "emergency": "19:00 - 22:00",
            "custom": "09:00 - 12:00"
        }
        return windows.get(profile, "08:00 - 11:00")

    @classmethod
    def _ensure_flights(cls, db: Session, count: int, profile: str, target_terminal: str) -> List[Flight]:
        """Fetch existing flights or generate realistic simulated flights."""
        existing_flights = db.query(Flight).all()
        if len(existing_flights) >= count:
            if target_terminal in ("T1", "T2"):
                filtered = [f for f in existing_flights if f.terminal == target_terminal]
                if len(filtered) >= count:
                    return filtered[:count]
            return existing_flights[:count]

        # Generate additional flights if needed
        needed = count - len(existing_flights)
        new_flights = []
        for i in range(needed):
            idx = (len(existing_flights) + i) % len(BLR_AIRLINES)
            airline, code, craft, cap, f_type, cat = BLR_AIRLINES[idx]
            f_num = f"{code}{700 + i}"
            term = "T2" if f_type == "International" or (target_terminal == "T2") else "T1"
            if target_terminal in ("T1", "T2"):
                term = target_terminal

            f = Flight(
                id=f"FL-GEN-{i+1:03d}",
                flight_number=f_num,
                airline=airline,
                aircraft_type=craft,
                arrival_time=f"{8 + (i // 2):02d}:{(i % 2) * 30:02d}",
                departure_time=f"{9 + (i // 2):02d}:{(i % 2) * 30 + 45:02d}",
                passenger_capacity=cap,
                terminal=term,
                status="Scheduled",
                origin="DEL" if f_type == "Domestic" else "DXB",
                destination="BLR",
                flight_type=f_type,
                priority="Standard",
                turnaround_duration=50 if f_type == "Domestic" else 90,
                aircraft_registration=f"VT-G{i+1:02d}",
                aircraft_category=cat,
                data_tier="SIMULATED_OPERATIONAL_DATA"
            )
            db.add(f)
            new_flights.append(f)

        db.flush()
        return (existing_flights + new_flights)[:count]

    @classmethod
    def _ensure_gates(cls, db: Session, count: int, profile: str, target_terminal: str) -> List[Gate]:
        """Fetch existing gates or generate realistic simulated gates."""
        existing_gates = db.query(Gate).all()
        if len(existing_gates) >= count:
            if target_terminal in ("T1", "T2"):
                filtered = [g for g in existing_gates if g.terminal == target_terminal]
                if len(filtered) >= count:
                    return filtered[:count]
            return existing_gates[:count]

        needed = count - len(existing_gates)
        new_gates = []
        for i in range(needed):
            num = len(existing_gates) + i + 1
            term = "T2" if num > 4 or target_terminal == "T2" else "T1"
            if target_terminal in ("T1", "T2"):
                term = target_terminal
            g_type = "International" if term == "T2" and num % 2 == 0 else "Domestic"
            g = Gate(
                id=f"GT-GEN-{num:03d}",
                gate_number=f"G{num}",
                terminal=term,
                gate_type=g_type,
                supported_aircraft="All Categories (Narrow & Wide)" if g_type == "International" else "Narrow-Body Only",
                max_capacity=450 if g_type == "International" else 220,
                status="Available",
                stand_type="Contact Aerobridge",
                has_jetway=1,
                aircraft_category="Code E" if g_type == "International" else "Code C",
                max_wingspan_m=65.0 if g_type == "International" else 36.0,
                max_length_m=75.0 if g_type == "International" else 45.0,
                is_remote=0,
                data_tier="CONFIGURABLE_DEMONSTRATION_DATA"
            )
            db.add(g)
            new_gates.append(g)

        db.flush()
        return (existing_gates + new_gates)[:count]

    @staticmethod
    def _build_compatibility_matrix(
        flights: List[Flight],
        gates: List[Gate],
        profile: str,
        density: str
    ) -> List[List[int]]:
        """Construct a realistic binary restriction matrix based on physical rules."""
        m = len(flights)
        n = len(gates)
        matrix = [[0 for _ in range(n)] for _ in range(m)]

        for i, f in enumerate(flights):
            for j, g in enumerate(gates):
                # 1. Terminal mismatch check
                if f.terminal and g.terminal and f.terminal != g.terminal:
                    matrix[i][j] = 1

                # 2. International flight in Domestic gate is strictly forbidden
                if f.flight_type == "International" and g.gate_type == "Domestic":
                    matrix[i][j] = 1

                # 3. Code E/F wide-body aircraft in Code C narrow-body gate is forbidden
                if f.aircraft_category in ("Code E", "Code F") and g.aircraft_category == "Code C":
                    matrix[i][j] = 1

                # 4. Profile specific restrictions
                if profile == "maintenance" and j in (2, 3):
                    # Gates at index 2 and 3 under maintenance
                    matrix[i][j] = 1

                if profile == "emergency" and g.stand_type == "Remote Apron Stand":
                    # Remote stands closed during emergency weather
                    matrix[i][j] = 1

        # Check density adjustments
        if density == "sparse":
            # Clear some restrictions if feasible
            for i in range(m):
                for j in range(n):
                    if matrix[i][j] == 1 and (i + j) % 3 == 0 and not (flights[i].flight_type == "International" and gates[j].gate_type == "Domestic"):
                        matrix[i][j] = 0
        elif density == "dense":
            # Add occasional operational slot buffer restrictions
            for i in range(m):
                j = (i * 2 + 1) % n
                matrix[i][j] = 1

        # Safeguard: ensure not every cell in any row is forbidden so the scenario isn't trivially 0
        for i in range(m):
            if all(cell == 1 for cell in matrix[i]):
                # Find best fitting gate and allow it
                for j in range(n):
                    if gates[j].gate_type in (flights[i].flight_type, "Universal"):
                        matrix[i][j] = 0
                        break
                else:
                    matrix[i][0] = 0

        return matrix
