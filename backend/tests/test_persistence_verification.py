"""
GateWise — Phase 12 Final Persistence & Seeding Verification Test Suite.
Uses an isolated temporary SQLite database file to verify backend restarts,
idempotence, referential integrity, and cascading deletions without affecting dev data.
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base, get_db
from app.database.seed import seed_database
from app.models.entities import (
    Flight,
    Gate,
    Simulation,
    SimulationFlight,
    SimulationGate,
    RestrictionMatrix
)
from app.main import create_app


@pytest.fixture(scope="module")
def isolated_db_path():
    """Create a temporary sqlite database file."""
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "isolated_verify.db")
    yield db_path
    # Cleanup after module tests
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass


@pytest.fixture(scope="module")
def persistent_engine(isolated_db_path):
    """Engine that persists to the temporary SQLite file."""
    engine = create_engine(
        f"sqlite:///{isolated_db_path}",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


# -------------------------------------------------------------
# 1. VERIFY SEEDING IDEMPOTENCE
# -------------------------------------------------------------

def test_seeding_idempotence_and_preservation(persistent_engine):
    """Confirm seeding is idempotent, doesn't duplicate, and preserves existing edits."""
    Session = sessionmaker(bind=persistent_engine)

    # First run of seeder
    with Session() as db:
        seed_database(db)
        assert db.query(Flight).count() == 6
        assert db.query(Gate).count() == 6
        assert db.query(Simulation).count() == 3
        assert db.query(RestrictionMatrix).count() == 3

    # User modifies an existing flight and simulation matrix
    with Session() as db:
        f1 = db.query(Flight).filter(Flight.id == "FL-001").first()
        f1.status = "Delayed"
        m1 = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == "SIM-001").first()
        m1.matrix_data = "[[1,1,1,1,1,1]]"
        db.commit()

    # Second run of seeder (simulating backend reboot / re-run)
    with Session() as db:
        seed_database(db)
        # Verify no duplicate records created
        assert db.query(Flight).count() == 6
        assert db.query(Gate).count() == 6
        assert db.query(Simulation).count() == 3
        assert db.query(RestrictionMatrix).count() == 3

        # Verify user modifications were PRESERVED and not overwritten
        f1_check = db.query(Flight).filter(Flight.id == "FL-001").first()
        assert f1_check.status == "Delayed"
        m1_check = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == "SIM-001").first()
        assert m1_check.matrix_data == "[[1,1,1,1,1,1]]"


# -------------------------------------------------------------
# 2. VERIFY FLIGHT PERSISTENCE ACROSS BACKEND RESTARTS
# -------------------------------------------------------------

def test_flight_persistence_across_restart(isolated_db_path):
    """Create a flight with engine 1, dispose engine (shutdown), open engine 2, verify record."""
    engine1 = create_engine(f"sqlite:///{isolated_db_path}", connect_args={"check_same_thread": False})
    Session1 = sessionmaker(bind=engine1)

    with Session1() as db:
        new_flight = Flight(
            id="FL-PERSIST-1",
            flight_number="PS999",
            airline="Persistence Airways",
            aircraft_type="Narrow-Body (A320)",
            arrival_time="11:00",
            departure_time="12:30",
            passenger_capacity=180,
            terminal="T1",
            status="Scheduled"
        )
        db.add(new_flight)
        db.commit()

    # Dispose engine 1 (Simulates complete backend process shutdown)
    engine1.dispose()

    # Engine 2 (Simulates backend restart)
    engine2 = create_engine(f"sqlite:///{isolated_db_path}", connect_args={"check_same_thread": False})
    Session2 = sessionmaker(bind=engine2)

    with Session2() as db:
        flight = db.query(Flight).filter(Flight.id == "FL-PERSIST-1").first()
        assert flight is not None
        assert flight.flight_number == "PS999"
        assert flight.airline == "Persistence Airways"
        assert flight.passenger_capacity == 180

    engine2.dispose()


# -------------------------------------------------------------
# 3. VERIFY SIMULATION & MATRIX PERSISTENCE ACROSS RESTARTS
# -------------------------------------------------------------

def test_simulation_and_matrix_persistence_across_restart(isolated_db_path):
    """Create simulation & restriction matrix, restart backend, confirm exact persistence."""
    engine1 = create_engine(f"sqlite:///{isolated_db_path}", connect_args={"check_same_thread": False})
    Session1 = sessionmaker(bind=engine1)

    custom_matrix = [[1, 0], [0, 1]]

    with Session1() as db:
        sim = Simulation(
            id="SIM-PERSIST-1",
            name="Restart Verification Scenario",
            description="Testing survival across process boundary.",
            status="Ready"
        )
        db.add(sim)
        db.flush()

        db.add(SimulationFlight(simulation_id="SIM-PERSIST-1", flight_id="FL-002"))
        db.add(SimulationFlight(simulation_id="SIM-PERSIST-1", flight_id="FL-003"))
        db.add(SimulationGate(simulation_id="SIM-PERSIST-1", gate_id="GT-001"))
        db.add(SimulationGate(simulation_id="SIM-PERSIST-1", gate_id="GT-002"))

        db.add(RestrictionMatrix(
            simulation_id="SIM-PERSIST-1",
            rows_count=2,
            cols_count=2,
            matrix_data="[[1, 0], [0, 1]]"
        ))
        db.commit()

    # Process shutdown
    engine1.dispose()

    # Process restart
    engine2 = create_engine(f"sqlite:///{isolated_db_path}", connect_args={"check_same_thread": False})
    Session2 = sessionmaker(bind=engine2)

    with Session2() as db:
        sim_check = db.query(Simulation).filter(Simulation.id == "SIM-PERSIST-1").first()
        assert sim_check is not None
        assert sim_check.name == "Restart Verification Scenario"
        assert len(sim_check.selected_flights) == 2
        assert len(sim_check.selected_gates) == 2

        matrix_check = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == "SIM-PERSIST-1").first()
        assert matrix_check is not None
        import json
        assert json.loads(matrix_check.matrix_data) == custom_matrix

    engine2.dispose()


