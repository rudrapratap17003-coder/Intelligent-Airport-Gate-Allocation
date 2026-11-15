"""
GateWise — Comprehensive Database & API v1 Test Suite.
Tests Flights, Gates, Simulations, Linkages, Duplication, and Restrictions with an isolated in-memory DB.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.connection import Base, get_db
from app.main import app

# Setup isolated test in-memory SQLite database
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


# ==================== FLIGHT TESTS ====================

def test_flight_crud():
    # 1. Create Flight
    flight_data = {
        "id": "FL-TEST-1",
        "flight_number": "AI999",
        "airline": "Air India Test",
        "aircraft_type": "Wide-Body (B777)",
        "arrival_time": "10:00",
        "departure_time": "12:00",
        "passenger_capacity": 300,
        "terminal": "T2",
        "status": "Scheduled"
    }
    create_res = client.post("/api/v1/flights", json=flight_data)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["flight_number"] == "AI999"
    assert created["id"] == "FL-TEST-1"

    # 2. Duplicate Flight Number Prevention
    dup_res = client.post("/api/v1/flights", json=flight_data)
    assert dup_res.status_code == 409

    # 3. List Flights
    list_res = client.get("/api/v1/flights")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 4. Get Flight by ID
    get_res = client.get("/api/v1/flights/FL-TEST-1")
    assert get_res.status_code == 200
    assert get_res.json()["airline"] == "Air India Test"

    # 5. Update Flight
    update_res = client.put("/api/v1/flights/FL-TEST-1", json={"airline": "Air India Express"})
    assert update_res.status_code == 200
    assert update_res.json()["airline"] == "Air India Express"

    # 6. Delete Flight
    del_res = client.delete("/api/v1/flights/FL-TEST-1")
    assert del_res.status_code == 200
    assert client.get("/api/v1/flights/FL-TEST-1").status_code == 404


# ==================== GATE TESTS ====================

def test_gate_crud():
    # 1. Create Gate
    gate_data = {
        "id": "GT-TEST-1",
        "gate_number": "G99",
        "terminal": "T2",
        "gate_type": "International",
        "supported_aircraft": "Wide-Body Only",
        "max_capacity": 500,
        "status": "Available"
    }
    create_res = client.post("/api/v1/gates", json=gate_data)
    assert create_res.status_code == 201
    assert create_res.json()["gate_number"] == "G99"

    # 2. Duplicate Gate Prevention
    dup_res = client.post("/api/v1/gates", json=gate_data)
    assert dup_res.status_code == 409

    # 3. List Gates
    assert len(client.get("/api/v1/gates").json()) == 1

    # 4. Update Gate
    up_res = client.put("/api/v1/gates/GT-TEST-1", json={"max_capacity": 550})
    assert up_res.status_code == 200
    assert up_res.json()["max_capacity"] == 550

    # 5. Delete Gate
    assert client.delete("/api/v1/gates/GT-TEST-1").status_code == 200
    assert client.get("/api/v1/gates/GT-TEST-1").status_code == 404


# ==================== SIMULATION & RESTRICTIONS TESTS ====================

def test_simulation_workflow():
    # Register 2 flights and 2 gates first
    client.post("/api/v1/flights", json={
        "id": "F1", "flight_number": "F101", "airline": "A1", "aircraft_type": "T1",
        "arrival_time": "08:00", "departure_time": "09:00", "passenger_capacity": 150
    })
    client.post("/api/v1/flights", json={
        "id": "F2", "flight_number": "F102", "airline": "A2", "aircraft_type": "T2",
        "arrival_time": "08:30", "departure_time": "09:30", "passenger_capacity": 180
    })
    client.post("/api/v1/gates", json={
        "id": "G1", "gate_number": "G1", "terminal": "T1", "gate_type": "Domestic",
        "supported_aircraft": "Narrow-Body Only", "max_capacity": 200
    })
    client.post("/api/v1/gates", json={
        "id": "G2", "gate_number": "G2", "terminal": "T1", "gate_type": "Domestic",
        "supported_aircraft": "Narrow-Body Only", "max_capacity": 200
    })

    # 1. Create Simulation
    sim_payload = {
        "id": "SIM-TEST-1",
        "name": "Test Scenario 2x2",
        "description": "2 flights and 2 gates",
        "selected_flight_ids": ["F1", "F2"],
        "selected_gate_ids": ["G1", "G2"]
    }
    sim_res = client.post("/api/v1/simulations", json=sim_payload)
    assert sim_res.status_code == 201
    sim = sim_res.json()
    assert sim["name"] == "Test Scenario 2x2"
    assert sim["status"] == "Ready"
    assert len(sim["selected_flight_ids"]) == 2
    assert len(sim["selected_gate_ids"]) == 2

    # 2. Verify Initial Restriction Matrix Auto-Created
    restr_res = client.get("/api/v1/simulations/SIM-TEST-1/restrictions")
    assert restr_res.status_code == 200
    r_data = restr_res.json()
    assert r_data["rows_count"] == 2
    assert r_data["cols_count"] == 2
    assert r_data["matrix"] == [[0, 0], [0, 0]]

    # 3. Update Restriction Matrix
    updated_matrix = [[0, 1], [1, 0]]
    up_restr_res = client.put("/api/v1/simulations/SIM-TEST-1/restrictions", json={"matrix": updated_matrix})
    assert up_restr_res.status_code == 200
    assert up_restr_res.json()["matrix"] == updated_matrix

    # 4. Referential Integrity: Attempting to delete linked flight should be blocked
    del_flight_res = client.delete("/api/v1/flights/F1")
    assert del_flight_res.status_code == 409

    # 5. Duplicate Simulation
    dup_sim_res = client.post("/api/v1/simulations/SIM-TEST-1/duplicate")
    assert dup_sim_res.status_code == 201
    dup_sim = dup_sim_res.json()
    assert "Copy" in dup_sim["name"]
    # Verify cloned restriction matrix
    cloned_restr = client.get(f"/api/v1/simulations/{dup_sim['id']}/restrictions").json()
    assert cloned_restr["matrix"] == updated_matrix

    # 6. Delete Simulation (Should cascade delete link records and matrix)
    del_sim_res = client.delete("/api/v1/simulations/SIM-TEST-1")
    assert del_sim_res.status_code == 200
    assert client.get("/api/v1/simulations/SIM-TEST-1").status_code == 404

    # Now that SIM-TEST-1 is deleted, F1 can be deleted if not in dup_sim
    # (F1 is still in dup_sim, so it should still be protected)
    assert client.delete("/api/v1/flights/F1").status_code == 409
