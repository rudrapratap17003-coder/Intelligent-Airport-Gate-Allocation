"""
Tests for Phase 16: Valid Flight-to-Gate Allocation Generator.
Includes independent brute-force verification, invariant testing,
edge cases, error validation, and the standard SIM-001 benchmark.
"""

import itertools
import pytest
from app.services.allocation_generator_service import (
    AllocationGeneratorService,
    generate_allocations,
    AllocationGeneratorError,
    MAX_SYSTEM_RESULT_LIMIT
)
from app.services.rook_polynomial_service import InvalidMatrixError


# =====================================================================
# INDEPENDENT TEST-ONLY REFERENCE IMPLEMENTATION & VALIDATOR
# =====================================================================

def independent_brute_force_allocations(matrix, flight_ids, gate_ids):
    """
    Independent test-only reference implementation.
    Generates all valid flight-to-gate assignments using itertools.permutations
    without recursion, bitmasks, or the production service.
    """
    n = len(matrix)
    valid_allocations = []
    
    # Each permutation of (0, 1, ..., n-1) represents gate assigned to flight i
    for perm in itertools.permutations(range(n)):
        is_valid = True
        for flight_idx, gate_idx in enumerate(perm):
            if matrix[flight_idx][gate_idx] == 1:
                is_valid = False
                break
        if is_valid:
            assignment = [
                {"flight_id": flight_ids[i], "gate_id": gate_ids[perm[i]]}
                for i in range(n)
            ]
            valid_allocations.append(assignment)
            
    return valid_allocations


def verify_allocation_validity(matrix, flight_ids, gate_ids, allocation):
    """
    Independent validator: rigorously verifies that a single allocation:
      1. Contains exactly n flight-to-gate assignments.
      2. Contains every flight exactly once.
      3. Contains every gate exactly once (bijective assignment).
      4. Does NOT assign any flight to a forbidden gate (B[f][g] == 0).
    """
    n = len(matrix)
    assignments = allocation["assignments"]
    assert len(assignments) == n, f"Expected {n} assignments, got {len(assignments)}"

    assigned_flights = [a["flight_id"] for a in assignments]
    assigned_gates = [a["gate_id"] for a in assignments]

    # Every flight unique and matches flight_ids
    assert len(set(assigned_flights)) == n, f"Duplicate flights in allocation: {assigned_flights}"
    assert set(assigned_flights) == set(flight_ids), f"Assigned flights do not match required flight_ids"

    # Every gate unique and matches gate_ids
    assert len(set(assigned_gates)) == n, f"Duplicate gates in allocation: {assigned_gates}"
    assert set(assigned_gates) == set(gate_ids), f"Assigned gates do not match required gate_ids"

    # No forbidden matrix cell is used
    flight_to_idx = {fid: idx for idx, fid in enumerate(flight_ids)}
    gate_to_idx = {gid: idx for idx, gid in enumerate(gate_ids)}

    for a in assignments:
        f_idx = flight_to_idx[a["flight_id"]]
        g_idx = gate_to_idx[a["gate_id"]]
        assert matrix[f_idx][g_idx] == 0, (
            f"Forbidden assignment violated: Flight {a['flight_id']} (row {f_idx}) "
            f"assigned to Gate {a['gate_id']} (col {g_idx}) where matrix cell is 1!"
        )


# =====================================================================
# SECTION 8: REQUIRED EDGE CASES
# =====================================================================

