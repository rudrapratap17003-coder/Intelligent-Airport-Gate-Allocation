"""
GateWise — Rook Polynomial Calculation Engine.
Exact combinatorial calculation of Rook Polynomial coefficients R(B, x) = sum_{k=0}^n r_k x^k
from a validated square binary restriction matrix B using row-based dynamic programming with bitmask memoization.

Mathematical Formulation:
-------------------------
Let B be an n x n binary restriction matrix where:
  - B[i][j] = 1 represents a forbidden flight-to-gate assignment.
  - B[i][j] = 0 represents an allowed flight-to-gate assignment.

The Rook Polynomial R(B, x) of board B is defined as:
  R(B, x) = r_0 + r_1 x + r_2 x^2 + ... + r_n x^n

Where:
  - r_k represents the exact number of ways to place k non-attacking rooks on forbidden cells.
  - Non-attacking condition: No two rooks may share the same row or column.
  - r_0 = 1 always (there is exactly 1 way to place 0 rooks on any board).
  - All coefficients r_k are non-negative integers.

Algorithm & Computational Complexity:
-------------------------------------
- Method: Row-by-row recursive enumeration with bitmask column tracking and dynamic programming memoization.
- State: (row_index: int, occupied_columns_mask: int)
  - row_index: Current row being processed (0 <= row_index <= n).
  - occupied_columns_mask: Bitmask where bit j is 1 if column j is occupied, 0 otherwise.
- Transitions from row i:
  1. Option A (Skip): Place no rook in row i -> count ways from (i + 1, mask).
  2. Option B (Place): For each forbidden column j in row i where bit j is clear:
     Place 1 rook -> multiplies subproblem (i + 1, mask | (1 << j)) by x.
- Time Complexity: O(n * 2^n) states, each with at most n column transitions.
  For n = 6: at most 6 * 64 = 384 subproblems (sub-millisecond execution).
- Space Complexity: O(n * 2^n) memoization cache.
- Exactness: Uses Python arbitrary-precision integers exclusively with zero floating-point calculations.
"""

from functools import lru_cache
from typing import List, Tuple, Dict, Any


SUPERSCRIPTS: Dict[str, str] = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
}


class RookPolynomialError(ValueError):
    """Base exception for Rook Polynomial engine errors."""
    pass


class InvalidMatrixError(RookPolynomialError):
    """Raised when an input matrix violates structural or value constraints."""
    pass


class MatrixDimensions(int):
    """Dual integer / tuple representation of matrix dimensions.

    Acts as an integer equal to num_rows (or dimension n when square) for backward compatibility,
    while also unpacking as a 2-tuple (num_rows, num_cols) and exposing .rows and .cols attributes.
    """
    rows: int
    cols: int

    def __new__(cls, rows: int, cols: int):
        val = rows
        obj = super().__new__(cls, val)
        obj.rows = rows
        obj.cols = cols
        return obj

    def __iter__(self):
        yield self.rows
        yield self.cols

    def __len__(self):
        return 2

    def __getitem__(self, index):
        return (self.rows, self.cols)[index]

    def __repr__(self):
        return f"MatrixDimensions(rows={self.rows}, cols={self.cols})"