# -------------------------------------------------------------
# 4. VERIFY DUPLICATION INDEPENDENCE VIA API
# -------------------------------------------------------------

def test_simulation_duplication_independence(isolated_db_path):
    """Verify duplication creates distinct, independent associations and restriction matrix."""
    engine = create_engine(f"sqlite:///{isolated_db_path}", connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)

    app = create_app()

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    # 1. Duplicate SIM-PERSIST-1
    res = client.post("/api/v1/simulations/SIM-PERSIST-1/duplicate")
    assert res.status_code == 201
    dup_data = res.json()
    dup_id = dup_data["id"]
    assert dup_id != "SIM-PERSIST-1"
    assert dup_data["name"] == "Restart Verification Scenario (Copy)"

    # 2. Update duplicate's restriction matrix
    new_dup_matrix = [[0, 1], [1, 0]]
    res_update = client.put(f"/api/v1/simulations/{dup_id}/restrictions", json={"matrix": new_dup_matrix})
    assert res_update.status_code == 200

    # 3. Check original scenario's matrix to ensure it remains untouched
    res_orig = client.get("/api/v1/simulations/SIM-PERSIST-1/restrictions")
    assert res_orig.status_code == 200
    assert res_orig.json()["matrix"] == [[1, 0], [0, 1]]

    # 4. Check duplicate's matrix
    res_dup = client.get(f"/api/v1/simulations/{dup_id}/restrictions")
    assert res_dup.status_code == 200
    assert res_dup.json()["matrix"] == new_dup_matrix

    engine.dispose()


# -------------------------------------------------------------
# 5. VERIFY REFERENTIAL INTEGRITY PREVENTS DELETION OF REFERENCED FLIGHT / GATE
# -------------------------------------------------------------

def test_referential_integrity_protection(isolated_db_path):
    """Deleting a flight or gate assigned to an active simulation must return 409 Conflict."""
    engine = create_engine(f"sqlite:///{isolated_db_path}", connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)

    app = create_app()

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    # FL-002 is assigned to SIM-PERSIST-1 -> Deletion must be safely rejected
    res_flight = client.delete("/api/v1/flights/FL-002")
    assert res_flight.status_code == 409
    assert "actively referenced in" in res_flight.text.lower()

    # GT-001 is assigned to SIM-PERSIST-1 -> Deletion must be safely rejected
    res_gate = client.delete("/api/v1/gates/GT-001")
    assert res_gate.status_code == 409
    assert "actively referenced in" in res_gate.text.lower()

    # Verify both records still exist in database
    with Session() as db:
        assert db.query(Flight).filter(Flight.id == "FL-002").first() is not None
        assert db.query(Gate).filter(Gate.id == "GT-001").first() is not None

    engine.dispose()


# -------------------------------------------------------------
# 6. VERIFY SIMULATION CASCADE DELETION
# -------------------------------------------------------------

def test_simulation_cascade_deletion(isolated_db_path):
    """Deleting a simulation must remove its junction rows and restriction matrix without deleting flights/gates."""
    engine = create_engine(f"sqlite:///{isolated_db_path}", connect_args={"check_same_thread": False})
    Session = sessionmaker(bind=engine)

    app = create_app()

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    # Delete SIM-PERSIST-1
    res = client.delete("/api/v1/simulations/SIM-PERSIST-1")
    assert res.status_code == 200

    with Session() as db:
        # Simulation is deleted
        assert db.query(Simulation).filter(Simulation.id == "SIM-PERSIST-1").first() is None

        # Junction links are cascade-deleted
        sim_flights = db.query(SimulationFlight).filter(SimulationFlight.simulation_id == "SIM-PERSIST-1").count()
        assert sim_flights == 0

        sim_gates = db.query(SimulationGate).filter(SimulationGate.simulation_id == "SIM-PERSIST-1").count()
        assert sim_gates == 0

        # Restriction matrix is cascade-deleted
        sim_matrix = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == "SIM-PERSIST-1").count()
        assert sim_matrix == 0

        # The underlying flights and gates themselves remain intact!
        assert db.query(Flight).filter(Flight.id == "FL-002").first() is not None
        assert db.query(Gate).filter(Gate.id == "GT-001").first() is not None

    engine.dispose()
