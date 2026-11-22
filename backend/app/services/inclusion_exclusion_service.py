"""
GateWise — Inclusion-Exclusion Calculation Engine.
Calculates the exact number of conflict-free valid flight-to-gate assignments
using the Principle of Inclusion-Exclusion (PIE) in conjunction with the Rook Polynomial:

Mathematical Formulation:
-------------------------
N = sum_{k=0}^n (-1)^k * r_k * (n - k)!

Where:
  - N = exact number of valid, conflict-free assignments (non-negative integer).
  - n = number of flights and gates (dimension of the square matrix).
  - r_k = number of ways to place k non-attacking rooks on forbidden cells (from Phase 13).
  - (n - k)! = number of unrestricted assignments remaining for unplaced items.
  - (-1)^k = alternating sign from the Principle of Inclusion-Exclusion.
  - Total possible assignments without restrictions = n!
  - Invalid assignments = n! - N
  - Feasibility percentage = (N / n!) * 100%

All mathematical computations use Python arbitrary-precision integers exclusively.
Floating-point arithmetic is restricted to presentation percentage calculation.
"""

import math
from typing import List, Dict, Any

from app.services.rook_polynomial_service import (
    RookPolynomialService,
    validate_restriction_matrix
)


class InclusionExclusionService:
    """Service providing exact Inclusion-Exclusion calculation for airport gate allocation."""

    @classmethod
    def calculate(cls, matrix: List[List[int]]) -> Dict[str, Any]:
        """Calculate the exact number of valid assignments N using the Inclusion-Exclusion formula.

        Args:
            matrix: Validated square binary restriction matrix (1 = forbidden, 0 = allowed).

        Returns:
            dict containing:
                - matrix_size: int
                - forbidden_cell_count: int
                - rook_coefficients: List[int]
                - polynomial: str
                - factorial_terms: List[int]
                - inclusion_exclusion_terms: List[Dict[str, Any]]
                - total_possible_assignments: int
                - valid_assignments: int
                - invalid_assignments: int
                - feasibility_percentage: float
                - calculation_steps: List[str]

        Raises:
            InvalidMatrixError: If input fails structural or binary validation.
        """
        # 1. Validate matrix dimensions and binary integrity
        dims = validate_restriction_matrix(matrix)
        num_rows, num_cols = dims.rows, dims.cols
        is_square = (num_rows == num_cols)
        matrix_size = num_rows if is_square else max(num_rows, num_cols)

        # 2. Invoke authoritative Rook Polynomial Engine (Phase 13)
        rook_result = RookPolynomialService.calculate(matrix, trim_trailing_zeros=False)
        r_coeffs = rook_result["coefficients"]
        forbidden_cell_count = rook_result["forbidden_cell_count"]
        polynomial = rook_result["polynomial"]

        # Truncate rook_coefficients for display past highest non-zero rook count, keeping at least r0
        display_rook_coeffs = list(r_coeffs)
        while len(display_rook_coeffs) > 1 and display_rook_coeffs[-1] == 0:
            display_rook_coeffs.pop()

        # 3. Handle over-constrained case: more flights than gates (m > n)
        if num_rows > num_cols:
            return {
                "matrix_size": matrix_size,
                "num_rows": num_rows,
                "num_cols": num_cols,
                "is_square": False,
                "is_over_constrained": True,
                "forbidden_cell_count": forbidden_cell_count,
                "rook_coefficients": display_rook_coeffs,
                "polynomial": polynomial,
                "factorial_terms": [0],
                "inclusion_exclusion_terms": [],
                "total_possible_assignments": 0,
                "valid_assignments": 0,
                "invalid_assignments": 0,
                "feasibility_percentage": 0.0,
                "calculation_steps": [
                    f"N = 0 (Pigeonhole Principle: {num_rows} flights exceed {num_cols} gates)"
                ]
            }

        # 4. For m <= n:
        # Total unrestricted injective assignments P(n, m) = n! / (n - m)!
        total_possible_assignments = math.perm(num_cols, num_rows)

        # Factorial / permutation terms: P(n - k, m - k) for k = 0, ..., m
        # When m == n, math.perm(n - k, n - k) == (n - k)! exactly
        factorial_terms: List[int] = [math.perm(num_cols - k, num_rows - k) for k in range(num_rows + 1)]

        # 5. Itemized Inclusion-Exclusion terms
        inclusion_exclusion_terms: List[Dict[str, Any]] = []
        valid_assignments: int = 0

        # Step formatting buffers
        step1_parts: List[str] = []
        step2_parts: List[str] = []

        for k in range(num_rows + 1):
            sign = 1 if k % 2 == 0 else -1
            r_k = r_coeffs[k] if k < len(r_coeffs) else 0
            fact_val = factorial_terms[k]
            contribution = sign * r_k * fact_val

            inclusion_exclusion_terms.append({
                "k": k,
                "rook_coefficient": r_k,
                "factorial_value": fact_val,
                "sign": sign,
                "contribution": contribution
            })

            valid_assignments += contribution

            # Build readable calculation step strings for non-zero contributions (and always for k=0)
            if k == 0 or r_k > 0:
                if is_square:
                    term_symbol = f"{r_k}({num_rows - k}!)"
                else:
                    term_symbol = f"{r_k}·P({num_cols - k}, {num_rows - k})"

                if not step1_parts:
                    step1_parts.append(term_symbol)
                    step2_parts.append(str(contribution))
                else:
                    sign_symbol = "+" if sign > 0 else "-"
                    step1_parts.append(f"{sign_symbol} {term_symbol}")
                    step2_parts.append(f"{sign_symbol} {abs(contribution)}")

        # Mathematical sanity check
        if valid_assignments < 0 or valid_assignments > total_possible_assignments:
            raise ValueError(
                f"Mathematical invariant violation: valid assignments ({valid_assignments}) "
                f"must be between 0 and {total_possible_assignments}."
            )

        invalid_assignments = total_possible_assignments - valid_assignments

        feasibility_percentage = (
            (valid_assignments / total_possible_assignments) * 100.0
            if total_possible_assignments > 0 else 0.0
        )

        calculation_steps = [
            f"N = {' '.join(step1_parts)}",
            f"N = {' '.join(step2_parts)}",
            f"N = {valid_assignments}"
        ]

        return {
            "matrix_size": matrix_size,
            "num_rows": num_rows,
            "num_cols": num_cols,
            "is_square": is_square,
            "is_over_constrained": False,
            "forbidden_cell_count": forbidden_cell_count,
            "rook_coefficients": display_rook_coeffs,
            "polynomial": polynomial,
            "factorial_terms": factorial_terms,
            "inclusion_exclusion_terms": inclusion_exclusion_terms,
            "total_possible_assignments": total_possible_assignments,
            "valid_assignments": valid_assignments,
            "invalid_assignments": invalid_assignments,
            "feasibility_percentage": feasibility_percentage,
            "calculation_steps": calculation_steps
        }


def calculate_valid_allocations(matrix: List[List[int]]) -> Dict[str, Any]:
    """Convenience functional wrapper for InclusionExclusionService.calculate."""
    return InclusionExclusionService.calculate(matrix)