def validate_restriction_matrix(matrix: Any, allow_rectangular: bool = True) -> MatrixDimensions:
    """Validate that the input is a non-empty m x n matrix containing only binary integers (0 or 1).

    Args:
        matrix: 2D array representation of the restriction board.
        allow_rectangular: If True (default), allows rectangular m x n matrices where all rows
                           have equal length. If False, strictly enforces square n x n matrices.

    Returns:
        MatrixDimensions: Board dimensions (rows, cols), compatible with int(dimension).

    Raises:
        InvalidMatrixError: If matrix is empty, ragged, non-square (when allow_rectangular=False),
                            or contains non-binary entries.
    """
    if matrix is None:
        raise InvalidMatrixError("Restriction matrix cannot be None.")

    if not isinstance(matrix, list):
        raise InvalidMatrixError(f"Matrix must be a list of lists, received {type(matrix).__name__}.")

    num_rows = len(matrix)
    if num_rows == 0:
        raise InvalidMatrixError("Restriction matrix cannot be empty (0 rows).")

    first_row = matrix[0]
    if not isinstance(first_row, list):
        raise InvalidMatrixError(f"Matrix row at index 0 must be a list, received {type(first_row).__name__}.")

    num_cols = len(first_row)
    if num_cols == 0:
        raise InvalidMatrixError("Matrix rows cannot be empty (0 columns).")

    if not allow_rectangular and num_rows != num_cols:
        raise InvalidMatrixError(
            f"Matrix must be square (n x n). Row count is {num_rows}, expected {num_cols}."
        )

    for r_idx, row in enumerate(matrix):
        if not isinstance(row, list):
            raise InvalidMatrixError(
                f"Matrix row at index {r_idx} must be a list, received {type(row).__name__}."
            )
        if len(row) != num_cols:
            raise InvalidMatrixError(
                f"Matrix has inconsistent row lengths (ragged matrix). Row {r_idx} has {len(row)} column(s), expected {num_cols}."
            )
        if not allow_rectangular and len(row) != num_rows:
            raise InvalidMatrixError(
                f"Matrix must be square (n x n). Row {r_idx} has {len(row)} column(s), expected {num_rows}."
            )
        for c_idx, cell in enumerate(row):
            # In Python, bool is a subclass of int (isinstance(True, int) is True).
            # We strictly reject booleans, floats, strings, and non-0/1 integers.
            if isinstance(cell, bool) or not isinstance(cell, int) or cell not in (0, 1):
                type_name = type(cell).__name__
                raise InvalidMatrixError(
                    f"Matrix cells must be strictly binary integers 0 or 1. "
                    f"Found value {repr(cell)} of type {type_name} at row {r_idx}, column {c_idx}."
                )

    return MatrixDimensions(num_rows, num_cols)


def format_polynomial(coefficients: List[int]) -> str:
    """Dynamically format Rook Polynomial coefficients into an algebraic string expression with unicode superscripts.

    Example:
        [1, 9, 18, 6] -> "1 + 9x + 18x² + 6x³"
        [1, 1] -> "1 + x"
        [1] -> "1"

    Args:
        coefficients: List of non-negative integer coefficients [r0, r1, ..., r_k].

    Returns:
        str: Formatted algebraic polynomial expression.
    """
    if not coefficients:
        return "0"

    terms: List[str] = []

    for degree, coeff in enumerate(coefficients):
        if coeff == 0 and degree > 0:
            continue

        if degree == 0:
            terms.append(str(coeff))
        elif degree == 1:
            if coeff == 1:
                terms.append("x")
            else:
                terms.append(f"{coeff}x")
        else:
            exp_str = "".join(SUPERSCRIPTS[d] for d in str(degree))
            if coeff == 1:
                terms.append(f"x{exp_str}")
            else:
                terms.append(f"{coeff}x{exp_str}")

    return " + ".join(terms) if terms else "0"


