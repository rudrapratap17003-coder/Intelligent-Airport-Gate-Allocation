"""
GateWise — Comprehensive Test Suite for Rook Polynomial Calculation Engine.
Verifies exact combinatorial correctness, input validation, edge cases,
and cross-validates against an independent brute-force reference implementation.
"""

import itertools
import pytest

from app.services.rook_polynomial_service import (
    RookPolynomialService,
    calculate_rook_polynomial,
    InvalidMatrixError,
    format_polynomial,
    validate_restriction_matrix
)
from app.database.seed import SAMPLE_SIMULATIONS


# =====================================================================
# INDEPENDENT BRUTE-FORCE REFERENCE IMPLEMENTATION
# =====================================================================

def brute_force_rook_coefficients(matrix: list[list[int]]) -> list[int]:
    """Independent reference implementation using itertools.combinations on cell coordinates.

    Tests the mathematical definition of non-attacking rooks directly:
    Selects all subsets of k forbidden cells, asserting:
      len({r for r, c in combo}) == k (unique rows)
      len({c for r, c in combo}) == k (unique columns)

    Does NOT use dynamic programming, recursion, or bitmasks.
    """
    n = len(matrix)
    forbidden_cells = [(r, c) for r in range(n) for c in range(n) if matrix[r][c] == 1]

    coeffs = [1]  # r0 is always 1

    for k in range(1, n + 1):
        if k > len(forbidden_cells):
            break
        valid_placements = 0
        for combo in itertools.combinations(forbidden_cells, k):
            rows = {r for r, _ in combo}
            cols = {c for _, c in combo}
            if len(rows) == k and len(cols) == k:
                valid_placements += 1
        coeffs.append(valid_placements)

    # Trim trailing zero coefficients past max placement
    while len(coeffs) > 1 and coeffs[-1] == 0:
        coeffs.pop()

    return coeffs


# =====================================================================
# SECTION 6 REQUIRED EDGE CASES
# =====================================================================

def test_case_a_one_by_one_empty_forbidden():
    """Case A: One-by-one matrix with no forbidden cells [[0]].

    R(B, x) = 1, Coefficients: [1]
    """
    matrix = [[0]]
    result = calculate_rook_polynomial(matrix)

    assert result["matrix_size"] == 1
    assert result["forbidden_cell_count"] == 0
    assert result["coefficients"] == [1]
    assert result["polynomial"] == "1"
    assert result["maximum_rook_count"] == 0
    assert result["coefficients"] == brute_force_rook_coefficients(matrix)


def test_case_b_one_by_one_one_forbidden():
    """Case B: One-by-one matrix with one forbidden cell [[1]].

    R(B, x) = 1 + x, Coefficients: [1, 1]
    """
    matrix = [[1]]
    result = calculate_rook_polynomial(matrix)

    assert result["matrix_size"] == 1
    assert result["forbidden_cell_count"] == 1
    assert result["coefficients"] == [1, 1]
    assert result["polynomial"] == "1 + x"
    assert result["maximum_rook_count"] == 1
    assert result["coefficients"] == brute_force_rook_coefficients(matrix)


def test_case_c_three_by_three_empty_forbidden():
    """Case C: 3x3 matrix with no forbidden cells.

    R(B, x) = 1, Coefficients: [1]
    """
    matrix = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ]
    result = calculate_rook_polynomial(matrix)

    assert result["matrix_size"] == 3
    assert result["forbidden_cell_count"] == 0
    assert result["coefficients"] == [1]
    assert result["polynomial"] == "1"
    assert result["maximum_rook_count"] == 0
    assert result["coefficients"] == brute_force_rook_coefficients(matrix)


def test_case_d_three_by_three_fully_forbidden():
    """Case D: 3x3 matrix with every cell forbidden.

    R(B, x) = 1 + 9x + 18x² + 6x³, Coefficients: [1, 9, 18, 6]
    """
    matrix = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
    ]
    result = calculate_rook_polynomial(matrix)

    assert result["matrix_size"] == 3
    assert result["forbidden_cell_count"] == 9
    assert result["coefficients"] == [1, 9, 18, 6]
    assert result["polynomial"] == "1 + 9x + 18x² + 6x³"
    assert result["maximum_rook_count"] == 3
    assert result["coefficients"] == brute_force_rook_coefficients(matrix)


