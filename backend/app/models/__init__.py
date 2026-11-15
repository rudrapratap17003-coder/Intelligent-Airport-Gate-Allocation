"""
Models package initializer.
Exports all ORM entity models for metadata registration.
"""

from app.models.entities import (
    Flight,
    Gate,
    Simulation,
    SimulationFlight,
    SimulationGate,
    RestrictionMatrix
)

__all__ = [
    "Flight",
    "Gate",
    "Simulation",
    "SimulationFlight",
    "SimulationGate",
    "RestrictionMatrix"
]
