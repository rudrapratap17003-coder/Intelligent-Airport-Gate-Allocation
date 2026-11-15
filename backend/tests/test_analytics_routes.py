"""
GateWise — Analytics & Mathematical Insights Route Tests (Phase 22).
Verifies:
1. Aggregated analytics overview across all database simulations.
2. Density, feasibility, and combinatorial metrics calculation.
3. Extrema detection (highest/lowest feasibility).
4. Rook polynomial coefficient interpretations r0..rn.
5. Inclusion-exclusion term breakdowns with positive/negative contributions.
6. Allocation sample generation and independent conflict verification in analytics.
7. Verification across sparse, dense, unrestricted, and fully forbidden matrices.
8. Error handling for unbalanced configurations and non-existent simulations.
"""

import json
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.connection import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db_initialized():
    """Ensure DB and seeds are in place."""
    init_db()


def test_analytics_overview_live():
    """Test GET /api/v1/analytics/overview returns aggregated mathematical statistics."""
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    data = response.json()

    assert data["total_simulations"] >= 1
    assert data["valid_simulations_count"] >= 1
    assert data["total_flights"] >= 6
    assert data["total_gates"] >= 6
    assert data["average_restriction_density"] >= 0.0
    assert data["feasible_simulations_count"] >= 1

    # Extrema
    assert data["highest_feasibility"] is not None
    assert data["highest_feasibility"]["feasibility_percentage"] > 0
    assert data["lowest_feasibility"] is not None

    # Simulations list
    sim_items = data["simulations"]
    assert len(sim_items) >= 1
    sim1 = next((s for s in sim_items if s["id"] == "SIM-001"), None)
    assert sim1 is not None
    assert sim1["is_valid_config"] is True
    assert sim1["matrix_size"] == 6
    assert sim1["total_possible_assignments"] == 720
    assert sim1["exact_valid_assignments"] == 309
    assert sim1["forbidden_count"] == 5
    assert sim1["allowed_count"] == 31
    assert sim1["is_feasible"] is True


def test_simulation_detailed_analytics_sim001():
    """Test GET /api/v1/analytics/simulations/SIM-001 returns exact Rook and PIE breakdowns."""
    response = client.get("/api/v1/analytics/simulations/SIM-001")
    assert response.status_code == 200
    data = response.json()

    assert data["simulation_id"] == "SIM-001"
    assert data["matrix_size"] == 6
    assert data["total_possible_assignments"] == 720
    assert data["exact_valid_assignments"] == 309
    assert data["forbidden_count"] == 5
    assert data["allowed_count"] == 31
    assert data["is_feasible"] is True

    # Rook polynomial coefficients detail
    coeffs = data["coefficients_detail"]
    assert len(coeffs) >= 1
    assert coeffs[0]["k"] == 0
    assert coeffs[0]["coefficient"] == 1
    assert "r₀ = 1" in coeffs[0]["meaning"]
    assert coeffs[1]["k"] == 1
    assert coeffs[1]["coefficient"] == 5

    # PIE terms detail
    pie_terms = data["pie_terms_detail"]
    assert len(pie_terms) >= 1
    assert pie_terms[0]["k"] == 0
    assert pie_terms[0]["sign"] == 1
    assert pie_terms[0]["contribution"] == 720

    # Alternating contributions
    pos_sum = data["positive_contributions_sum"]
    neg_sum = data["negative_contributions_sum"]
    assert pos_sum - neg_sum == 309


def test_simulation_detailed_analytics_with_sample_allocation():
    """Test GET /api/v1/analytics/simulations/SIM-001?include_sample=true."""
    response = client.get("/api/v1/analytics/simulations/SIM-001?include_sample=true&sample_limit=25")
    assert response.status_code == 200
    data = response.json()

    assert data["allocation_analytics"] is not None
    alloc = data["allocation_analytics"]
    assert alloc["generated_count"] == 25
    assert alloc["max_requested"] == 25
    assert alloc["independently_validated"] == 25
    assert alloc["valid_count"] == 25
    assert alloc["invalid_count"] == 0
    assert alloc["generation_complete"] is False  # 25 < 309


def test_analytics_nonexistent_simulation():
    """Test 404 on nonexistent simulation."""
    response = client.get("/api/v1/analytics/simulations/NONEXISTENT_999")
    assert response.status_code == 404


def test_analytics_edge_cases_unrestricted_and_fully_forbidden():
    """Test analytics calculations on unrestricted and fully forbidden scenarios."""
    # 1. Create a 3x3 scenario with 0 restrictions (Unrestricted)
    unrestricted_sim_payload = {
        "name": "Test Unrestricted Analytics Scenario",
        "description": "0 restrictions",
        "selected_flight_ids": ["FL-001", "FL-002", "FL-003"],
        "selected_gate_ids": ["GT-001", "GT-002", "GT-003"]
    }
    create_res = client.post("/api/v1/simulations", json=unrestricted_sim_payload)
    assert create_res.status_code == 201
    sim_id = create_res.json()["id"]

    try:
        # Default matrix is 0s
        ana_res = client.get(f"/api/v1/analytics/simulations/{sim_id}")
        assert ana_res.status_code == 200
        ana_data = ana_res.json()
        assert ana_data["matrix_size"] == 3
        assert ana_data["total_possible_assignments"] == 6  # 3!
        assert ana_data["exact_valid_assignments"] == 6  # 100% feasible
        assert ana_data["forbidden_count"] == 0
        assert ana_data["feasibility_percentage"] == 100.0
        assert ana_data["is_feasible"] is True

        # 2. Update to Fully Forbidden Matrix (All 1s)
        full_forbidden_matrix = [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
        update_matrix_res = client.put(f"/api/v1/simulations/{sim_id}/restrictions", json={"matrix": full_forbidden_matrix})
        assert update_matrix_res.status_code == 200

        ana_res2 = client.get(f"/api/v1/analytics/simulations/{sim_id}")
        assert ana_res2.status_code == 200
        ana_data2 = ana_res2.json()
        assert ana_data2["forbidden_count"] == 9
        assert ana_data2["restriction_density"] == 100.0
        assert ana_data2["exact_valid_assignments"] == 0
        assert ana_data2["feasibility_percentage"] == 0.0
        assert ana_data2["is_feasible"] is False
    finally:
        # Clean up
        client.delete(f"/api/v1/simulations/{sim_id}")