class TestRequiredEdgeCases:
    """Tests for the five explicit required cases A, B, C, D, E."""

    def test_case_a_no_forbidden_assignments(self):
        """Case A: 3x3 zero matrix -> 3! = 6 valid allocations."""
        matrix = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ]
        flights = ["FL-1", "FL-2", "FL-3"]
        gates = ["G-1", "G-2", "G-3"]

        res = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=10)
        assert res["matrix_size"] == 3
        assert res["total_possible_assignments"] == 6
        assert res["total_valid_assignments"] == 6
        assert res["generated_count"] == 6
        assert res["generation_complete"] is True
        assert res["has_more"] is False
        assert len(res["allocations"]) == 6

        # Check every allocation validity
        for alloc in res["allocations"]:
            verify_allocation_validity(matrix, flights, gates, alloc)

        # Cross-verify with independent brute-force
        ref = independent_brute_force_allocations(matrix, flights, gates)
        assert len(ref) == 6
        prod_signatures = {
            tuple((a["flight_id"], a["gate_id"]) for a in alloc["assignments"])
            for alloc in res["allocations"]
        }
        ref_signatures = {
            tuple((a["flight_id"], a["gate_id"]) for a in alloc)
            for alloc in ref
        }
        assert prod_signatures == ref_signatures

    def test_case_b_every_assignment_forbidden(self):
        """Case B: 3x3 all-one matrix -> 0 valid allocations, returns empty list."""
        matrix = [
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1]
        ]
        res = generate_allocations(matrix, max_results=100)
        assert res["matrix_size"] == 3
        assert res["total_possible_assignments"] == 6
        assert res["total_valid_assignments"] == 0
        assert res["generated_count"] == 0
        assert res["generation_complete"] is True
        assert res["has_more"] is False
        assert res["allocations"] == []

    def test_case_c_one_forbidden_cell(self):
        """
        Case C: 2x2 matrix with one forbidden cell at (0, 0).
        B = [[1, 0],
             [0, 0]]
        Valid allocation must be FL-001 -> GT-002, FL-002 -> GT-001 (N=1).
        """
        matrix = [
            [1, 0],
            [0, 0]
        ]
        flights = ["FL-A", "FL-B"]
        gates = ["GT-X", "GT-Y"]

        res = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=10)
        assert res["total_valid_assignments"] == 1
        assert res["generated_count"] == 1
        assert res["generation_complete"] is True
        assert res["has_more"] is False

        alloc = res["allocations"][0]
        verify_allocation_validity(matrix, flights, gates, alloc)
        assert alloc["assignments"] == [
            {"flight_id": "FL-A", "gate_id": "GT-Y"},
            {"flight_id": "FL-B", "gate_id": "GT-X"}
        ]

    def test_case_d_three_diagonal_forbidden_cells(self):
        """
        Case D: 3x3 identity matrix (derangements of 3 elements).
        B = [[1, 0, 0],
             [0, 1, 0],
             [0, 0, 1]]
        Expected valid allocations: D_3 = 2.
        """
        matrix = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ]
        flights = ["F1", "F2", "F3"]
        gates = ["G1", "G2", "G3"]

        res = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=10)
        assert res["total_possible_assignments"] == 6
        assert res["total_valid_assignments"] == 2
        assert res["generated_count"] == 2
        assert res["generation_complete"] is True
        assert res["has_more"] is False

        for alloc in res["allocations"]:
            verify_allocation_validity(matrix, flights, gates, alloc)

        # Cross-verify against independent brute force
        ref = independent_brute_force_allocations(matrix, flights, gates)
        assert len(ref) == 2
        prod_signatures = {
            tuple((a["flight_id"], a["gate_id"]) for a in alloc["assignments"])
            for alloc in res["allocations"]
        }
        ref_signatures = {
            tuple((a["flight_id"], a["gate_id"]) for a in alloc)
            for alloc in ref
        }
        assert prod_signatures == ref_signatures

    def test_case_e_sim_001_standard_benchmark(self):
        """
        Case E: Standard GateWise SIM-001 benchmark (6x6 matrix with 5 forbidden cells).
        Forbidden cells: (0, 1), (1, 2), (2, 0), (3, 4), (4, 3)
        Expected mathematical total: 309 valid allocations out of 720.
        """
        matrix = [
            [0, 1, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0],
            [1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0]
        ]
        flights = ["FL-001", "FL-002", "FL-003", "FL-004", "FL-005", "FL-006"]
        gates = ["GT-001", "GT-002", "GT-003", "GT-004", "GT-005", "GT-006"]

        # 1. Limit = 10 -> exactly 10 allocations, has_more=True, generation_complete=False
        res_10 = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=10)
        assert res_10["matrix_size"] == 6
        assert res_10["total_possible_assignments"] == 720
        assert res_10["total_valid_assignments"] == 309
        assert res_10["generated_count"] == 10
        assert res_10["max_results"] == 10
        assert res_10["generation_complete"] is False
        assert res_10["has_more"] is True
        assert len(res_10["allocations"]) == 10
        for alloc in res_10["allocations"]:
            verify_allocation_validity(matrix, flights, gates, alloc)

        # 2. Limit = 100 -> exactly 100 allocations, has_more=True, generation_complete=False
        res_100 = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=100)
        assert res_100["generated_count"] == 100
        assert res_100["generation_complete"] is False
        assert res_100["has_more"] is True
        for alloc in res_100["allocations"]:
            verify_allocation_validity(matrix, flights, gates, alloc)

        # 3. Limit = 309 (or 500) -> all 309 allocations, has_more=False, generation_complete=True
        res_all = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=500)
        assert res_all["generated_count"] == 309
        assert res_all["total_valid_assignments"] == 309
        assert res_all["generation_complete"] is True
        assert res_all["has_more"] is False
        assert len(res_all["allocations"]) == 309

        # Verify uniqueness of all 309 allocations
        signatures = [
            tuple((a["flight_id"], a["gate_id"]) for a in alloc["assignments"])
            for alloc in res_all["allocations"]
        ]
        assert len(set(signatures)) == 309, "Generated duplicate allocations!"

        # Verify 1-based sequential allocation numbering
        for idx, alloc in enumerate(res_all["allocations"], start=1):
            assert alloc["allocation_number"] == idx
            verify_allocation_validity(matrix, flights, gates, alloc)

        # Verify res_10 and res_100 are strictly deterministic prefixes of res_all
        assert signatures[:10] == [
            tuple((a["flight_id"], a["gate_id"]) for a in alloc["assignments"])
            for alloc in res_10["allocations"]
        ]
        assert signatures[:100] == [
            tuple((a["flight_id"], a["gate_id"]) for a in alloc["assignments"])
            for alloc in res_100["allocations"]
        ]


