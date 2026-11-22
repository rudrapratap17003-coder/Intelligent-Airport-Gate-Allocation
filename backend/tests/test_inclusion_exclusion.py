"""
GateWise — Comprehensive Test Suite for Inclusion-Exclusion Calculation Engine.
Verifies exact combinatorial correctness of the Principle of Inclusion-Exclusion (PIE):
N = sum_{k=0}^n (-1)^k * r_k * (n - k)!
Cross-validates against an independent permutation enumeration brute-force reference implementation.
"""

import itertools
import pytest

from app.services.inclusion_exclusion_service import (
    InclusionExclusionService,
    calculate_valid_allocations
)
from app.services.rook_polynomial_service import InvalidMatrixError
from app.database.seed import SAMPLE_SIMULATIONS


# =====================================================================
# INDEPENDENT BRUTE-FORCE PERMUTATION ENUMERATION REFERENCE
# =====================================================================

def brute_force_valid_allocations_count(matrix: list[list[int]]) -> int:
    """Independent reference implementation.

    Generates all injective assignments of m flights to n distinct gates.
    A permutation p is valid if matrix[i][p[i]] == 0 for every flight i in range(m).
    Completely independent of Rook Polynomials, generating functions, and PIE.
    """
    m = len(matrix)
    n = len(matrix[0]) if m > 0 else 0
    if m > n:
        return 0
    count = 0
    for perm in itertools.permutations(range(n), m):
        if all(matrix[flight_idx][gate_idx] == 0 for flight_idx, gate_idx in enumerate(perm)):
            count += 1
    return count


# =====================================================================
# SECTION 6 REQUIRED EDGE CASES
# =====================================================================

def test_case_a_no_forbidden_assignments():
    """Case A: 3x3 all-zero matrix (no restrictions).

    R(B, x) = 1
    Expected: N = 3! = 6 valid assignments.
    """
    matrix = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ]
    result = calculate_valid_allocations(matrix)

    assert result["matrix_size"] == 3
    assert result["forbidden_cell_count"] == 0
    assert result["rook_coefficients"] == [1]
    assert result["total_possible_assignments"] == 6
    assert result["valid_assignments"] == 6
    assert result["invalid_assignments"] == 0
    assert result["feasibility_percentage"] == 100.0
    assert result["calculation_steps"][2] == "N = 6"

    # Cross-verify with independent brute-force permutation enumeration
    assert result["valid_assignments"] == brute_force_valid_allocations_count(matrix)


def test_case_b_every_assignment_forbidden():
    """Case B: 3x3 all-one matrix (every cell forbidden).

    R(B, x) = 1 + 9x + 18x² + 6x³
    Expected: N = 0 valid assignments.
    """
    matrix = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
    ]
    result = calculate_valid_allocations(matrix)

    assert result["matrix_size"] == 3
    assert result["forbidden_cell_count"] == 9
    assert result["rook_coefficients"] == [1, 9, 18, 6]
    assert result["total_possible_assignments"] == 6
    assert result["valid_assignments"] == 0
    assert result["invalid_assignments"] == 6
    assert result["feasibility_percentage"] == 0.0
    assert result["calculation_steps"][2] == "N = 0"

    # Cross-verify with brute force
    assert result["valid_assignments"] == brute_force_valid_allocations_count(matrix)


def test_case_c_one_forbidden_cell():
    """Case C: 2x2 matrix with one forbidden cell [[1, 0], [0, 0]].

    R(B, x) = 1 + x
    Expected: N = 2! - 1! = 1 valid assignment.
    """
    matrix = [
        [1, 0],
        [0, 0]
    ]
    result = calculate_valid_allocations(matrix)

    assert result["matrix_size"] == 2
    assert result["forbidden_cell_count"] == 1
    assert result["rook_coefficients"] == [1, 1]
    assert result["total_possible_assignments"] == 2
    assert result["valid_assignments"] == 1
    assert result["invalid_assignments"] == 1
    assert result["feasibility_percentage"] == 50.0

    assert result["valid_assignments"] == brute_force_valid_allocations_count(matrix)


