"""
Tests verifying backend API and database persistence of restriction matrix identity metadata
(rowFlightIds and columnGateIds) for Phase 10 correctness audit.
"""

import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.connection import get_db
from app.models.entities import RestrictionMatrix

client = TestClient(app)


def test_restrictions_backend_persistence_workflow():
    """
    Step-by-step test for the user-requested audit workflow:
    1. Save a restriction matrix with rowFlightIds and columnGateIds while backend is online.
    2. Confirm backend response contains matrix, rowFlightIds, and columnGateIds.
    3. Simulate application reload / DB fetch.
    4. Fetch the matrix again from the backend.
    5. Verify both identity arrays are preserved.
    """
    sim_id = "SIM-001"
    flights = ["FL-001", "FL-002", "FL-003", "FL-004", "FL-005", "FL-006"]
    gates = ["GT-001", "GT-002", "GT-003", "GT-004", "GT-005", "GT-006"]

    matrix_data = [
        [0, 1, 0, 0, 0, 0],  # AI101 forbidden at G2
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [1, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0]
    ]

    payload = {
        "matrix": matrix_data,
        "rowFlightIds": flights,
        "columnGateIds": gates
    }

    try:
        # 1. Save restriction matrix
        put_res = client.put(f"/api/v1/simulations/{sim_id}/restrictions", json=payload)
        assert put_res.status_code == 200, f"Expected 200, got {put_res.status_code}: {put_res.text}"

        # 2. Confirm backend response contains matrix, rowFlightIds, and columnGateIds
        data = put_res.json()
        assert "matrix" in data
        assert "rowFlightIds" in data
        assert "columnGateIds" in data
        assert data["rowFlightIds"] == flights
        assert data["columnGateIds"] == gates
        assert data["matrix"][0][1] == 1  # FL-001 at GT-002

        # 3 & 4. Fetch the matrix again from backend (simulating refresh)
        get_res = client.get(f"/api/v1/simulations/{sim_id}/restrictions")
        assert get_res.status_code == 200
        fetched_data = get_res.json()

        # 5. Verify that both identity arrays are preserved
        assert fetched_data["rowFlightIds"] == flights
        assert fetched_data["columnGateIds"] == gates
        assert fetched_data["matrix"] == matrix_data

        # Also verify direct database columns
        db: Session = next(get_db())
        try:
            matrix_rec = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
            assert matrix_rec is not None
            assert matrix_rec.row_flight_ids is not None
            assert json.loads(matrix_rec.row_flight_ids) == flights
            assert matrix_rec.column_gate_ids is not None
            assert json.loads(matrix_rec.column_gate_ids) == gates
        finally:
            db.close()
    finally:
        # Restore SIM-001 benchmark
        client.put(f"/api/v1/simulations/{sim_id}/restrictions", json=payload)


def test_restrictions_backend_reordering_association():
    """
    6. Reorder flights and gates and verify that restrictions remain associated
    with their original flight-gate pairs.
    """
    sim_id = "SIM-002"
    orig_flights = ["FL-002", "FL-003", "FL-004"]
    orig_gates = ["GT-001", "GT-002", "GT-003"]
    orig_matrix = [
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 0]
    ]

    try:
        put_res = client.put(f"/api/v1/simulations/{sim_id}/restrictions", json={
            "matrix": orig_matrix,
            "rowFlightIds": orig_flights,
            "columnGateIds": orig_gates
        })
        assert put_res.status_code == 200

        # Reorder flights -> [FL-003, FL-002, FL-004] and gates -> [GT-002, GT-001, GT-003]
        reordered_flights = ["FL-003", "FL-002", "FL-004"]
        reordered_gates = ["GT-002", "GT-001", "GT-003"]

        # In original: FL-002 at GT-002 is 1 (row 0, col 1)
        # In reordered: FL-002 is row 1, GT-002 is col 0 -> cell (1, 0) should be 1
        reordered_matrix = [
            [0, 0, 1],  # FL-003: GT-003 is 1 (col 2)
            [1, 0, 0],  # FL-002: GT-002 is 1 (col 0)
            [0, 1, 0]   # FL-004: GT-001 is 1 (col 1)
        ]

        put_res2 = client.put(f"/api/v1/simulations/{sim_id}/restrictions", json={
            "matrix": reordered_matrix,
            "rowFlightIds": reordered_flights,
            "columnGateIds": reordered_gates
        })
        assert put_res2.status_code == 200

        # Fetch again
        get_res = client.get(f"/api/v1/simulations/{sim_id}/restrictions")
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["rowFlightIds"] == reordered_flights
        assert data["columnGateIds"] == reordered_gates
        assert data["matrix"][1][0] == 1
    finally:
        # Restore SIM-002 to standard benchmark
        client.put(f"/api/v1/simulations/{sim_id}/restrictions", json={
            "matrix": orig_matrix,
            "rowFlightIds": orig_flights,
            "columnGateIds": orig_gates
        })


def test_restrictions_backend_backward_compatibility():
    """
    7. Test backward compatibility with legacy records:
    - Update without rowFlightIds / columnGateIds (legacy payload)
    - Validates that legacy matrix update succeeds without errors
    - Validates dimension validation rejection when array length mismatches
    """
    sim_id = "SIM-001"
    benchmark_matrix = [
        [0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 1, 0],
        [1, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0]
    ]

    try:
        # Legacy payload: only {"matrix": [...]} with benchmark matrix
        res = client.put(f"/api/v1/simulations/{sim_id}/restrictions", json={"matrix": benchmark_matrix})
        assert res.status_code == 200
        data = res.json()
        assert data["matrix"] == benchmark_matrix

        # Mismatched rowFlightIds length must be rejected with 422
        invalid_res = client.put(f"/api/v1/simulations/{sim_id}/restrictions", json={
            "matrix": benchmark_matrix,
            "rowFlightIds": ["FL-1", "FL-2"]  # 2 IDs for 6 rows
        })
        assert invalid_res.status_code == 422

        # Mismatched columnGateIds length must be rejected with 422
        invalid_res2 = client.put(f"/api/v1/simulations/{sim_id}/restrictions", json={
            "matrix": benchmark_matrix,
            "columnGateIds": ["GT-1"]  # 1 ID for 6 cols
        })
        assert invalid_res2.status_code == 422
    finally:
        # Restore SIM-001 benchmark matrix and original identity arrays
        client.put(f"/api/v1/simulations/{sim_id}/restrictions", json={
            "matrix": benchmark_matrix,
            "rowFlightIds": ["FL-001", "FL-002", "FL-003", "FL-004", "FL-005", "FL-006"],
            "columnGateIds": ["GT-001", "GT-002", "GT-003", "GT-004", "GT-005", "GT-006"]
        })