# =====================================================================
# DIVERSE STRUCTURAL CONFIGURATIONS
# =====================================================================

class TestMatrixConfigurations:
    """Tests for sparse, dense, single-row, single-col restrictions."""

    def test_multiple_restrictions_in_one_row(self):
        """Row 0 has 3 gates forbidden out of 4."""
        matrix = [
            [1, 1, 1, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
        flights = ["F1", "F2", "F3", "F4"]
        gates = ["G1", "G2", "G3", "G4"]

        res = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=100)
        # Row 0 can only take Gate 3 (1 choice). Remaining 3 flights can take remaining 3 gates in 3! = 6 ways.
        assert res["total_valid_assignments"] == 6
        assert res["generated_count"] == 6
        assert res["generation_complete"] is True
        for alloc in res["allocations"]:
            verify_allocation_validity(matrix, flights, gates, alloc)
            # F1 must always be assigned to G4
            f1_assignment = next(a for a in alloc["assignments"] if a["flight_id"] == "F1")
            assert f1_assignment["gate_id"] == "G4"

    def test_multiple_restrictions_in_one_column(self):
        """Col 0 has 3 flights forbidden out of 4."""
        matrix = [
            [1, 0, 0, 0],
            [1, 0, 0, 0],
            [1, 0, 0, 0],
            [0, 0, 0, 0]
        ]
        flights = ["F1", "F2", "F3", "F4"]
        gates = ["G1", "G2", "G3", "G4"]

        res = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=100)
        # Gate 0 can only be taken by Flight 3 (1 choice). Remaining 3 gates taken by 3 flights in 3! = 6 ways.
        assert res["total_valid_assignments"] == 6
        assert res["generated_count"] == 6
        for alloc in res["allocations"]:
            verify_allocation_validity(matrix, flights, gates, alloc)
            f4_assignment = next(a for a in alloc["assignments"] if a["flight_id"] == "F4")
            assert f4_assignment["gate_id"] == "G1"

    def test_dense_matrix_with_few_valid_paths(self):
        """A dense 4x4 matrix where only 1 valid assignment exists."""
        # Permutation: F0->G1, F1->G2, F2->G3, F3->G0
        # All other cells forbidden (1)
        matrix = [
            [1, 0, 1, 1],
            [1, 1, 0, 1],
            [1, 1, 1, 0],
            [0, 1, 1, 1]
        ]
        res = generate_allocations(matrix, max_results=100)
        assert res["total_valid_assignments"] == 1
        assert res["generated_count"] == 1
        assert res["generation_complete"] is True
        assert res["has_more"] is False
        alloc = res["allocations"][0]
        default_flights = [f"FL-{i+1:03d}" for i in range(4)]
        default_gates = [f"GT-{j+1:03d}" for j in range(4)]
        verify_allocation_validity(matrix, default_flights, default_gates, alloc)