def test_case_e_standard_gatewise_6x6_benchmark():
    """Case E: Actual standard GateWise 6x6 benchmark restriction matrix.

    Retrieved directly from baseline project data (SIM-001 in seed.py).
    Forbidden cells: (0,1), (1,3), (2,4), (3,0), (4,2).
    Because all 5 cells occupy disjoint rows and columns, r_k = C(5, k).
    Coefficients must be [1, 5, 10, 10, 5, 1].
    """
    sim_001_seed = next(s for s in SAMPLE_SIMULATIONS if s["id"] == "SIM-001")
    benchmark_matrix = sim_001_seed["matrix"]

    assert len(benchmark_matrix) == 6
    assert all(len(row) == 6 for row in benchmark_matrix)

    result = calculate_rook_polynomial(benchmark_matrix)

    expected_coeffs = [1, 5, 10, 10, 5, 1]
    assert result["matrix_size"] == 6
    assert result["forbidden_cell_count"] == 5
    assert result["coefficients"] == expected_coeffs
    assert result["polynomial"] == "1 + 5x + 10x² + 10x³ + 5x⁴ + x⁵"
    assert result["maximum_rook_count"] == 5

    # Cross-verify with independent brute-force reference implementation
    reference_coeffs = brute_force_rook_coefficients(benchmark_matrix)
    assert result["coefficients"] == reference_coeffs


def test_case_f_sparse_and_irregular_boards():
    """Case F: Sparse and irregular forbidden boards."""
    # 1. Multiple forbidden cells in same row: only 1 rook can be placed
    same_row_matrix = [
        [1, 1, 1],
        [0, 0, 0],
        [0, 0, 0]
    ]
    res_row = calculate_rook_polynomial(same_row_matrix)
    assert res_row["coefficients"] == [1, 3]
    assert res_row["maximum_rook_count"] == 1
    assert res_row["coefficients"] == brute_force_rook_coefficients(same_row_matrix)

    # 2. Multiple forbidden cells in same column: only 1 rook can be placed
    same_col_matrix = [
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0]
    ]
    res_col = calculate_rook_polynomial(same_col_matrix)
    assert res_col["coefficients"] == [1, 3]
    assert res_col["maximum_rook_count"] == 1
    assert res_col["coefficients"] == brute_force_rook_coefficients(same_col_matrix)

    # 3. L-shaped board on 2x2: (0,0), (0,1), (1,0)
    # r0 = 1, r1 = 3, r2 = 1 (only placement is (0,1) and (1,0))
    l_shaped = [
        [1, 1],
        [1, 0]
    ]
    res_l = calculate_rook_polynomial(l_shaped)
    assert res_l["coefficients"] == [1, 3, 1]
    assert res_l["polynomial"] == "1 + 3x + x²"
    assert res_l["coefficients"] == brute_force_rook_coefficients(l_shaped)

    # 4. Identity diagonal board on 4x4 (n independent rooks, coeffs = binomial(4, k))
    diag_4x4 = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ]
    res_diag = calculate_rook_polynomial(diag_4x4)
    assert res_diag["coefficients"] == [1, 4, 6, 4, 1]
    assert res_diag["coefficients"] == brute_force_rook_coefficients(diag_4x4)

    # 5. Row with 0 forbidden cells and column with 0 forbidden cells
    sparse_3x3 = [
        [1, 0, 0],
        [0, 0, 0],
        [0, 1, 0]
    ]
    res_sparse = calculate_rook_polynomial(sparse_3x3)
    assert res_sparse["coefficients"] == [1, 2, 1]
    assert res_sparse["coefficients"] == brute_force_rook_coefficients(sparse_3x3)


# =====================================================================
# SECTION 5 INPUT VALIDATION TESTS
# =====================================================================

def test_validation_rejects_none_and_empty():
    """Engine must reject None or empty matrices."""
    with pytest.raises(InvalidMatrixError, match="cannot be None"):
        calculate_rook_polynomial(None)

    with pytest.raises(InvalidMatrixError, match="cannot be empty"):
        calculate_rook_polynomial([])


