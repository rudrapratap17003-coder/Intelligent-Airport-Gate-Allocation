"""
GateWise — Phase 4 Backend Integration and Unit Tests.
Covers:
- Scenario categorization & filtering
- Scenario deep duplication with independent data
- Traffic Scenario Generator (low, normal, peak, maintenance)
- Rectangular matrix support in allocation calculations
- Unified 10-step simulation execution pipeline & immutable SimulationRun persistence
- What-If scenario analysis engine with delta computation & zero mutation of baseline
- Bottleneck analysis engine with critical flight/gate detection
"""

import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.connection import get_db, SessionLocal
from app.models.entities import Simulation, SimulationRun, RestrictionMatrix, Flight, Gate


client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_scenario_categories_and_filtering(db_session: Session):
    """Verify that scenarios support category taxonomy and can be filtered."""
    import time
    # List all scenarios
    response = client.get("/api/v1/simulations")
    assert response.status_code == 200
    all_sims = response.json()
    assert len(all_sims) > 0
    assert "category" in all_sims[0]

    # Create a scenario with specific category
    payload = {
        "name": f"Phase 4 Category Test - {int(time.time() * 1000)}",
        "description": "Testing category taxonomy",
        "category": "Peak-Hour Traffic",
        "selected_flight_ids": ["FL-001", "FL-002"],
        "selected_gate_ids": ["GT-001", "GT-002"]
    }
    create_resp = client.post("/api/v1/simulations", json=payload)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert created["category"] == "Peak-Hour Traffic"

    # Filter by category
    filter_resp = client.get("/api/v1/simulations?category=Peak-Hour Traffic")
    assert filter_resp.status_code == 200
    filtered_sims = filter_resp.json()
    assert any(s["id"] == created["id"] for s in filtered_sims)
    assert all(s["category"] == "Peak-Hour Traffic" for s in filtered_sims)

    # Cleanup
    client.delete(f"/api/v1/simulations/{created['id']}")


def test_scenario_duplication_independent_matrix(db_session: Session):
    """Verify scenario cloning creates independent flight/gate and restriction matrix copies."""
    dup_resp = client.post("/api/v1/simulations/SIM-001/duplicate")
    assert dup_resp.status_code == 201
    dup_sim = dup_resp.json()
    dup_id = dup_sim["id"]

    assert dup_id != "SIM-001"
    assert "Copy" in dup_sim["name"]
    assert len(dup_sim["selected_flight_ids"]) == 6
    assert len(dup_sim["selected_gate_ids"]) == 6

    # Verify duplicated restriction matrix exists and is independent
    mat_resp = client.get(f"/api/v1/restrictions/{dup_id}")
    assert mat_resp.status_code == 200
    dup_matrix = mat_resp.json()["matrix"]
    assert len(dup_matrix) == 6
    assert len(dup_matrix[0]) == 6

    # Modify duplicated matrix
    dup_matrix[0][0] = 1
    update_resp = client.put(f"/api/v1/restrictions/{dup_id}", json={"matrix": dup_matrix})
    assert update_resp.status_code == 200

    # Ensure baseline SIM-001 was NOT affected
    baseline_mat_resp = client.get("/api/v1/restrictions/SIM-001")
    assert baseline_mat_resp.status_code == 200
    baseline_matrix = baseline_mat_resp.json()["matrix"]
    assert baseline_matrix[0][0] == 0  # Still 0 in baseline!

    # Cleanup
    client.delete(f"/api/v1/simulations/{dup_id}")


def test_traffic_generator_scenarios(db_session: Session):
    """Verify reproducible traffic generation across various profiles."""
    profiles = ["low", "normal", "peak", "maintenance"]
    created_ids = []

    import time
    for prof in profiles:
        payload = {
            "scenario_name": f"Traffic Gen Test - {prof.title()} - {int(time.time() * 1000)}",
            "profile": prof,
            "density": "moderate"
        }
        resp = client.post("/api/v1/simulations/generate-traffic", json=payload)
        assert resp.status_code == 201, f"Failed for profile {prof}: {resp.text}"
        sim_data = resp.json()
        created_ids.append(sim_data["id"])

        if prof == "low":
            assert len(sim_data["selected_flight_ids"]) == 4
            assert len(sim_data["selected_gate_ids"]) == 6
            assert sim_data["category"] == "Low-Traffic"
        elif prof == "normal":
            assert len(sim_data["selected_flight_ids"]) == 6
            assert len(sim_data["selected_gate_ids"]) == 6
            assert sim_data["category"] == "Normal Operations"
        elif prof == "peak":
            assert len(sim_data["selected_flight_ids"]) == 8
            assert len(sim_data["selected_gate_ids"]) == 8
            assert sim_data["category"] == "Peak-Hour Traffic"

    # Cleanup
    for s_id in created_ids:
        client.delete(f"/api/v1/simulations/{s_id}")