class RookPolynomialService:
    """Service providing exact Rook Polynomial calculation for square restriction boards."""

    @classmethod
    def calculate(cls, matrix: List[List[int]], trim_trailing_zeros: bool = True) -> Dict[str, Any]:
        """Calculate the exact Rook Polynomial coefficients R(B, x) for a given binary restriction matrix B (m x n).

        Args:
            matrix: Validated binary 2D array where 1 = forbidden cell, 0 = allowed cell.
            trim_trailing_zeros: If True, omits trailing zero coefficients past maximum rook placement.
                                 The constant coefficient r0 = 1 is always preserved.

        Returns:
            dict containing:
                - matrix_size: int (dimension n if square, or max(m, n))
                - num_rows: int (number of rows m)
                - num_cols: int (number of columns n)
                - is_square: bool (whether m == n)
                - forbidden_cell_count: int (total number of 1s)
                - coefficients: List[int] ([r0, r1, ..., r_k])
                - polynomial: str (formatted algebraic expression)
                - maximum_rook_count: int (maximum non-attacking rooks placeable)
                - algorithm: str ("row_based_dynamic_programming")

        Raises:
            InvalidMatrixError: If input fails validation.
        """
        dims = validate_restriction_matrix(matrix)
        num_rows, num_cols = dims.rows, dims.cols
        is_square = (num_rows == num_cols)

        # Optimization: If columns > rows, transpose board so bitmask width is strictly min(num_rows, num_cols)
        transposed = (num_cols > num_rows)
        if transposed:
            effective_matrix = [
                [matrix[r][c] for r in range(num_rows)]
                for c in range(num_cols)
            ]
            dp_rows = num_cols
            dp_cols = num_rows
        else:
            effective_matrix = matrix
            dp_rows = num_rows
            dp_cols = num_cols

        # Precompute forbidden column indices for each row of the effective board
        forbidden_cols_by_row: Tuple[Tuple[int, ...], ...] = tuple(
            tuple(c for c in range(dp_cols) if effective_matrix[r][c] == 1)
            for r in range(dp_rows)
        )

        forbidden_cell_count = sum(len(cols) for cols in forbidden_cols_by_row)

        # Optimization: Zero-forbidden board short-circuit (r0 = 1)
        if forbidden_cell_count == 0:
            return {
                "matrix_size": num_rows if is_square else max(num_rows, num_cols),
                "num_rows": num_rows,
                "num_cols": num_cols,
                "is_square": is_square,
                "forbidden_cell_count": 0,
                "coefficients": [1],
                "polynomial": "1",
                "maximum_rook_count": 0,
                "algorithm": "row_based_dynamic_programming"
            }

        # Optimization: Precompute whether forbidden cells exist in row suffix [start_row..dp_rows)
        has_forbidden_remaining = [
            any(len(forbidden_cols_by_row[r]) > 0 for r in range(start_row, dp_rows))
            for start_row in range(dp_rows + 1)
        ]

        # Dynamic Programming with Bitmask Column State
        @lru_cache(maxsize=None)
        def _dp(row: int, col_mask: int) -> Tuple[int, ...]:
            # Base Case: No forbidden cells remain in this row or any subsequent row -> (1,)
            if not has_forbidden_remaining[row]:
                return (1,)

            # Optimization: If current row has no forbidden columns, skip immediately to next row
            if not forbidden_cols_by_row[row]:
                return _dp(row + 1, col_mask)

            # Option A: Skip this row (place 0 rooks in row)
            res = list(_dp(row + 1, col_mask))

            # Option B: Place 1 rook in row on an available forbidden column
            for col in forbidden_cols_by_row[row]:
                if not (col_mask & (1 << col)):
                    sub = _dp(row + 1, col_mask | (1 << col))
                    # Multiplying subproblem by x shifts coefficients: sub[k] -> res[k + 1]
                    required_len = len(sub) + 1
                    if len(res) < required_len:
                        res.extend([0] * (required_len - len(res)))
                    for k, val in enumerate(sub):
                        res[k + 1] += val

            return tuple(res)

        raw_coeffs = list(_dp(0, 0))

        # Trim trailing zero coefficients if requested (always preserve at least r0)
        coeffs = list(raw_coeffs)
        if trim_trailing_zeros:
            while len(coeffs) > 1 and coeffs[-1] == 0:
                coeffs.pop()

        # Highest degree k with r_k > 0 (or 0 if only r0 exists)
        max_rook_count = 0
        for deg in range(len(coeffs) - 1, -1, -1):
            if coeffs[deg] > 0:
                max_rook_count = deg
                break

        polynomial_str = format_polynomial(coeffs)

        return {
            "matrix_size": num_rows if is_square else max(num_rows, num_cols),
            "num_rows": num_rows,
            "num_cols": num_cols,
            "is_square": is_square,
            "forbidden_cell_count": forbidden_cell_count,
            "coefficients": coeffs,
            "polynomial": polynomial_str,
            "maximum_rook_count": max_rook_count,
            "algorithm": "row_based_dynamic_programming"
        }


def calculate_rook_polynomial(matrix: List[List[int]], trim_trailing_zeros: bool = True) -> Dict[str, Any]:
    """Convenience functional wrapper for RookPolynomialService.calculate."""
    return RookPolynomialService.calculate(matrix, trim_trailing_zeros=trim_trailing_zeros)