def test_validation_rejects_rectangular_matrix():
    """Engine must strictly reject non-square (rectangular) matrices."""
    # 2 rows, 3 columns
    rect_2x3 = [
        [0, 1, 0],
        [1, 0, 1]
    ]
    with pytest.raises(InvalidMatrixError, match="square"):
        calculate_rook_polynomial(rect_2x3)

    # 3 rows, 1 column
    rect_3x1 = [
        [1],
        [0],
        [1]
    ]
    with pytest.raises(InvalidMatrixError, match="square"):
        calculate_rook_polynomial(rect_3x1)


def test_validation_rejects_ragged_matrix():
    """Engine must reject rows of inconsistent lengths."""
    ragged = [
        [1, 0, 0],
        [0, 1],
        [0, 0, 1]
    ]
    with pytest.raises(InvalidMatrixError, match="square"):
        calculate_rook_polynomial(ragged)


def test_validation_rejects_non_binary_values():
    """Engine must strictly reject non-0/1 integers, floats, booleans, and strings."""
    # Non-binary integer
    with pytest.raises(InvalidMatrixError, match="binary integers 0 or 1"):
        calculate_rook_polynomial([[0, 2], [1, 0]])

    with pytest.raises(InvalidMatrixError, match="binary integers 0 or 1"):
        calculate_rook_polynomial([[0, -1], [1, 0]])

    # Float (even if 1.0 or 0.0)
    with pytest.raises(InvalidMatrixError, match="binary integers 0 or 1"):
        calculate_rook_polynomial([[1.0, 0], [0, 1]])

    # Boolean (True/False must not be silently cast to 1/0)
    with pytest.raises(InvalidMatrixError, match="binary integers 0 or 1"):
        calculate_rook_polynomial([[True, 0], [0, 1]])

    with pytest.raises(InvalidMatrixError, match="binary integers 0 or 1"):
        calculate_rook_polynomial([[0, False], [1, 0]])

    # String
    with pytest.raises(InvalidMatrixError, match="binary integers 0 or 1"):
        calculate_rook_polynomial([["1", 0], [0, 1]])


# =====================================================================
# SECTION 7 OUTPUT STRUCTURE & PROPERTIES
# =====================================================================

def test_output_structure_and_types():
    """Engine must return exact required keys and integer types."""
    matrix = [
        [0, 1, 0],
        [1, 0, 0],
        [0, 0, 1]
    ]
    result = calculate_rook_polynomial(matrix)

    assert isinstance(result["matrix_size"], int)
    assert isinstance(result["forbidden_cell_count"], int)
    assert isinstance(result["coefficients"], list)
    assert isinstance(result["polynomial"], str)
    assert isinstance(result["maximum_rook_count"], int)
    assert isinstance(result["algorithm"], str)

    # Check non-negative exact integers
    assert all(isinstance(c, int) and c >= 0 for c in result["coefficients"])
    assert result["coefficients"][0] == 1  # Constant term r0 is always 1


def test_polynomial_formatter_direct():
    """Verify algebraic formatting helper with unicode superscripts."""
    assert format_polynomial([1]) == "1"
    assert format_polynomial([1, 1]) == "1 + x"
    assert format_polynomial([1, 5, 10, 10, 5, 1]) == "1 + 5x + 10x² + 10x³ + 5x⁴ + x⁵"
    assert format_polynomial([1, 0, 4]) == "1 + 4x²"
    assert format_polynomial([1, 1, 1]) == "1 + x + x²"


def test_sim_002_regional_benchmark():
    """Test SIM-002 benchmark scenario (3x3 with 3 forbidden cells)."""
    sim_002_seed = next(s for s in SAMPLE_SIMULATIONS if s["id"] == "SIM-002")
    matrix = sim_002_seed["matrix"]

    result = calculate_rook_polynomial(matrix)
    reference = brute_force_rook_coefficients(matrix)

    assert result["coefficients"] == reference
    assert result["matrix_size"] == 3
    assert result["forbidden_cell_count"] == 3
