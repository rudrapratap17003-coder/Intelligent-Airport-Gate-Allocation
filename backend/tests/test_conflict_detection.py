"""
Tests for Phase 17: Allocation Conflict Detection Engine.
Verifies independent detection of duplicate flights, duplicate gates, forbidden pairings,
missing flights, unknown identifiers, incomplete allocations, malformed inputs, and
integration with Phase 16 generated allocations including the 309 SIM-001 benchmark allocations.
"""

import copy
import pytest
from app.services.conflict_detection_service import (
    ConflictDetectionService,
    detect_allocation_conflicts,
    ConflictDetectionError
)
from app.services.allocation_generator_service import generate_allocations
from app.services.rook_polynomial_service import InvalidMatrixError


# Standard 3x3 Test Fixture
MATRIX_3X3 = [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0]
]
FLIGHTS_3X3 = ["F1", "F2", "F3"]
GATES_3X3 = ["G1", "G2", "G3"]

# Standard SIM-001 6x6 Benchmark Fixture
MATRIX_SIM_001 = [
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0]
]
FLIGHTS_SIM_001 = [f"FL-{i+1:03d}" for i in range(6)]
GATES_SIM_001 = [f"GT-{j+1:03d}" for j in range(6)]


# =====================================================================
# SECTION 6: CORE SPECIFICATION TESTS (1 to 18)
# =====================================================================