def test_case_d_three_pairwise_non_attacking_forbidden():
    """Case D: 3x3 matrix with three pairwise non-attacking forbidden cells (main diagonal).

    R(B, x) = 1 + 3x + 3x² + x³ (derangements D_3)
    Expected calculation:
      N = 1(3!) - 3(2!) + 3(1!) - 1(0!)
      N = 6 - 6 + 3 - 1 = 2 valid assignments.
    """
    matrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ]
    result = calculate_valid_allocations(matrix)

    assert result["matrix_size"] == 3
    assert result["forbidden_cell_count"] == 3
    assert result["rook_coefficients"] == [1, 3, 3, 1]
    assert result["total_possible_assignments"] == 6
    assert result["valid_assignments"] == 2
    assert result["invalid_assignments"] == 4
    assert pytest.approx(result["feasibility_percentage"], 0.0001) == (2 / 6) * 100.0

    # Verify calculation steps exactly match required format
    assert result["calculation_steps"][0] == "N = 1(3!) - 3(2!) + 3(1!) - 1(0!)"
    assert result["calculation_steps"][1] == "N = 6 - 6 + 3 - 1"
    assert result["calculation_steps"][2] == "N = 2"

    assert result["valid_assignments"] == brute_force_valid_allocations_count(matrix)


def test_case_e_standard_gatewise_sim_001_benchmark():
    """Case E: Standard GateWise 6x6 benchmark matrix from seed data.

    R(B, x) = 1 + 5x + 10x² + 10x³ + 5x⁴ + x⁵
    Calculation:
      N = 6! - 5(5!) + 10(4!) - 10(3!) + 5(2!) - 1(1!)
      N = 720 - 600 + 240 - 60 + 10 - 1 = 309.
    Expected: Exactly 309 valid assignments out of 720 total.
    """
    sim_001_seed = next(s for s in SAMPLE_SIMULATIONS if s["id"] == "SIM-001")
    benchmark_matrix = sim_001_seed["matrix"]

    result = calculate_valid_allocations(benchmark_matrix)

    assert result["matrix_size"] == 6
    assert result["forbidden_cell_count"] == 5
    assert result["rook_coefficients"] == [1, 5, 10, 10, 5, 1]
    assert result["total_possible_assignments"] == 720
    assert result["valid_assignments"] == 309
    assert result["invalid_assignments"] == 411
    assert pytest.approx(result["feasibility_percentage"], 0.0001) == (309 / 720) * 100.0

    # Verify calculation step strings
    assert result["calculation_steps"][0] == "N = 1(6!) - 5(5!) + 10(4!) - 10(3!) + 5(2!) - 1(1!)"
    assert result["calculation_steps"][1] == "N = 720 - 600 + 240 - 60 + 10 - 1"
    assert result["calculation_steps"][2] == "N = 309"

    # Cross-verify with independent brute-force permutation check
    reference_valid = brute_force_valid_allocations_count(benchmark_matrix)
    assert result["valid_assignments"] == reference_valid


# =====================================================================
# SPARSITY & BOTTLENECK TESTS
# =====================================================================

def test_multiple_forbidden_cells_sharing_entire_row():
    """Flight cannot use any gate: impossible to schedule -> N must equal 0."""
    matrix = [
        [1, 1, 1],
        [0, 0, 0],
        [0, 0, 0]
    ]
    result = calculate_valid_allocations(matrix)
    assert result["valid_assignments"] == 0
    assert result["valid_assignments"] == brute_force_valid_allocations_count(matrix)


def test_multiple_forbidden_cells_sharing_entire_column():
    """Gate cannot accept any flight: impossible to schedule 3 flights into 2 gates -> N must equal 0."""
    matrix = [
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0]
    ]
    result = calculate_valid_allocations(matrix)
    assert result["valid_assignments"] == 0
    assert result["valid_assignments"] == brute_force_valid_allocations_count(matrix)


def test_sparse_partial_row_restrictions():
    """Row 0 forbidden at gates 0 & 1, but allowed at gate 2: exactly 2 valid allocations."""
    matrix = [
        [1, 1, 0],
        [0, 0, 0],
        [0, 0, 0]
    ]
    result = calculate_valid_allocations(matrix)
    assert result["valid_assignments"] == 2
    assert result["valid_assignments"] == brute_force_valid_allocations_count(matrix)


def test_sim_002_regional_3x3_benchmark():
    """Test SIM-002 seed benchmark (3 flights x 3 gates, 3 forbidden cells)."""
    sim_002_seed = next(s for s in SAMPLE_SIMULATIONS if s["id"] == "SIM-002")
    matrix = sim_002_seed["matrix"]

    result = calculate_valid_allocations(matrix)
    reference = brute_force_valid_allocations_count(matrix)

    assert result["matrix_size"] == 3
    assert result["valid_assignments"] == 2
    assert result["valid_assignments"] == reference


# =====================================================================
# MATHEMATICAL STRUCTURE & COMPONENT INTEGRITY
# =====================================================================

