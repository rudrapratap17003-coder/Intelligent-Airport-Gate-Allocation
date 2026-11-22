"""
GateWise — Phase 15 Comprehensive Mathematical Unit & Invariant Testing Suite.
Includes:
  1. Test-only independent reference implementations for Rook Polynomials and Valid Allocations.
  2. Exhaustive testing of ALL 512 possible 3x3 binary restriction matrices against both references.
  3. Mathematical invariants (bounds, symmetry, transposition, row/column permutations).
  4. Diverse structural edge cases (single row/col, diagonal, anti-diagonal, block disjoint).
  5. Input validation regressions for both Rook Polynomial and Inclusion-Exclusion engines.
  6. Performance benchmarks across representative matrix sizes (3x3, 6x6, 8x8 sparse & dense).
"""

import itertools
import math
import time
import pytest
from typing import List, Tuple

from app.services.rook_polynomial_service import (
    RookPolynomialService,
    calculate_rook_polynomial,
    InvalidMatrixError
)
from app.services.inclusion_exclusion_service import (
    InclusionExclusionService,
    calculate_valid_allocations
)
from app.database.seed import SAMPLE_SIMULATIONS


# =====================================================================
# 1. TEST-ONLY INDEPENDENT REFERENCE IMPLEMENTATIONS
# =====================================================================

def reference_rook_coefficients(matrix: List[List[int]]) -> List[int]:
    """Independent reference implementation: Coordinate-subset enumeration.

    1. Identifies all forbidden coordinates (r, c) where matrix[r][c] == 1.
    2. Enumerates all k-subsets of coordinates using itertools.combinations.
    3. Checks non-attacking constraint: len(rows) == k and len(cols) == k.
    4. Accumulates valid non-attacking counts.
    Does NOT use dynamic programming, recursion, or bitmasks.
    """
    n = len(matrix)
    forbidden_coords = [
        (r, c) for r in range(n) for c in range(n) if matrix[r][c] == 1
    ]

    coeffs = [1]  # r0 is always 1

    for k in range(1, n + 1):
        if k > len(forbidden_coords):
            break
        valid_ways = 0
        for combo in itertools.combinations(forbidden_coords, k):
            rows = {r for r, _ in combo}
            cols = {c for _, c in combo}
            if len(rows) == k and len(cols) == k:
                valid_ways += 1
        coeffs.append(valid_ways)

    # Trim trailing zeros past highest non-zero rook count
    while len(coeffs) > 1 and coeffs[-1] == 0:
        coeffs.pop()

    return coeffs


def reference_valid_allocations(matrix: List[List[int]]) -> int:
    """Independent reference implementation: Permutation enumeration.

    1. Enumerates all n! permutations of gates [0, ..., n-1].
    2. Examines every (flight_idx, gate_idx) pair.
    3. Rejects permutations containing any forbidden assignment (matrix[i][p[i]] == 1).
    4. Counts the remaining valid permutations.
    Does NOT use Rook Polynomials, generating functions, or Inclusion-Exclusion.
    """
    n = len(matrix)
    valid_count = 0
    for perm in itertools.permutations(range(n)):
        if all(matrix[flight_idx][gate_idx] == 0 for flight_idx, gate_idx in enumerate(perm)):
            valid_count += 1
    return valid_count


# =====================================================================
# 2. EXHAUSTIVE 3x3 MATRIX TESTING (ALL 2^9 = 512 MATRICES)
# =====================================================================

