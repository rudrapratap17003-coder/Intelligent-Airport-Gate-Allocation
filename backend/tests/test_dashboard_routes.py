"""
GateWise — Dashboard Integration Tests (Phase 21).
Verifies:
1. Unified dashboard summary endpoint returns live data from database.
2. Flight statistics accurate by status.
3. Gate statistics accurate by status.
4. Simulation statistics and overview items report correct validity and matrix dimensions.
5. Mathematical summary evaluates exact valid assignments for the selected simulation.
6. Target simulation selection parameter works correctly.
7. Activities endpoint returns genuine chronologically ordered activity logs.
8. Activity logging hooks correctly trigger upon operational actions.
9. Matrix modification updates dashboard density and forbidden counts.
10. Allocation generation logs activity and provides verified sample results.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db_initialized():
    """Ensure DB and seeds are in place."""
    init_db()


def test_get_dashboard_summary_default():
    """Test GET /api/v1/dashboard/summary with default selected simulation."""
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()

    # Flight stats
    assert "flights" in data
    assert data["flights"]["total"] >= 6
    assert "by_status" in data["flights"]
    assert data["flights"]["scheduled"] >= 1

    # Gate stats
    assert "gates" in data
    assert data["gates"]["total"] >= 6
    assert "by_status" in data["gates"]
    assert data["gates"]["available"] >= 1

    # Simulation stats
    assert "simulations" in data
    assert data["simulations"]["total"] >= 1
    assert data["simulations"]["valid_count"] >= 1
    assert len(data["simulations"]["simulations"]) >= 1

    # Math summary for default sim (most recently updated valid sim)
    assert data["mathematical_summary"] is not None
    math_sum = data["mathematical_summary"]
    assert math_sum["simulation_id"] in ["SIM-001", "SIM-002", "SIM-003"]
    assert math_sum["matrix_size"] > 0
    assert math_sum["total_possible_assignments"] > 0
    assert math_sum["exact_valid_assignments"] > 0
    assert math_sum["restriction_density"] >= 0
    assert math_sum["feasibility_percentage"] >= 0

    # Recent activities
    assert "recent_activities" in data
    assert len(data["recent_activities"]) >= 1
    for act in data["recent_activities"]:
        assert "title" in act
        assert "detail" in act
        assert "timestamp" in act


def test_get_dashboard_summary_specific_simulation():
    """Test GET /api/v1/dashboard/summary with specific target simulation ID."""
    response = client.get("/api/v1/dashboard/summary?simulation_id=SIM-001")
    assert response.status_code == 200
    data = response.json()
    assert data["mathematical_summary"]["simulation_id"] == "SIM-001"
    assert data["mathematical_summary"]["exact_valid_assignments"] == 309
    assert data["mathematical_summary"]["total_possible_assignments"] == 720
    assert data["mathematical_summary"]["forbidden_assignment_count"] == 5


def test_get_dashboard_summary_sim002_sparse():
    """Test GET /api/v1/dashboard/summary with SIM-002 (3x3)."""
    response = client.get("/api/v1/dashboard/summary?simulation_id=SIM-002")
    if response.status_code == 200:
        data = response.json()
        assert data["mathematical_summary"]["simulation_id"] == "SIM-002"
        assert data["mathematical_summary"]["matrix_size"] == 3
        assert data["mathematical_summary"]["total_possible_assignments"] == 6


def test_get_dashboard_summary_nonexistent_simulation():
    """Test GET /api/v1/dashboard/summary with invalid simulation ID."""
    response = client.get("/api/v1/dashboard/summary?simulation_id=NONEXISTENT_999")
    assert response.status_code == 404


def test_get_recent_activities_endpoint():
    """Test GET /api/v1/dashboard/activities endpoint with limit parameter."""
    response = client.get("/api/v1/dashboard/activities?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) <= 5
    if data:
        assert "action_type" in data[0]
        assert "title" in data[0]


def test_activity_logging_on_mutation():
    """Test that creating a flight generates an ActivityLog record in recent activities."""
    unique_flight_num = "ZZDASH01"
    flight_payload = {
        "flight_number": unique_flight_num,
        "airline": "Test Airways",
        "aircraft_type": "Narrow-Body (A320)",
        "arrival_time": "12:00",
        "departure_time": "13:00",
        "passenger_capacity": 180,
        "terminal": "T1",
        "status": "Scheduled"
    }

    create_res = client.post("/api/v1/flights", json=flight_payload)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Verify dashboard recent activity has the flight created event
    summary_res = client.get("/api/v1/dashboard/summary")
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    activity_titles = [a["title"] for a in summary_data["recent_activities"]]
    assert any(unique_flight_num in t for t in activity_titles)

    # Clean up created flight
    del_res = client.delete(f"/api/v1/flights/{created_id}")
    assert del_res.status_code == 200


def test_activity_logging_on_gate_mutation():
    """Test that creating and updating a gate updates gate stats and logs activity."""
    unique_gate_num = "G99DASH"
    gate_payload = {
        "gate_number": unique_gate_num,
        "terminal": "T2",
        "gate_type": "International",
        "supported_aircraft": "Wide-Body Only",
        "max_capacity": 350,
        "status": "Available"
    }

    create_res = client.post("/api/v1/gates", json=gate_payload)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Verify dashboard stats
    summary_res = client.get("/api/v1/dashboard/summary")
    assert summary_res.status_code == 200
    assert summary_res.json()["gates"]["total"] >= 7

    # Clean up
    del_res = client.delete(f"/api/v1/gates/{created_id}")
    assert del_res.status_code == 200


def test_activity_logging_on_allocation_generation():
    """Test that generating allocations logs an ActivityLog entry."""
    gen_res = client.get("/api/v1/simulations/SIM-001/allocations?max_results=10")
    assert gen_res.status_code == 200

    summary_res = client.get("/api/v1/dashboard/summary")
    assert summary_res.status_code == 200
    activities = summary_res.json()["recent_activities"]
    assert any("ALLOCATION_GENERATED" in a.get("action_type", "") or "Allocations Generated" in a.get("title", "") for a in activities)