def test_inclusion_exclusion_itemized_terms():
    """Verify structure and mathematical correctness of individual PIE terms."""
    matrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
    ]
    result = calculate_valid_allocations(matrix)
    terms = result["inclusion_exclusion_terms"]

    assert len(terms) == 4  # k = 0, 1, 2, 3

    # Check k = 0: + 1 * 3! = 6
    assert terms[0]["k"] == 0
    assert terms[0]["rook_coefficient"] == 1
    assert terms[0]["factorial_value"] == 6
    assert terms[0]["sign"] == 1
    assert terms[0]["contribution"] == 6

    # Check k = 1: - 3 * 2! = -6
    assert terms[1]["k"] == 1
    assert terms[1]["rook_coefficient"] == 3
    assert terms[1]["factorial_value"] == 2
    assert terms[1]["sign"] == -1
    assert terms[1]["contribution"] == -6

    # Check k = 2: + 3 * 1! = 3
    assert terms[2]["k"] == 2
    assert terms[2]["rook_coefficient"] == 3
    assert terms[2]["factorial_value"] == 1
    assert terms[2]["sign"] == 1
    assert terms[2]["contribution"] == 3

    # Check k = 3: - 1 * 0! = -1
    assert terms[3]["k"] == 3
    assert terms[3]["rook_coefficient"] == 1
    assert terms[3]["factorial_value"] == 1
    assert terms[3]["sign"] == -1
    assert terms[3]["contribution"] == -1

    # Sum of contributions must strictly equal valid_assignments
    assert sum(t["contribution"] for t in terms) == result["valid_assignments"]


def test_input_validation_delegation():
    """Engine must raise InvalidMatrixError on invalid inputs using existing validation rules."""
    with pytest.raises(InvalidMatrixError):
        calculate_valid_allocations(None)

    with pytest.raises(InvalidMatrixError):
        calculate_valid_allocations([])

    with pytest.raises(InvalidMatrixError):
        calculate_valid_allocations([[1, 0], [0]])  # Ragged matrix

    with pytest.raises(InvalidMatrixError):
        calculate_valid_allocations([[2, 0], [0, 1]])  # Non-binary value


def test_rectangular_inclusion_exclusion_cases():
    """Verify rectangular configurations: under-constrained (m < n) and over-constrained (m > n)."""
    # Case 1: 2 flights, 3 gates, unrestricted
    # P(3, 2) = 6
    rect_2x3_empty = [[0, 0, 0], [0, 0, 0]]
    res_2x3_empty = calculate_valid_allocations(rect_2x3_empty)
    assert res_2x3_empty["valid_assignments"] == 6
    assert res_2x3_empty["valid_assignments"] == brute_force_valid_allocations_count(rect_2x3_empty)

    # Case 2: 2 flights, 3 gates with restrictions
    rect_2x3 = [
        [1, 0, 0],
        [0, 1, 0]
    ]
    res_2x3 = calculate_valid_allocations(rect_2x3)
    assert res_2x3["num_rows"] == 2
    assert res_2x3["num_cols"] == 3
    assert res_2x3["is_square"] is False
    assert res_2x3["valid_assignments"] == brute_force_valid_allocations_count(rect_2x3)
    assert res_2x3["valid_assignments"] == 3

    # Case 3: 3 flights, 2 gates (over-constrained: flights > gates) -> N = 0
    rect_3x2 = [
        [0, 0],
        [0, 0],
        [0, 0]
    ]
    res_3x2 = calculate_valid_allocations(rect_3x2)
    assert res_3x2["is_over_constrained"] is True
    assert res_3x2["valid_assignments"] == 0
    assert res_3x2["valid_assignments"] == brute_force_valid_allocations_count(rect_3x2)

    # Case 4: 4 flights, 5 gates
    rect_4x5 = [
        [1, 0, 1, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 1]
    ]
    res_4x5 = calculate_valid_allocations(rect_4x5)
    assert res_4x5["valid_assignments"] == brute_force_valid_allocations_count(rect_4x5)
    assert res_4x5["valid_assignments"] == 42

    # Case 5: 5 flights, 4 gates (over-constrained) -> N = 0
    rect_5x4 = [
        [1, 0, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 1],
        [0, 0, 0, 0],
        [0, 1, 0, 0]
    ]
    res_5x4 = calculate_valid_allocations(rect_5x4)
    assert res_5x4["valid_assignments"] == 0
    assert res_5x4["valid_assignments"] == brute_force_valid_allocations_count(rect_5x4)
