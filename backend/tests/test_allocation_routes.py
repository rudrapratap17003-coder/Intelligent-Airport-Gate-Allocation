"""
Tests for API v1 Allocation and Calculation Routes.
Verifies integration of Rook Polynomial, Inclusion-Exclusion,
Backtracking Generator, and Conflict Detector endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_calculate_simulation_endpoint():
    """Verify calculating mathematical PIE values for SIM-001 returns exact 309 valid assignments."""
    response = client.get("/api/v1/simulations/SIM-001/calculate")
    assert response.status_code == 200
    data = response.json()
    assert data["matrix_size"] == 6
    assert data["total_possible_assignments"] == 720
    assert data["valid_assignments"] == 309
    assert data["invalid_assignments"] == 411
    assert len(data["rook_coefficients"]) > 0


def test_generate_simulation_allocations_endpoint():
    """Verify generating allocations for SIM-001 with max_results=10."""
    response = client.get("/api/v1/simulations/SIM-001/allocations?max_results=10")
    assert response.status_code == 200
    data = response.json()
    assert data["matrix_size"] == 6
    assert data["total_possible_assignments"] == 720
    assert data["total_valid_assignments"] == 309
    assert data["generated_count"] == 10
    assert data["max_results"] == 10
    assert data["generation_complete"] is False
    assert data["has_more"] is True
    assert len(data["allocations"]) == 10

    # Verify each allocation was independently audited by the conflict detector
    for alloc in data["allocations"]:
        assert alloc["validation"] is not None
        assert alloc["validation"]["is_valid"] is True
        assert alloc["validation"]["total_conflicts"] == 0
        assert alloc["validation"]["checked_assignments"] == 6


def test_generate_allocations_not_found():
    """Verify 404 is returned for non-existent simulation."""
    response = client.get("/api/v1/simulations/SIM-NONEXISTENT/allocations")
    assert response.status_code == 404


def test_generate_allocations_invalid_max_results():
    """Verify 422 is returned for invalid max_results."""
    response = client.get("/api/v1/simulations/SIM-001/allocations?max_results=0")
    assert response.status_code == 422

    response2 = client.get("/api/v1/simulations/SIM-001/allocations?max_results=50000")
    assert response2.status_code == 422


def test_validate_arbitrary_allocation_endpoint():
    """Verify standalone allocation validation endpoint."""
    payload = {
        "matrix": [
            [0, 1],
            [0, 0]
        ],
        "flight_ids": ["F1", "F2"],
        "gate_ids": ["G1", "G2"],
        "allocation": [
            {"flight_id": "F1", "gate_id": "G2"},  # Forbidden!
            {"flight_id": "F2", "gate_id": "G1"}
        ]
    }
    response = client.post("/api/v1/allocations/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert data["total_conflicts"] == 1
    assert data["conflicts"][0]["conflict_type"] == "FORBIDDEN_ASSIGNMENT"
