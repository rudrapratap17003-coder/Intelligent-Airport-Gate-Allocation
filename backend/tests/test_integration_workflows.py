"""
GateWise Phase 27 — Full End-to-End Integration Test Suite.
Validates the complete operational lifecycle across all subsystems:
Flights -> Gates -> Simulations -> Restrictions -> Rook Polynomial ->
Inclusion-Exclusion -> Allocation Generation -> Independent Conflict Detection ->
Dashboard Telemetry -> Analytics -> Scenario Comparison -> Math Explorer -> Exports.
"""

import json
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_complete_end_to_end_system_lifecycle():
    """Execute a comprehensive end-to-end operational lifecycle test."""

    # 1. Fetch available flights and gates
    f_res = client.get("/api/v1/flights")
    assert f_res.status_code == 200
    flights = f_res.json()
    assert len(flights) >= 3

    g_res = client.get("/api/v1/gates")
    assert g_res.status_code == 200
    gates = g_res.json()
    assert len(gates) >= 3

    selected_f_ids = [flights[0]["id"], flights[1]["id"], flights[2]["id"]]
    selected_g_ids = [gates[0]["id"], gates[1]["id"], gates[2]["id"]]

    # 2. Create a new simulation scenario (3x3)
    sim_payload = {
        "id": "SIM-TEST-E2E",
        "name": "Integration E2E Lifecycle Simulation",
        "description": "Full lifecycle verification scenario for Phase 27",
        "selected_flight_ids": selected_f_ids,
        "selected_gate_ids": selected_g_ids
    }
    create_res = client.post("/api/v1/simulations", json=sim_payload)
    assert create_res.status_code in (201, 200)
    sim_data = create_res.json()
    sim_id = sim_data["id"]

    try:
        # 3. Configure Restriction Matrix: Derangement Matrix (Diagonal 1s)
        # For 3x3 diagonal forbidden: !3 = 2 derangements
        matrix_payload = {
            "matrix": [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ]
        }
        matrix_res = client.put(f"/api/v1/simulations/{sim_id}/restrictions", json=matrix_payload)
        assert matrix_res.status_code == 200
        assert matrix_res.json()["rows_count"] == 3
        assert matrix_res.json()["cols_count"] == 3

        # 4. Execute Exact Mathematical Calculation (Rook Polynomial & PIE)
        calc_res = client.get(f"/api/v1/simulations/{sim_id}/calculate")
        assert calc_res.status_code == 200
        calc = calc_res.json()
        assert calc["matrix_size"] == 3
        assert calc["forbidden_cell_count"] == 3
        assert calc["total_possible_assignments"] == 6
        assert calc["valid_assignments"] == 2  # D_3 = 2
        assert calc["rook_coefficients"] == [1, 3, 3, 1]
        assert round(calc["feasibility_percentage"], 1) == 33.3

        # 5. Generate Allocations via Backtracking
        alloc_res = client.get(f"/api/v1/simulations/{sim_id}/allocations?max_results=10")
        assert alloc_res.status_code == 200
        alloc = alloc_res.json()
        assert alloc["generated_count"] == 2
        assert alloc["total_valid_assignments"] == 2
        assert alloc["generation_complete"] is True

        # 6. Verify each generated allocation passed independent conflict detection
        for a in alloc["allocations"]:
            val = a["validation"]
            assert val["is_valid"] is True
            assert val["total_conflicts"] == 0
            assert len(val["conflicts"]) == 0

        # 7. Audit an invalid assignment independently (violates diagonal B[0][0]=1)
        bad_allocation = [
            {"flight_id": selected_f_ids[0], "gate_id": selected_g_ids[0]},  # FORBIDDEN!
            {"flight_id": selected_f_ids[1], "gate_id": selected_g_ids[2]},
            {"flight_id": selected_f_ids[2], "gate_id": selected_g_ids[1]}
        ]
        audit_res = client.post(f"/api/v1/simulations/{sim_id}/validate-allocation", json=bad_allocation)
        assert audit_res.status_code == 200
        audit = audit_res.json()
        assert audit["is_valid"] is False
        assert audit["total_conflicts"] >= 1
        assert any(c["conflict_type"] == "FORBIDDEN_ASSIGNMENT" for c in audit["conflicts"])

        # 8. Verify Dashboard Telemetry & Activity Logging
        dash_res = client.get("/api/v1/dashboard/summary")
        assert dash_res.status_code == 200
        dash = dash_res.json()
        assert dash["simulations"]["total"] >= 1
        assert len(dash["recent_activities"]) >= 1

        # 9. Verify Analytics Telemetry for this scenario
        ana_res = client.get(f"/api/v1/analytics/simulations/{sim_id}")
        assert ana_res.status_code == 200
        ana = ana_res.json()
        assert ana["is_feasible"] is True
        assert ana["exact_valid_assignments"] == 2

        # 10. Verify Scenario Comparison with SIM-001
        comp_payload = {
            "simulation_ids": [sim_id, "SIM-001"]
        }
        comp_res = client.post("/api/v1/comparison", json=comp_payload)
        assert comp_res.status_code == 200
        comp = comp_res.json()
        assert len(comp["scenarios"]) == 2
        # Different dimensions (3x3 vs 6x6)
        assert comp["are_dimensions_compatible"] is False

        # 11. Verify CSV and HTML Exports
        exp_matrix = client.get(f"/api/v1/export/simulations/{sim_id}/matrix/csv")
        assert exp_matrix.status_code == 200
        assert "text/csv" in exp_matrix.headers["content-type"]

        exp_alloc = client.get(f"/api/v1/export/simulations/{sim_id}/allocations/csv")
        assert exp_alloc.status_code == 200
        assert "text/csv" in exp_alloc.headers["content-type"]

        exp_html = client.get(f"/api/v1/export/simulations/{sim_id}/report/html")
        assert exp_html.status_code == 200
        assert "R(B, x) =" in exp_html.text

    finally:
        # 12. Cleanup: Delete created simulation and verify cascade deletion
        del_res = client.delete(f"/api/v1/simulations/{sim_id}")
        assert del_res.status_code == 200

        # Verify 404 after deletion
        get_deleted = client.get(f"/api/v1/simulations/{sim_id}")
        assert get_deleted.status_code == 404


def test_infeasible_bottleneck_scenario_integration():
    """Verify system handling of a mathematically infeasible scenario (N = 0)."""
    # 2x2 board where row 0 is completely forbidden
    payload = {
        "matrix": [
            [1, 1],
            [0, 0]
        ],
        "include_sample_allocations": True
    }
    res = client.post("/api/v1/math/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["valid_assignments"] == 0
    assert data["feasibility_percentage"] == 0.0
    assert len(data["sample_allocations"]) == 0


def test_unconstrained_permutation_scenario_integration():
    """Verify system handling of an unconstrained board (all 0s, N = n!)."""
    payload = {
        "matrix": [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        "include_sample_allocations": True,
        "max_sample_allocations": 5
    }
    res = client.post("/api/v1/math/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_possible_assignments"] == 24
    assert data["valid_assignments"] == 24
    assert data["feasibility_percentage"] == 100.0
    assert data["rook_coefficients"] == [1]
    assert len(data["sample_allocations"]) == 5