def test_exhaustive_all_512_3x3_matrices():
    """Generate every single one of the 2^9 = 512 possible 3x3 binary matrices.

    For every matrix:
      - Compare production Rook Polynomial against reference_rook_coefficients.
      - Compare production Inclusion-Exclusion against reference_valid_allocations.
    Assert 100% agreement across all 512 cases.
    """
    total_matrices = 512
    rook_matches = 0
    pie_matches = 0

    for bitmask in range(total_matrices):
        # Unpack 9 bits into 3x3 binary matrix
        matrix = [
            [(bitmask >> (r * 3 + c)) & 1 for c in range(3)]
            for r in range(3)
        ]

        # 1. Rook Polynomial Comparison
        prod_rook = RookPolynomialService.calculate(matrix)["coefficients"]
        ref_rook = reference_rook_coefficients(matrix)

        if prod_rook != ref_rook:
            pytest.fail(
                f"Rook polynomial mismatch on 3x3 matrix #{bitmask}:\n"
                f"Matrix: {matrix}\n"
                f"Production: {prod_rook}\n"
                f"Reference:  {ref_rook}"
            )
        rook_matches += 1

        # 2. Inclusion-Exclusion Comparison
        prod_pie = InclusionExclusionService.calculate(matrix)["valid_assignments"]
        ref_pie = reference_valid_allocations(matrix)

        if prod_pie != ref_pie:
            pytest.fail(
                f"Inclusion-Exclusion mismatch on 3x3 matrix #{bitmask}:\n"
                f"Matrix: {matrix}\n"
                f"Production: {prod_pie}\n"
                f"Reference:  {ref_pie}"
            )
        pie_matches += 1

    assert rook_matches == 512, f"Expected 512 rook matches, got {rook_matches}"
    assert pie_matches == 512, f"Expected 512 PIE matches, got {pie_matches}"


# =====================================================================
# 3. MATHEMATICAL INVARIANT TESTING
# =====================================================================

def test_rook_polynomial_invariants():
    """Verify core theoretical properties of Rook Polynomials."""
    test_matrices = [
        [[0]],
        [[1]],
        [[0, 1], [1, 0]],
        [[1, 1], [0, 0]],
        [[1, 0, 1], [0, 1, 0], [1, 0, 1]],
        [[0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 0, 0], [0, 0, 0, 1]],
    ]

    for matrix in test_matrices:
        n = len(matrix)
        res = calculate_rook_polynomial(matrix)
        coeffs = res["coefficients"]
        forbidden_count = sum(matrix[r][c] for r in range(n) for c in range(n))

        # 1. Constant term r0 is always strictly 1
        assert coeffs[0] == 1

        # 2. All coefficients are non-negative integers
        assert all(isinstance(c, int) and c >= 0 for c in coeffs)

        # 3. r1 equals the exact number of forbidden cells
        if len(coeffs) > 1:
            assert coeffs[1] == forbidden_count
        else:
            assert forbidden_count == 0

        # 4. Maximum degree cannot exceed n
        assert len(coeffs) - 1 <= n

        # 5. Theoretical upper bound: r_k <= C(n, k)^2 * k!
        for k, r_k in enumerate(coeffs):
            theoretical_max = (math.comb(n, k) ** 2) * math.factorial(k)
            assert r_k <= theoretical_max, f"r_{k}={r_k} exceeds bound {theoretical_max}"


def test_fully_forbidden_matrix_theoretical_upper_bound():
    """For a fully forbidden n x n board, r_k must equal C(n, k)^2 * k! exactly."""
    for n in range(1, 6):
        full_matrix = [[1 for _ in range(n)] for _ in range(n)]
        res = calculate_rook_polynomial(full_matrix)
        coeffs = res["coefficients"]

        expected_coeffs = [
            (math.comb(n, k) ** 2) * math.factorial(k)
            for k in range(n + 1)
        ]
        assert coeffs == expected_coeffs


def test_zero_forbidden_matrix_invariant():
    """An all-zero board must produce R(B, x) = 1 and N = n! for all n."""
    for n in range(1, 6):
        zero_matrix = [[0 for _ in range(n)] for _ in range(n)]
        res_rook = calculate_rook_polynomial(zero_matrix)
        assert res_rook["coefficients"] == [1]
        assert res_rook["polynomial"] == "1"

        res_pie = calculate_valid_allocations(zero_matrix)
        assert res_pie["valid_assignments"] == math.factorial(n)
        assert res_pie["invalid_assignments"] == 0
        assert res_pie["feasibility_percentage"] == 100.0


