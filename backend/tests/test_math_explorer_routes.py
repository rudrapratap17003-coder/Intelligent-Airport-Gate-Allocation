"""
Tests for GateWise Phase 24 — Mathematics Explorer endpoints (/api/v1/math).
Verifies ad-hoc matrix evaluation, rook polynomials, PIE terms, and permutation exploration.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_explore_permutations_valid():
    """Verify factorial and permutation exploration for n=4."""
    response = client.get("/api/v1/math/permutations/4")
    assert response.status_code == 200
    data = response.json()
    assert data["n"] == 4
    assert data["factorial"] == 24
    assert len(data["growth_table"]) == 8
    assert len(data["sample_permutations"]) == 24
    assert [0, 1, 2, 3] in data["sample_permutations"]


def test_explore_permutations_out_of_bounds():
    """Verify validation error when n is out of range."""
    response = client.get("/api/v1/math/permutations/9")
    assert response.status_code == 422


def test_evaluate_ad_hoc_matrix_empty():
    """Verify evaluation of a 3x3 unrestricted board (all 0s)."""
    payload = {
        "matrix": [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ],
        "include_sample_allocations": True,
        "max_sample_allocations": 5
    }
    response = client.post("/api/v1/math/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["matrix_size"] == 3
    assert data["forbidden_cell_count"] == 0
    assert data["restriction_density"] == 0.0
    assert data["total_possible_assignments"] == 6
    assert data["valid_assignments"] == 6
    assert data["invalid_assignments"] == 0
    assert data["feasibility_percentage"] == 100.0
    assert data["rook_coefficients"] == [1]
    assert len(data["sample_allocations"]) == 5


def test_evaluate_ad_hoc_matrix_derangement():
    """Verify evaluation of a 3x3 derangement board (diagonal 1s)."""
    payload = {
        "matrix": [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ],
        "include_sample_allocations": True
    }
    response = client.post("/api/v1/math/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["matrix_size"] == 3
    assert data["forbidden_cell_count"] == 3
    # For D_3: !3 = 2 derangements
    assert data["valid_assignments"] == 2
    # R(B, x) = 1 + 3x + 3x^2 + x^3
    assert data["rook_coefficients"] == [1, 3, 3, 1]
    assert len(data["sample_allocations"]) == 2


def test_evaluate_ad_hoc_matrix_fully_forbidden():
    """Verify evaluation of a fully forbidden board (all 1s)."""
    payload = {
        "matrix": [
            [1, 1],
            [1, 1]
        ]
    }
    response = client.post("/api/v1/math/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["matrix_size"] == 2
    assert data["valid_assignments"] == 0
    assert data["feasibility_percentage"] == 0.0


def test_evaluate_ad_hoc_matrix_invalid_dimensions():
    """Verify rejection of non-square matrix."""
    payload = {
        "matrix": [
            [1, 0, 0],
            [0, 1, 0]
        ]
    }
    response = client.post("/api/v1/math/evaluate", json=payload)
    assert response.status_code == 422
