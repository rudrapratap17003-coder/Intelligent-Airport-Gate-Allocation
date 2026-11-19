"""
GateWise BLR — Simulation Clock & Operations Engine Service.
Maintains state for the simulated airport operational clock, time-scaling,
and scheduled simulated events (arrivals, departures, delays, gate releases).
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone


class SimulationClockState:
    """In-memory state container for the BLR digital twin operational clock."""

    def __init__(self):
        self.is_running: bool = False
        self.sim_time_minutes: int = 8 * 60 + 30  # Default starts at 08:30 (Morning Peak)
        self.speed_multiplier: int = 1  # 1x, 2x, 5x, 10x
        self.last_wall_time: Optional[datetime] = None
        self.scenario_seed: str = "BLR-MORNING-PEAK-2026"
        self.simulated_events: List[Dict[str, Any]] = [
            {
                "id": "EVT-001",
                "time_minutes": 8 * 60 + 30,
                "time_str": "08:30",
                "event_type": "FLIGHT_ARRIVAL",
                "flight_number": "AI101",
                "terminal": "T2",
                "detail": "Air India B777 touchdown on Runway 09R. Taxiing to Stand 201.",
                "status": "COMPLETED"
            },
            {
                "id": "EVT-002",
                "time_minutes": 8 * 60 + 45,
                "time_str": "08:45",
                "event_type": "FLIGHT_ARRIVAL",
                "flight_number": "UK202",
                "terminal": "T2",
                "detail": "Vistara A320 touchdown on Runway 09L. Docking at Stand 202.",
                "status": "COMPLETED"
            },
            {
                "id": "EVT-003",
                "time_minutes": 9 * 60 + 0,
                "time_str": "09:00",
                "event_type": "BOARDING_CALL",
                "flight_number": "6E303",
                "terminal": "T1",
                "detail": "IndiGo A321 boarding commenced at Stand 1 via Aerobridge.",
                "status": "IN_PROGRESS"
            },
            {
                "id": "EVT-004",
                "time_minutes": 9 * 60 + 15,
                "time_str": "09:15",
                "event_type": "FLIGHT_DELAY",
                "flight_number": "AI505",
                "terminal": "T2",
                "detail": "Air India A350 reported inbound departure delay from DEL (+30 min). Stand 203 hold extended.",
                "status": "ACTIVE"
            },
            {
                "id": "EVT-005",
                "time_minutes": 10 * 60 + 0,
                "time_str": "10:00",
                "event_type": "FLIGHT_DEPARTURE",
                "flight_number": "AI101",
                "terminal": "T2",
                "detail": "Pushback approved from Stand 201. Departing to London Heathrow via Runway 09R.",
                "status": "SCHEDULED"
            }
        ]

    def get_time_str(self) -> str:
        norm = self.sim_time_minutes % (24 * 60)
        h = norm // 60
        m = norm % 60
        return f"{h:02d}:{m:02d}"

    def tick(self, advance_minutes: int = 5) -> Dict[str, Any]:
        """Advance the simulation clock by a given step."""
        self.sim_time_minutes = (self.sim_time_minutes + advance_minutes) % (24 * 60)
        current_time_str = self.get_time_str()

        # Update event statuses based on time
        for ev in self.simulated_events:
            if ev["time_minutes"] <= self.sim_time_minutes:
                if ev["status"] == "SCHEDULED":
                    ev["status"] = "IN_PROGRESS"
            if ev["time_minutes"] + 30 <= self.sim_time_minutes:
                ev["status"] = "COMPLETED"

        return self.get_state()

    def set_time(self, time_str: str) -> Dict[str, Any]:
        """Manually set simulation clock time (HH:MM)."""
        parts = time_str.strip().split(":")
        self.sim_time_minutes = (int(parts[0]) * 60 + int(parts[1])) % (24 * 60)
        return self.get_state()

    def set_running(self, running: bool) -> Dict[str, Any]:
        self.is_running = running
        return self.get_state()

    def set_speed(self, speed: int) -> Dict[str, Any]:
        if speed in [1, 2, 5, 10]:
            self.speed_multiplier = speed
        return self.get_state()

    def reset(self) -> Dict[str, Any]:
        self.sim_time_minutes = 8 * 60 + 30
        self.is_running = False
        self.speed_multiplier = 1
        for ev in self.simulated_events:
            if ev["time_minutes"] < 8 * 60 + 30:
                ev["status"] = "COMPLETED"
            elif ev["time_minutes"] == 8 * 60 + 30:
                ev["status"] = "IN_PROGRESS"
            else:
                ev["status"] = "SCHEDULED"
        return self.get_state()

    def get_state(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "sim_time": self.get_time_str(),
            "sim_time_minutes": self.sim_time_minutes,
            "speed_multiplier": self.speed_multiplier,
            "scenario_seed": self.scenario_seed,
            "events_count": len(self.simulated_events),
            "events": self.simulated_events,
            "data_tier": "SIMULATED_OPERATIONAL_DATA",
            "disclaimer": "Academic simulation clock. Not synchronized with real-time airport operations."
        }


# Global singleton instance
sim_clock = SimulationClockState()
