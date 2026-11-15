"""
GateWise — Scenario Comparison Route Tests (Phase 23).
Verifies:
1. Side-by-side comparison of 2 or more scenarios.
2. Comparison across matching dimensions (6x6 vs 6x6) with cell-by-cell matrix diff.
3. Comparison across differing dimensions (6x6 vs 3x3) with dimension incompatibility handling.
4. Duplicate scenario ID handling and validation for <2 scenarios.
5. Non-existent scenario error handling.
6. Rule-based mathematical insight generation.
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


def test_compare_scenarios_compatible_dimensions():
    """Test comparing SIM-001 and its clone (both 6x6)."""
    dup_res = client.post("/api/v1/simulations/SIM-001/duplicate")
    assert dup_res.status_code == 201
    dup_id = dup_res.json()["id"]

    try:
        payload = {"simulation_ids": ["SIM-001", dup_id]}
        response = client.post("/api/v1/comparison", json=payload)
        assert response.status_code == 200
        data = response.json()

        assert len(data["scenarios"]) == 2
        assert data["are_dimensions_compatible"] is True

        # Matrix comparison
        mat_comp = data["matrix_comparison"]
        assert mat_comp is not None
        assert mat_comp["is_compatible"] is True
        assert mat_comp["dimension"] == 6
        assert mat_comp["difference_matrix"] is not None
        assert len(mat_comp["difference_matrix"]) == 6
        assert mat_comp["different_cells_count"] == 0
        assert mat_comp["identical_cells_count"] == 36

        # Insights
        insights = data["insights"]
        assert len(insights) >= 1
        types = [i["type"] for i in insights]
        assert "STRUCTURE" in types
    finally:
        client.delete(f"/api/v1/simulations/{dup_id}")


def test_compare_scenarios_differing_dimensions():
    """Test comparing SIM-001 (6x6) and SIM-002 (3x3)."""
    payload = {"simulation_ids": ["SIM-001", "SIM-002"]}
    response = client.post("/api/v1/comparison", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert len(data["scenarios"]) == 2
    assert data["are_dimensions_compatible"] is False
    assert data["matrix_comparison"]["is_compatible"] is False
    assert "differing board dimensions" in data["matrix_comparison"]["explanation"]


def test_compare_scenarios_insufficient_ids():
    """Test error when fewer than 2 scenario IDs provided."""
    payload = {"simulation_ids": ["SIM-001"]}
    response = client.post("/api/v1/comparison", json=payload)
    assert response.status_code == 422


def test_compare_scenarios_duplicate_ids():
    """Test error when identical scenario IDs provided resulting in <2 unique."""
    payload = {"simulation_ids": ["SIM-001", "SIM-001"]}
    response = client.post("/api/v1/comparison", json=payload)
    assert response.status_code == 422


def test_compare_scenarios_nonexistent_id():
    """Test 404 when nonexistent simulation ID provided."""
    payload = {"simulation_ids": ["SIM-001", "NONEXISTENT_999"]}
    response = client.post("/api/v1/comparison", json=payload)
    assert response.status_code == 404