def test_matrix_symmetry_and_transformation_invariants():
    """Transposing, row-permuting, or column-permuting a board must NOT change R(B, x) or N."""
    # Test on a distinct asymmetric 4x4 matrix
    asymmetric_4x4 = [
        [1, 1, 0, 0],
        [0, 1, 0, 1],
        [0, 0, 0, 0],
        [1, 0, 1, 0]
    ]

    base_rook = calculate_rook_polynomial(asymmetric_4x4)["coefficients"]
    base_pie = calculate_valid_allocations(asymmetric_4x4)["valid_assignments"]

    # 1. Transpose: B^T
    transposed = [
        [asymmetric_4x4[c][r] for c in range(4)]
        for r in range(4)
    ]
    assert calculate_rook_polynomial(transposed)["coefficients"] == base_rook
    assert calculate_valid_allocations(transposed)["valid_assignments"] == base_pie

    # 2. Row Permutations: Permute rows to (2, 0, 3, 1)
    row_permuted = [
        asymmetric_4x4[2],
        asymmetric_4x4[0],
        asymmetric_4x4[3],
        asymmetric_4x4[1]
    ]
    assert calculate_rook_polynomial(row_permuted)["coefficients"] == base_rook
    assert calculate_valid_allocations(row_permuted)["valid_assignments"] == base_pie

    # 3. Column Permutations: Permute columns to (3, 1, 0, 2)
    col_permuted = [
        [row[3], row[1], row[0], row[2]]
        for row in asymmetric_4x4
    ]
    assert calculate_rook_polynomial(col_permuted)["coefficients"] == base_rook
    assert calculate_valid_allocations(col_permuted)["valid_assignments"] == base_pie


