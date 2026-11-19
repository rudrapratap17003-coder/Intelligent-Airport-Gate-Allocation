"""
GateWise — SQLAlchemy Models.
Entities: Flight, Gate, Simulation, SimulationFlight, SimulationGate, RestrictionMatrix.
"""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    String,
    Integer,
    Float,
    ForeignKey,
    DateTime,
    Text,
    UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.connection import Base


class Flight(Base):
    """Flight entity representing an aircraft schedule window."""

    __tablename__ = "flights"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    flight_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    airline: Mapped[str] = mapped_column(String(100), nullable=False)
    aircraft_type: Mapped[str] = mapped_column(String(100), nullable=False)
    arrival_time: Mapped[str] = mapped_column(String(20), nullable=False)
    departure_time: Mapped[str] = mapped_column(String(20), nullable=False)
    passenger_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    terminal: Mapped[str] = mapped_column(String(20), default="T1")
    status: Mapped[str] = mapped_column(String(50), default="Scheduled")

    # BLR Digital Twin Fields
    origin: Mapped[Optional[str]] = mapped_column(String(50), default="DEL", nullable=True)
    destination: Mapped[Optional[str]] = mapped_column(String(50), default="BLR", nullable=True)
    flight_type: Mapped[Optional[str]] = mapped_column(String(50), default="Domestic", nullable=True)
    priority: Mapped[Optional[str]] = mapped_column(String(50), default="Standard", nullable=True)
    estimated_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    actual_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    turnaround_duration: Mapped[Optional[int]] = mapped_column(Integer, default=45, nullable=True)
    aircraft_registration: Mapped[Optional[str]] = mapped_column(String(50), default="VT-BLR", nullable=True)
    aircraft_category: Mapped[Optional[str]] = mapped_column(String(50), default="Code C", nullable=True)
    data_tier: Mapped[Optional[str]] = mapped_column(String(50), default="SIMULATED_OPERATIONAL_DATA", nullable=True)

    # Relationship to simulation link table
    simulations: Mapped[List["SimulationFlight"]] = relationship(
        "SimulationFlight", back_populates="flight", cascade="all, delete-orphan"
    )


class Gate(Base):
    """Gate entity representing an airport docking slot or apron stand."""

    __tablename__ = "gates"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    gate_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    terminal: Mapped[str] = mapped_column(String(20), default="T1")
    gate_type: Mapped[str] = mapped_column(String(50), default="Domestic")
    supported_aircraft: Mapped[str] = mapped_column(String(100), default="Narrow-Body Only")
    max_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="Available")

    # BLR Digital Twin Stand Fields
    stand_type: Mapped[Optional[str]] = mapped_column(String(50), default="Contact Aerobridge", nullable=True)
    has_jetway: Mapped[Optional[int]] = mapped_column(Integer, default=1, nullable=True)
    aircraft_category: Mapped[Optional[str]] = mapped_column(String(50), default="Code C", nullable=True)
    max_wingspan_m: Mapped[Optional[float]] = mapped_column(Float, default=36.0, nullable=True)
    max_length_m: Mapped[Optional[float]] = mapped_column(Float, default=45.0, nullable=True)
    is_remote: Mapped[Optional[int]] = mapped_column(Integer, default=0, nullable=True)
    data_tier: Mapped[Optional[str]] = mapped_column(String(50), default="CONFIGURABLE_DEMONSTRATION_DATA", nullable=True)

    # Relationship to simulation link table
    simulations: Mapped[List["SimulationGate"]] = relationship(
        "SimulationGate", back_populates="gate", cascade="all, delete-orphan"
    )


class Simulation(Base):
    """Simulation entity representing an allocation scenario window."""

    __tablename__ = "simulations"

    id: Mapped[str] = mapped_column(String(50), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    status: Mapped[str] = mapped_column(String(50), default="Draft")

    # Linked flights & gates
    selected_flights: Mapped[List["SimulationFlight"]] = relationship(
        "SimulationFlight", back_populates="simulation", cascade="all, delete-orphan"
    )
    selected_gates: Mapped[List["SimulationGate"]] = relationship(
        "SimulationGate", back_populates="simulation", cascade="all, delete-orphan"
    )

    # Restriction Matrix associated with this scenario (one-to-one)
    restriction_matrix: Mapped[Optional["RestrictionMatrix"]] = relationship(
        "RestrictionMatrix", back_populates="simulation", uselist=False, cascade="all, delete-orphan"
    )


class SimulationFlight(Base):
    """Link table associating simulations with selected flights."""

    __tablename__ = "simulation_flights"
    __table_args__ = (
        UniqueConstraint("simulation_id", "flight_id", name="uq_simulation_flight"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(String(50), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    flight_id: Mapped[str] = mapped_column(String(50), ForeignKey("flights.id", ondelete="RESTRICT"), nullable=False)

    simulation: Mapped["Simulation"] = relationship("Simulation", back_populates="selected_flights")
    flight: Mapped["Flight"] = relationship("Flight", back_populates="simulations")


class SimulationGate(Base):
    """Link table associating simulations with selected gates."""

    __tablename__ = "simulation_gates"
    __table_args__ = (
        UniqueConstraint("simulation_id", "gate_id", name="uq_simulation_gate"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(String(50), ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False)
    gate_id: Mapped[str] = mapped_column(String(50), ForeignKey("gates.id", ondelete="RESTRICT"), nullable=False)

    simulation: Mapped["Simulation"] = relationship("Simulation", back_populates="selected_gates")
    gate: Mapped["Gate"] = relationship("Gate", back_populates="simulations")


class RestrictionMatrix(Base):
    """Restriction Matrix entity storing the binary board for a scenario."""

    __tablename__ = "restriction_matrices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(String(50), ForeignKey("simulations.id", ondelete="CASCADE"), unique=True, nullable=False)
    rows_count: Mapped[int] = mapped_column(Integer, nullable=False)
    cols_count: Mapped[int] = mapped_column(Integer, nullable=False)
    matrix_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON-serialized 2D binary matrix
    row_flight_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-serialized list of row flight IDs
    column_gate_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-serialized list of column gate IDs
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    simulation: Mapped["Simulation"] = relationship("Simulation", back_populates="restriction_matrix")


class ActivityLog(Base):
    """Activity Log entity tracking real operational actions."""

    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    status: Mapped[str] = mapped_column(String(20), default="info")