def test_rectangular_matrix_simulation_pipeline(db_session: Session):
    """Verify rectangular m x n matrices calculate exact PIE without 422 error."""
    import time
    # Create rectangular scenario: 4 flights, 6 gates
    payload = {
        "scenario_name": f"Phase 4 Rectangular 4x6 Scenario - {int(time.time() * 1000)}",
        "profile": "low"
    }
    resp = client.post("/api/v1/simulations/generate-traffic", json=payload)
    assert resp.status_code == 201
    sim_id = resp.json()["id"]

    # Calculate via allocations route
    calc_resp = client.get(f"/api/v1/simulations/{sim_id}/calculate")
    assert calc_resp.status_code == 200, f"Rectangular calculation rejected: {calc_resp.text}"
    calc_data = calc_resp.json()
    assert calc_data["valid_assignments"] > 0
    assert calc_data["is_square"] is False
    assert calc_data["num_rows"] == 4
    assert calc_data["num_cols"] == 6

    # Execute full pipeline
    run_resp = client.post(f"/api/v1/simulations/{sim_id}/run")
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["status"] == "Completed"
    assert run_data["pie_valid_allocations"] == calc_data["valid_assignments"]
    assert run_data["matrix_rows"] == 4
    assert run_data["matrix_cols"] == 6

    # Cleanup
    client.delete(f"/api/v1/simulations/{sim_id}")


def test_what_if_analysis_engine(db_session: Session):
    """Verify What-If hypothetical evaluation, deltas, and zero mutation of baseline."""
    # Disable gate GT-003 on SIM-001
    payload = {
        "disabled_gate_ids": ["GT-003"]
    }
    resp = client.post("/api/v1/simulations/SIM-001/what-if", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["simulation_id"] == "SIM-001"
    assert data["baseline"]["valid_assignments"] == 309
    assert data["hypothetical"]["valid_assignments"] < 309
    assert data["delta_valid_allocations"] < 0
    assert data["percentage_change"] < 0
    assert len(data["explanations"]) > 0

    # Test complete deadlock hypothetical (disable all gates)
    payload_deadlock = {
        "disabled_gate_ids": ["GT-001", "GT-002", "GT-003", "GT-004", "GT-005", "GT-006"]
    }
    resp_deadlock = client.post("/api/v1/simulations/SIM-001/what-if", json=payload_deadlock)
    assert resp_deadlock.status_code == 200
    deadlock_data = resp_deadlock.json()
    assert deadlock_data["hypothetical"]["valid_assignments"] == 0
    assert deadlock_data["impact_level"] == "CRITICAL"

    # Verify baseline in DB was NEVER changed
    check_sim = client.get("/api/v1/simulations/SIM-001").json()
    assert check_sim["id"] == "SIM-001"
    baseline_calc = client.get("/api/v1/simulations/SIM-001/calculate").json()
    assert baseline_calc["valid_assignments"] == 309


def test_bottleneck_analysis_engine():
    """Verify bottleneck diagnosis discovers critical flights and gate contention."""
    resp = client.get("/api/v1/simulations/SIM-001/bottlenecks")
    assert resp.status_code == 200
    data = resp.json()

    assert data["simulation_id"] == "SIM-001"
    assert data["matrix_rows"] == 6
    assert data["matrix_cols"] == 6
    assert len(data["flight_stats"]) == 6
    assert len(data["gate_stats"]) == 6
    assert "recommendations" in data
    assert isinstance(data["bottlenecks"], list)


def test_simulation_run_history_persistence(db_session: Session):
    """Verify that execution runs create immutable records in SimulationRun."""
    # Execute a run for SIM-001
    run_resp = client.post("/api/v1/simulations/SIM-001/run?max_allocations=25", json={"notes": "Benchmark audit run"})
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    run_id = run_data["run_id"]

    # Query simulation runs list
    list_resp = client.get("/api/v1/simulations/SIM-001/runs")
    assert list_resp.status_code == 200
    runs = list_resp.json()
    assert any(r["id"] == run_id for r in runs)

    # Query single run snapshot
    single_resp = client.get(f"/api/v1/simulations/runs/{run_id}")
    assert single_resp.status_code == 200
    single_run = single_resp.json()
    assert single_run["id"] == run_id
    assert single_run["simulation_id"] == "SIM-001"
    assert single_run["pie_valid_allocations"] == 309
    assert single_run["duration_ms"] > 0
    assert single_run["matrix_snapshot"] is not None