# =====================================================================
# INDEPENDENT BRUTE-FORCE CROSS-VERIFICATION ACROSS MATRICES
# =====================================================================

class TestIndependentBruteForceVerification:
    """Verifies that production generator matches independent permutation enumerator."""

    @pytest.mark.parametrize("matrix", [
        [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
        [[1, 1, 0], [0, 1, 0], [0, 0, 0]],
        [[0, 0, 0, 0], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]],
        [[1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 0, 0], [0, 0, 1, 0]],
    ])
    def test_matches_brute_force_reference(self, matrix):
        n = len(matrix)
        flights = [f"FLIGHT_{i}" for i in range(n)]
        gates = [f"GATE_{j}" for j in range(n)]

        # Independent reference
        ref_allocations = independent_brute_force_allocations(matrix, flights, gates)
        ref_count = len(ref_allocations)

        # Production service
        prod_res = generate_allocations(matrix, flight_ids=flights, gate_ids=gates, max_results=1000)

        assert prod_res["total_valid_assignments"] == ref_count
        assert prod_res["generated_count"] == ref_count
        assert prod_res["generation_complete"] is True
        assert prod_res["has_more"] is False

        # Compare set of allocation tuples
        ref_signatures = {
            tuple((a["flight_id"], a["gate_id"]) for a in alloc)
            for alloc in ref_allocations
        }
        prod_signatures = {
            tuple((a["flight_id"], a["gate_id"]) for a in alloc["assignments"])
            for alloc in prod_res["allocations"]
        }
        assert prod_signatures == ref_signatures


# =====================================================================
# RESULT LIMITS AND SAFEGUARDS
# =====================================================================

class TestResultLimits:
    """Tests result limit enforcement, bounds, and flags."""

    def test_default_max_results_is_100(self):
        matrix = [[0] * 5 for _ in range(5)]  # 5! = 120
        res = generate_allocations(matrix)  # default max_results=100
        assert res["total_valid_assignments"] == 120
        assert res["generated_count"] == 100
        assert res["max_results"] == 100
        assert res["generation_complete"] is False
        assert res["has_more"] is True

    def test_reject_zero_limit(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="must be a positive integer"):
            generate_allocations(matrix, max_results=0)

    def test_reject_negative_limit(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="must be a positive integer"):
            generate_allocations(matrix, max_results=-5)

    def test_reject_boolean_or_non_integer(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="must be a positive integer"):
            generate_allocations(matrix, max_results=True)

        with pytest.raises(AllocationGeneratorError, match="must be a positive integer"):
            generate_allocations(matrix, max_results="100")

    def test_reject_excessive_system_limit(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="system safeguard limit"):
            generate_allocations(matrix, max_results=MAX_SYSTEM_RESULT_LIMIT + 1)


# =====================================================================
# INPUT VALIDATION AND ERROR CONDITIONS
# =====================================================================

class TestInputValidation:
    """Tests rejecting non-square, invalid matrix elements, or invalid IDs."""

    def test_reject_empty_matrix(self):
        with pytest.raises(InvalidMatrixError):
            generate_allocations([])

    def test_reject_rectangular_matrix(self):
        with pytest.raises(InvalidMatrixError):
            generate_allocations([[0, 0, 0], [0, 0, 0]])

    def test_reject_non_binary_elements(self):
        with pytest.raises(InvalidMatrixError):
            generate_allocations([[0, 2], [0, 0]])

    def test_flight_ids_count_mismatch(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="must match matrix dimension"):
            generate_allocations(matrix, flight_ids=["F1", "F2", "F3"])

    def test_gate_ids_count_mismatch(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="must match matrix dimension"):
            generate_allocations(matrix, gate_ids=["G1"])

    def test_duplicate_flight_ids(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="Duplicate flight identifiers"):
            generate_allocations(matrix, flight_ids=["F1", "F1"])

    def test_duplicate_gate_ids(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="Duplicate gate identifiers"):
            generate_allocations(matrix, gate_ids=["G1", "G1"])

    def test_invalid_string_in_flight_ids(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="Invalid flight identifier"):
            generate_allocations(matrix, flight_ids=["F1", "  "])

    def test_invalid_string_in_gate_ids(self):
        matrix = [[0, 0], [0, 0]]
        with pytest.raises(AllocationGeneratorError, match="Invalid gate identifier"):
            generate_allocations(matrix, gate_ids=["G1", None])