def test_inclusion_exclusion_invariants():
    """Verify fundamental mathematical invariants of the Inclusion-Exclusion engine."""
    matrices_to_check = [
        [[1]],
        [[0]],
        [[1, 0], [0, 1]],
        [[1, 1], [1, 1]],
        [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
        [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
    ]

    for matrix in matrices_to_check:
        n = len(matrix)
        total_perms = math.factorial(n)
        result = calculate_valid_allocations(matrix)

        valid = result["valid_assignments"]
        invalid = result["invalid_assignments"]
        pct = result["feasibility_percentage"]

        # Valid assignments must be in [0, n!]
        assert 0 <= valid <= total_perms

        # Valid + Invalid must equal n!
        assert valid + invalid == total_perms

        # Percentage matches (valid / total) * 100
        expected_pct = (valid / total_perms) * 100.0
        assert math.isclose(pct, expected_pct, rel_tol=1e-9)
        assert 0.0 <= pct <= 100.0


# =====================================================================
# 4. ADDITIONAL EDGE CASE TESTING
# =====================================================================

def test_diagonal_vs_antidiagonal_derangements():
    """On an n x n matrix, the main diagonal and anti-diagonal are both derangement boards."""
    for n in range(2, 5):
        diag = [[1 if r == c else 0 for c in range(n)] for r in range(n)]
        anti_diag = [[1 if r + c == n - 1 else 0 for c in range(n)] for r in range(n)]

        res_diag = calculate_valid_allocations(diag)
        res_anti = calculate_valid_allocations(anti_diag)

        # Both must have identical coefficients and identical valid allocations
        assert res_diag["rook_coefficients"] == res_anti["rook_coefficients"]
        assert res_diag["valid_assignments"] == res_anti["valid_assignments"]
        assert res_diag["valid_assignments"] == reference_valid_allocations(diag)


def test_disconnected_sub_board_factorization():
    """A board consisting of two disconnected 2x2 blocks inside a 4x4:

    B = [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 1, 1]
    ]
    By rook polynomial theory, R(B1 + B2, x) = R(B1, x) * R(B2, x).
    Here B1 is 2x2 fully forbidden: R(B1, x) = 1 + 4x + 2x^2.
    R(B, x) = (1 + 4x + 2x^2)^2 = 1 + 8x + 20x^2 + 16x^3 + 4x^4.
    """
    block_matrix = [
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 1, 1],
        [0, 0, 1, 1]
    ]
    res = calculate_rook_polynomial(block_matrix)
    assert res["coefficients"] == [1, 8, 20, 16, 4]
    assert res["coefficients"] == reference_rook_coefficients(block_matrix)

    # PIE: N = 4! - 8(3!) + 20(2!) - 16(1!) + 4(0!) = 24 - 48 + 40 - 16 + 4 = 4
    res_pie = calculate_valid_allocations(block_matrix)
    assert res_pie["valid_assignments"] == 4
    assert res_pie["valid_assignments"] == reference_valid_allocations(block_matrix)


# =====================================================================
# 5. INPUT VALIDATION REGRESSION ON BOTH ENGINES
# =====================================================================

@pytest.mark.parametrize("invalid_input", [
    None,
    [],
    [[]],
    [[1, 0], [1]],  # Ragged
    [[1, 0, 0], [0, 1]],  # Ragged
    [[1, 2], [0, 1]],  # Value > 1
    [[1, -1], [0, 1]],  # Value < 0
    [[1.0, 0], [0, 1]],  # Float
    [[0, 0.0], [0, 1]],  # Float 0.0
    [[True, False], [False, True]],  # Booleans
    [["1", "0"], ["0", "1"]],  # Strings
    [{"row": [1, 0]}, [0, 1]],  # Dict in list
])
def test_input_validation_regression(invalid_input):
    """Ensure both engines reject invalid, malformed, or typed inputs with InvalidMatrixError."""
    with pytest.raises(InvalidMatrixError):
        RookPolynomialService.calculate(invalid_input)

    with pytest.raises(InvalidMatrixError):
        InclusionExclusionService.calculate(invalid_input)


def test_rectangular_matrix_comprehensive():
    """Verify rectangular boards across both RookPolynomialService and InclusionExclusionService."""
    # 2x3 board
    m_2x3 = [
        [1, 0, 0],
        [0, 1, 0]
    ]
    rook_res = RookPolynomialService.calculate(m_2x3)
    assert rook_res["coefficients"] == [1, 2, 1]
    assert rook_res["is_square"] is False

    pie_res = InclusionExclusionService.calculate(m_2x3)
    assert pie_res["valid_assignments"] == 3
    assert pie_res["total_possible_assignments"] == 6

    # 3x2 over-constrained board (flights > gates)
    m_3x2 = [
        [0, 0],
        [0, 0],
        [0, 0]
    ]
    pie_3x2 = InclusionExclusionService.calculate(m_3x2)
    assert pie_3x2["is_over_constrained"] is True
    assert pie_3x2["valid_assignments"] == 0


# =====================================================================
# 6. PERFORMANCE CHECKS
# =====================================================================

def test_performance_benchmarks(capsys):
    """Measure and verify actual execution time across representative matrix configurations:

      1. 3x3 sparse matrix.
      2. 6x6 GateWise benchmark scenario (SIM-001).
      3. 8x8 sparse matrix (typical operational schedule).
      4. 8x8 dense matrix (stress configuration).
    """
    # 1. 3x3 Sparse
    m_3x3 = [[0, 1, 0], [0, 0, 1], [1, 0, 0]]
    t0 = time.perf_counter()
    r_3x3 = calculate_valid_allocations(m_3x3)
    t_3x3 = time.perf_counter() - t0

    # 2. 6x6 Benchmark
    sim_001_seed = next(s for s in SAMPLE_SIMULATIONS if s["id"] == "SIM-001")
    m_6x6 = sim_001_seed["matrix"]
    t0 = time.perf_counter()
    r_6x6 = calculate_valid_allocations(m_6x6)
    t_6x6 = time.perf_counter() - t0

    # 3. 8x8 Sparse (8 forbidden cells spread out)
    m_8x8_sparse = [[1 if (r + 2) % 8 == c else 0 for c in range(8)] for r in range(8)]
    t0 = time.perf_counter()
    r_8x8_sparse = calculate_valid_allocations(m_8x8_sparse)
    t_8x8_sparse = time.perf_counter() - t0

    # 4. 8x8 Dense (chess pattern, 32 forbidden cells)
    m_8x8_dense = [[1 if (r + c) % 2 == 0 else 0 for c in range(8)] for r in range(8)]
    t0 = time.perf_counter()
    r_8x8_dense = calculate_valid_allocations(m_8x8_dense)
    t_8x8_dense = time.perf_counter() - t0

    # Print captured report
    print(f"\n--- GateWise Mathematical Engine Performance Benchmarks ---")
    print(f"3x3 Sparse Matrix:       {t_3x3 * 1000:.3f} ms (N = {r_3x3['valid_assignments']})")
    print(f"6x6 Benchmark (SIM-001): {t_6x6 * 1000:.3f} ms (N = {r_6x6['valid_assignments']})")
    print(f"8x8 Sparse Matrix:       {t_8x8_sparse * 1000:.3f} ms (N = {r_8x8_sparse['valid_assignments']})")
    print(f"8x8 Dense Matrix:        {t_8x8_dense * 1000:.3f} ms (N = {r_8x8_dense['valid_assignments']})")

    # Assert sub-second execution thresholds for interactive simulation
    assert t_3x3 < 0.05
    assert t_6x6 < 0.05
    assert t_8x8_sparse < 0.10
    assert t_8x8_dense < 0.50