class TestConflictDetectorCoreCases:
    """Tests covering all 18 specific requirements in Phase 17."""

    def test_1_completely_valid_allocation(self):
        """1. Completely valid allocation satisfying all constraints."""
        # Matrix has (0, 1), (1, 2), (2, 0) forbidden
        # Valid assignment: F1->G1, F2->G2, F3->G3
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F2", "gate_id": "G2"},
            {"flight_id": "F3", "gate_id": "G3"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is True
        assert res["total_conflicts"] == 0
        assert res["conflicts"] == []
        assert res["missing_flights"] == []
        assert res["unknown_flights"] == []
        assert res["unknown_gates"] == []
        assert res["unassigned_gates"] == []
        assert res["checked_assignments"] == 3
        assert "valid and conflict-free" in res["validation_summary"]

    def test_2_duplicate_flight(self):
        """2. Duplicate flight assigned more than once."""
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F1", "gate_id": "G3"},  # F1 duplicate
            {"flight_id": "F2", "gate_id": "G2"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        dup_conflicts = [c for c in res["conflicts"] if c["conflict_type"] == "DUPLICATE_FLIGHT"]
        assert len(dup_conflicts) >= 1
        assert dup_conflicts[0]["flight_id"] == "F1"
        assert dup_conflicts[0]["severity"] == "ERROR"

    def test_3_duplicate_gate(self):
        """3. Duplicate gate assigned to more than one flight."""
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F2", "gate_id": "G1"},  # G1 assigned twice
            {"flight_id": "F3", "gate_id": "G3"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        dup_gate_conflicts = [c for c in res["conflicts"] if c["conflict_type"] == "DUPLICATE_GATE"]
        assert len(dup_gate_conflicts) >= 1
        assert dup_gate_conflicts[0]["gate_id"] == "G1"
        assert dup_gate_conflicts[0]["severity"] == "ERROR"

    def test_4_forbidden_assignment(self):
        """4. Assignment violates a forbidden matrix cell (B[row][col] == 1)."""
        # Cell (0, 1) is forbidden: F1 -> G2 is forbidden
        allocation = [
            {"flight_id": "F1", "gate_id": "G2"},  # Forbidden!
            {"flight_id": "F2", "gate_id": "G1"},
            {"flight_id": "F3", "gate_id": "G3"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        forb_conflicts = [c for c in res["conflicts"] if c["conflict_type"] == "FORBIDDEN_ASSIGNMENT"]
        assert len(forb_conflicts) == 1
        assert forb_conflicts[0]["flight_id"] == "F1"
        assert forb_conflicts[0]["gate_id"] == "G2"
        assert "row 0, col 1" in forb_conflicts[0]["message"]

    def test_5_missing_flight(self):
        """5. Expected flight is missing from the allocation."""
        # F3 is missing, F1 assigned twice to different gates
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F1", "gate_id": "G3"},
            {"flight_id": "F2", "gate_id": "G2"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        assert "F3" in res["missing_flights"]
        missing_conflicts = [c for c in res["conflicts"] if c["conflict_type"] == "MISSING_FLIGHT"]
        assert any(c["flight_id"] == "F3" for c in missing_conflicts)

    def test_6_unknown_flight(self):
        """6. Flight identifier outside expected flight list."""
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F2", "gate_id": "G2"},
            {"flight_id": "FLIGHT_UNKNOWN_99", "gate_id": "G3"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        assert "FLIGHT_UNKNOWN_99" in res["unknown_flights"]
        unknown_conflicts = [c for c in res["conflicts"] if c["conflict_type"] == "UNKNOWN_FLIGHT"]
        assert len(unknown_conflicts) >= 1
        assert unknown_conflicts[0]["flight_id"] == "FLIGHT_UNKNOWN_99"

    def test_7_unknown_gate(self):
        """7. Gate identifier outside expected gate list."""
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F2", "gate_id": "G2"},
            {"flight_id": "F3", "gate_id": "GATE_G999"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        assert "GATE_G999" in res["unknown_gates"]
        unknown_gate_conflicts = [c for c in res["conflicts"] if c["conflict_type"] == "UNKNOWN_GATE"]
        assert len(unknown_gate_conflicts) >= 1
        assert unknown_gate_conflicts[0]["gate_id"] == "GATE_G999"

    def test_8_unassigned_gate(self):
        """8. Expected gate not assigned to any flight."""
        # G3 is unassigned because G1 is used twice
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F2", "gate_id": "G1"},
            {"flight_id": "F3", "gate_id": "G2"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        assert "G3" in res["unassigned_gates"]
        unassigned_gate_conflicts = [c for c in res["conflicts"] if c["conflict_type"] == "UNASSIGNED_GATE"]
        assert any(c["gate_id"] == "G3" for c in unassigned_gate_conflicts)

    def test_9_incomplete_allocation(self):
        """9. Allocation containing fewer than n flight-to-gate assignments."""
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F2", "gate_id": "G2"}
            # Only 2 assignments for a 3x3 problem
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        incomplete_conflicts = [c for c in res["conflicts"] if c["conflict_type"] == "INCOMPLETE_ALLOCATION"]
        assert len(incomplete_conflicts) >= 1
        assert res["missing_flights"] == ["F3"]
        assert res["unassigned_gates"] == ["G3"]
        assert res["checked_assignments"] == 2

    def test_10_empty_allocation(self):
        """10. Completely empty allocation list."""
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, [])
        assert res["is_valid"] is False
        assert res["checked_assignments"] == 0
        assert set(res["missing_flights"]) == set(FLIGHTS_3X3)
        assert set(res["unassigned_gates"]) == set(GATES_3X3)
        assert any(c["conflict_type"] == "INCOMPLETE_ALLOCATION" for c in res["conflicts"])

    def test_11_malformed_assignment_record(self):
        """11. Malformed assignment record (e.g. non-dictionary or string inside list)."""
        allocation = [
            {"flight_id": "F1", "gate_id": "G1"},
            "this_is_not_a_dictionary",
            12345
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        malformed = [c for c in res["conflicts"] if c["conflict_type"] == "MALFORMED_ASSIGNMENT"]
        assert len(malformed) >= 2

    def test_12_missing_flight_id(self):
        """12. Assignment record missing 'flight_id' key or has None."""
        allocation = [
            {"gate_id": "G1"},  # missing flight_id
            {"flight_id": None, "gate_id": "G2"},  # None flight_id
            {"flight_id": "F3", "gate_id": "G3"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        malformed = [c for c in res["conflicts"] if c["conflict_type"] == "MALFORMED_ASSIGNMENT"]
        assert len(malformed) >= 2

    def test_13_missing_gate_id(self):
        """13. Assignment record missing 'gate_id' key or has None/empty string."""
        allocation = [
            {"flight_id": "F1"},  # missing gate_id
            {"flight_id": "F2", "gate_id": "  "},  # blank gate_id
            {"flight_id": "F3", "gate_id": "G3"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        malformed = [c for c in res["conflicts"] if c["conflict_type"] == "MALFORMED_ASSIGNMENT"]
        assert len(malformed) >= 2

    def test_14_duplicate_expected_identifiers(self):
        """14. Duplicate identifiers in expected flight_ids or gate_ids raise ConflictDetectionError."""
        with pytest.raises(ConflictDetectionError, match="Duplicate flight identifiers"):
            detect_allocation_conflicts(MATRIX_3X3, ["F1", "F1", "F3"], GATES_3X3, [])

        with pytest.raises(ConflictDetectionError, match="Duplicate gate identifiers"):
            detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, ["G1", "G2", "G1"], [])

    def test_15_invalid_matrix_dimensions(self):
        """15. Rectangular or dimension-mismatched matrix raises InvalidMatrixError or ConflictDetectionError."""
        with pytest.raises(InvalidMatrixError):
            detect_allocation_conflicts([[0, 1], [0, 0], [1, 0]], FLIGHTS_3X3, GATES_3X3, [])

        with pytest.raises(ConflictDetectionError, match="match matrix dimension"):
            detect_allocation_conflicts(MATRIX_3X3, ["F1", "F2"], GATES_3X3, [])

    def test_16_invalid_binary_matrix_values(self):
        """16. Matrix with non-binary values raises InvalidMatrixError."""
        invalid_mat = [
            [0, 2, 0],
            [0, 0, 1],
            [1, 0, 0]
        ]
        with pytest.raises(InvalidMatrixError):
            detect_allocation_conflicts(invalid_mat, FLIGHTS_3X3, GATES_3X3, [])

    def test_17_multiple_simultaneous_conflicts(self):
        """17. Multiple simultaneous conflicts in a single allocation."""
        # F1->G2 (forbidden, cell (0,1)=1)
        # F1->G1 (duplicate flight F1, duplicate gate G1)
        # F2->G1 (duplicate gate G1)
        # F3 is missing, G3 is unassigned
        # Unknown flight FX
        allocation = [
            {"flight_id": "F1", "gate_id": "G2"},  # FORBIDDEN
            {"flight_id": "F1", "gate_id": "G1"},  # DUPLICATE_FLIGHT
            {"flight_id": "F2", "gate_id": "G1"},  # DUPLICATE_GATE
            {"flight_id": "FX", "gate_id": "G2"}   # UNKNOWN_FLIGHT + DUPLICATE_GATE
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, allocation)
        assert res["is_valid"] is False
        assert res["total_conflicts"] >= 4
        conflict_types = {c["conflict_type"] for c in res["conflicts"]}
        assert "FORBIDDEN_ASSIGNMENT" in conflict_types
        assert "DUPLICATE_FLIGHT" in conflict_types
        assert "DUPLICATE_GATE" in conflict_types
        assert "UNKNOWN_FLIGHT" in conflict_types
        assert "MISSING_FLIGHT" in conflict_types
        assert "UNASSIGNED_GATE" in conflict_types
        assert "F3" in res["missing_flights"]
        assert "G3" in res["unassigned_gates"]

    def test_18_fully_valid_phase_16_generated_allocations(self):
        """18. Valid Phase 16 generated allocations pass independent verification."""
        gen_res = generate_allocations(
            MATRIX_3X3,
            flight_ids=FLIGHTS_3X3,
            gate_ids=GATES_3X3,
            max_results=10
        )
        assert gen_res["generated_count"] > 0
        for alloc in gen_res["allocations"]:
            res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, alloc)
            assert res["is_valid"] is True
            assert res["total_conflicts"] == 0
            assert res["conflicts"] == []


# =====================================================================
# SECTION 7: PHASE 16 INTEGRATION & BENCHMARK TESTING
# =====================================================================

class TestPhase16IntegrationAndMutations:
    """Verifies all 309 SIM-001 allocations and tests deliberate mutations."""

    def test_all_309_sim_001_allocations_pass_conflict_detection(self):
        """Generate all 309 valid allocations from SIM-001 and independently verify every single one."""
        gen_res = generate_allocations(
            MATRIX_SIM_001,
            flight_ids=FLIGHTS_SIM_001,
            gate_ids=GATES_SIM_001,
            max_results=500
        )
        assert gen_res["generated_count"] == 309
        assert gen_res["generation_complete"] is True

        for alloc in gen_res["allocations"]:
            diag = detect_allocation_conflicts(
                MATRIX_SIM_001,
                FLIGHTS_SIM_001,
                GATES_SIM_001,
                alloc
            )
            assert diag["is_valid"] is True
            assert diag["total_conflicts"] == 0
            assert diag["checked_assignments"] == 6
            assert diag["missing_flights"] == []
            assert diag["unassigned_gates"] == []

    def test_mutation_introducing_forbidden_cell(self):
        """Take a valid SIM-001 allocation, tamper with one gate to use a forbidden cell."""
        gen_res = generate_allocations(
            MATRIX_SIM_001,
            flight_ids=FLIGHTS_SIM_001,
            gate_ids=GATES_SIM_001,
            max_results=1
        )
        alloc = copy.deepcopy(gen_res["allocations"][0])
        # In SIM-001, cell (0, 1) is forbidden: FL-001 -> GT-002
        # Find FL-001 assignment and force GT-002
        for a in alloc["assignments"]:
            if a["flight_id"] == "FL-001":
                a["gate_id"] = "GT-002"

        diag = detect_allocation_conflicts(MATRIX_SIM_001, FLIGHTS_SIM_001, GATES_SIM_001, alloc)
        assert diag["is_valid"] is False
        forb_conflicts = [c for c in diag["conflicts"] if c["conflict_type"] == "FORBIDDEN_ASSIGNMENT"]
        assert len(forb_conflicts) >= 1
        assert forb_conflicts[0]["flight_id"] == "FL-001"
        assert forb_conflicts[0]["gate_id"] == "GT-002"

    def test_mutation_introducing_duplicate_gate(self):
        """Take a valid SIM-001 allocation, assign the same gate to two flights."""
        gen_res = generate_allocations(
            MATRIX_SIM_001,
            flight_ids=FLIGHTS_SIM_001,
            gate_ids=GATES_SIM_001,
            max_results=1
        )
        alloc = copy.deepcopy(gen_res["allocations"][0])
        # Force FL-002 to have the same gate as FL-001
        gate_0 = alloc["assignments"][0]["gate_id"]
        alloc["assignments"][1]["gate_id"] = gate_0

        diag = detect_allocation_conflicts(MATRIX_SIM_001, FLIGHTS_SIM_001, GATES_SIM_001, alloc)
        assert diag["is_valid"] is False
        dup_gates = [c for c in diag["conflicts"] if c["conflict_type"] == "DUPLICATE_GATE"]
        assert len(dup_gates) >= 1
        assert dup_gates[0]["gate_id"] == gate_0

    def test_mutation_introducing_missing_flight(self):
        """Take a valid SIM-001 allocation, drop one assignment record."""
        gen_res = generate_allocations(
            MATRIX_SIM_001,
            flight_ids=FLIGHTS_SIM_001,
            gate_ids=GATES_SIM_001,
            max_results=1
        )
        alloc = copy.deepcopy(gen_res["allocations"][0])
        removed_flight = alloc["assignments"].pop()["flight_id"]

        diag = detect_allocation_conflicts(MATRIX_SIM_001, FLIGHTS_SIM_001, GATES_SIM_001, alloc)
        assert diag["is_valid"] is False
        assert removed_flight in diag["missing_flights"]
        assert any(c["conflict_type"] == "INCOMPLETE_ALLOCATION" for c in diag["conflicts"])

    def test_mutation_introducing_unknown_identifiers(self):
        """Take a valid allocation, replace a flight with an alien identifier."""
        gen_res = generate_allocations(
            MATRIX_SIM_001,
            flight_ids=FLIGHTS_SIM_001,
            gate_ids=GATES_SIM_001,
            max_results=1
        )
        alloc = copy.deepcopy(gen_res["allocations"][0])
        alloc["assignments"][0]["flight_id"] = "SPACE_SHUTTLE_DISCOVERY"

        diag = detect_allocation_conflicts(MATRIX_SIM_001, FLIGHTS_SIM_001, GATES_SIM_001, alloc)
        assert diag["is_valid"] is False
        assert "SPACE_SHUTTLE_DISCOVERY" in diag["unknown_flights"]
        assert any(c["conflict_type"] == "UNKNOWN_FLIGHT" for c in diag["conflicts"])


# =====================================================================
# FLEXIBLE INPUT STRUCTURE TESTING
# =====================================================================

class TestInputStructures:
    """Tests that detector accepts dicts, lists, and model wrappers."""

    def test_accepts_dict_with_assignments_key(self):
        alloc = {
            "allocation_number": 42,
            "assignments": [
                {"flight_id": "F1", "gate_id": "G1"},
                {"flight_id": "F2", "gate_id": "G2"},
                {"flight_id": "F3", "gate_id": "G3"}
            ]
        }
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, alloc)
        assert res["is_valid"] is True

    def test_accepts_direct_list_of_assignments(self):
        alloc = [
            {"flight_id": "F1", "gate_id": "G1"},
            {"flight_id": "F2", "gate_id": "G2"},
            {"flight_id": "F3", "gate_id": "G3"}
        ]
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, alloc)
        assert res["is_valid"] is True

    def test_rejects_non_container_allocation(self):
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, "invalid_string")
        assert res["is_valid"] is False
        assert any(c["conflict_type"] == "MALFORMED_ASSIGNMENT" for c in res["conflicts"])

    def test_rejects_none_allocation(self):
        res = detect_allocation_conflicts(MATRIX_3X3, FLIGHTS_3X3, GATES_3X3, None)
        assert res["is_valid"] is False
        assert any(c["conflict_type"] == "MALFORMED_ASSIGNMENT" for c in res["conflicts"])
