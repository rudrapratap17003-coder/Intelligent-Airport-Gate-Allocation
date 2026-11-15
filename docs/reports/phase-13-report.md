# Phase 13 — Rook Polynomial Calculation Engine Report

**Project**: GateWise — Intelligent Airport Gate Allocation Using Discrete Mathematics  
**Phase**: 13 — Rook Polynomial Calculation Engine  
**Status**: Completed & Verified  
**Date**: November 15, 2026  

---

## 1. Executive Summary

Phase 13 delivers the core combinatorial engine for GateWise: the exact **Rook Polynomial Calculation Engine**. 

Given an $n \times n$ square binary restriction matrix $B$ (where $1$ denotes a forbidden flight-to-gate assignment and $0$ denotes an allowed assignment), the engine computes the exact integer coefficients of the Rook Polynomial:
$$R(B, x) = r_0 + r_1 x + r_2 x^2 + \dots + r_n x^n$$
where $r_k$ represents the exact number of ways to place $k$ mutually non-attacking rooks on the forbidden cells of $B$.

The service is completely decoupled from database persistence, frontend rendering, and future Inclusion-Exclusion calculations. It utilizes arbitrary-precision Python integers with zero floating-point approximation, incorporates strict input validation, and has been cross-verified against an independent coordinate-subset brute-force reference implementation.

---

## 2. Mathematical Definition & Rules

A valid placement of $k$ rooks on board $B$ satisfies:
1. **Forbidden Location**: Every rook occupies a forbidden cell ($B[i][j] = 1$).
2. **Row Exclusivity**: No two rooks share the same row (each row has $\le 1$ rook).
3. **Column Exclusivity**: No two rooks share the same column (each column has $\le 1$ rook).
4. **Empty Placement**: $r_0 = 1$ always, representing the single trivial way to place zero rooks.
5. **Non-negativity**: All coefficients $r_k \ge 0$ are non-negative integers.
6. **Board Bound**: For an $n \times n$ board, $r_k = 0$ for all $k > n$.

---

## 3. Algorithm Architecture & Complexity

### 3.1 Row-Based Dynamic Programming with Bitmask Memoization

Instead of enumerating all $n!$ full assignment permutations (which is factorial $O(n!)$) or naively checking all $\binom{n^2}{k}$ cell combinations, the engine utilizes a **row-by-row dynamic programming algorithm with column bitmask memoization**:

- **State Representation**: `(row_idx, col_mask)`
  - `row_idx` $\in \{0, 1, \dots, n\}$: The current row being decided.
  - `col_mask` $\in \{0, 1, \dots, 2^n - 1\}$: An integer bitmask where bit $j$ is $1$ if column $j$ is already occupied by a previously placed rook, and $0$ otherwise.
  - **Subproblem Value**: A tuple $(c_0, c_1, \dots)$ representing the polynomial generating function for rook placements in rows `row_idx..n-1`.

- **Base Case**:
  - `row_idx == n`: All rows have been traversed. Exactly $0$ additional rooks can be placed $\implies (1,)$ ($1 \cdot x^0$).

- **Transitions for Row `row_idx`**:
  1. **Option A (Skip Row)**: Place no rook in `row_idx`.
     $$\text{Poly}_{\text{skip}} = \text{DP}(\text{row\_idx} + 1, \text{col\_mask})$$
  2. **Option B (Place Rook)**: For each column $j$ where $B[\text{row\_idx}][j] == 1$ and $(col\_mask \ \& \ (1 \ll j)) == 0$:
     Placing a rook at $(\text{row\_idx}, j)$ consumes column $j$ and increases the rook count by $1$ (multiplying the subproblem polynomial by $x$):
     $$\text{Poly}_{\text{col } j} = x \cdot \text{DP}(\text{row\_idx} + 1, \text{col\_mask} \mid (1 \ll j))$$
  3. **Aggregation**:
     $$\text{DP}(\text{row\_idx}, \text{col\_mask}) = \text{Poly}_{\text{skip}} + \sum_{j \in \text{valid}(row\_idx)} \text{Poly}_{\text{col } j}$$

### 3.2 Computational Complexity
- **State Space**: At most $(n + 1) \times 2^n$ distinct subproblems.
- **Per-State Work**: At most $n$ column transitions, performing polynomial additions of degree $\le n$.
- **Time Complexity**: $\mathcal{O}(n^2 \cdot 2^n)$ in the worst case (for completely dense boards). For $n = 6$, $(6 \times 64) \times 6 \approx 2,304$ operations (under 1 millisecond).
- **Space Complexity**: $\mathcal{O}(n \cdot 2^n)$ for memoization cache.
- **Exactness**: Arithmetic performed exclusively using Python arbitrary-precision integers (`int`).

---

## 4. Input Validation & Exception Handling

The engine independently validates its input matrix prior to calculation:
- **Null & Type Check**: Must be a non-null Python `list` of `list`s.
- **Non-Empty Check**: Dimension $n \ge 1$; empty matrices (`[]`) are rejected.
- **Square Dimension**: Number of columns in each row must strictly equal the number of rows $n$. Non-square ($2 \times 3$, $3 \times 1$) and ragged matrices raise `InvalidMatrixError`.
- **Strict Binary Integrity**: Each cell must strictly be an integer $0$ or $1$. Non-binary integers (e.g. $2$, $-1$), floats (e.g. $1.0$, $0.0$), strings (e.g. `'1'`), and booleans (`True`/`False`, which are subclasses of `int` in Python) are rejected with explicit type-differentiated error messages.

---

## 5. Standard GateWise 6×6 Benchmark Matrix & Calculated Coefficients

The benchmark scenario `SIM-001` (from [seed.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/database/seed.py)) defines the following $6 \times 6$ restriction matrix:

```
        G1   G2   G3   G4   G5   G6
AI101 [  0,   1,   0,   0,   0,   0  ]  (Flight 0 cannot use Gate 1)
UK202 [  0,   0,   0,   1,   0,   0  ]  (Flight 1 cannot use Gate 3)
6E303 [  0,   0,   0,   0,   1,   0  ]  (Flight 2 cannot use Gate 4)
SG404 [  1,   0,   0,   0,   0,   0  ]  (Flight 3 cannot use Gate 0)
AI505 [  0,   0,   1,   0,   0,   0  ]  (Flight 4 cannot use Gate 2)
UK606 [  0,   0,   0,   0,   0,   0  ]  (Flight 5 is unrestricted)
```

### 5.1 Combinatorial Analysis
- Total forbidden cells $m = 5$: $(0,1), (1,3), (2,4), (3,0), (4,2)$.
- Notice that no two forbidden cells share a row ($0, 1, 2, 3, 4$ are distinct) and no two share a column ($1, 3, 4, 0, 2$ are distinct).
- Therefore, every subset of $k$ forbidden cells is mutually non-attacking!
- Analytically, the coefficients must follow the binomial distribution: $r_k = \binom{5}{k}$:
  - $r_0 = \binom{5}{0} = 1$
  - $r_1 = \binom{5}{1} = 5$
  - $r_2 = \binom{5}{2} = 10$
  - $r_3 = \binom{5}{3} = 10$
  - $r_4 = \binom{5}{4} = 5$
  - $r_5 = \binom{5}{5} = 1$
  - $r_6 = 0$ (omitted from polynomial)

### 5.2 Engine Output for SIM-001
```json
{
  "matrix_size": 6,
  "forbidden_cell_count": 5,
  "coefficients": [1, 5, 10, 10, 5, 1],
  "polynomial": "1 + 5x + 10x² + 10x³ + 5x⁴ + x⁵",
  "maximum_rook_count": 5,
  "algorithm": "row_based_dynamic_programming"
}
```

---

## 6. Required Edge Cases Verification

| Case | Description | Matrix Input | Calculated Polynomial | Coefficients | Brute-Force Match |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Case A** | $1 \times 1$ with no forbidden cell | `[[0]]` | `1` | `[1]` | **YES** |
| **Case B** | $1 \times 1$ with one forbidden cell | `[[1]]` | `1 + x` | `[1, 1]` | **YES** |
| **Case C** | $3 \times 3$ with no forbidden cells | All zeros | `1` | `[1]` | **YES** |
| **Case D** | $3 \times 3$ fully forbidden | All ones | `1 + 9x + 18x² + 6x³` | `[1, 9, 18, 6]` | **YES** |
| **Case E** | $6 \times 6$ GateWise benchmark | `SIM-001` matrix | `1 + 5x + 10x² + 10x³ + 5x⁴ + x⁵` | `[1, 5, 10, 10, 5, 1]` | **YES** |
| **Case F1**| $3 \times 3$ same-row forbidden | Row 0 has 3 ones | `1 + 3x` | `[1, 3]` | **YES** |
| **Case F2**| $3 \times 3$ same-col forbidden | Col 0 has 3 ones | `1 + 3x` | `[1, 3]` | **YES** |
| **Case F3**| $2 \times 2$ L-shaped board | `[[1, 1], [1, 0]]` | `1 + 3x + x²` | `[1, 3, 1]` | **YES** |
| **Case F4**| $4 \times 4$ diagonal board | Identity matrix $I_4$ | `1 + 4x + 6x² + 4x³ + x⁴` | `[1, 4, 6, 4, 1]` | **YES** |

---

## 7. Files Created & Modified

1. **Created**: [rook_polynomial_service.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/services/rook_polynomial_service.py)
   - Core mathematical engine with `RookPolynomialService.calculate()`, `format_polynomial()`, `validate_restriction_matrix()`, and custom exceptions.
2. **Created**: [test_rook_polynomial.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/tests/test_rook_polynomial.py)
   - 13 comprehensive test cases including an independent brute-force reference implementation using `itertools.combinations`.
3. **Modified**: [api_schemas.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/schemas/api_schemas.py)
   - Added `RookPolynomialResponse` Pydantic model for structured responses.
4. **Modified**: [schemas/\_\_init\_\_.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/schemas/__init__.py) and [services/\_\_init\_\_.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/services/__init__.py)
   - Exported engine classes, functions, and schemas.

---

## 8. Test Execution Results

### 8.1 Dedicated Rook Polynomial Test Suite
```
backend/tests/test_rook_polynomial.py::test_case_a_one_by_one_empty_forbidden PASSED [  7%]
backend/tests/test_rook_polynomial.py::test_case_b_one_by_one_one_forbidden PASSED [ 15%]
backend/tests/test_rook_polynomial.py::test_case_c_three_by_three_empty_forbidden PASSED [ 23%]
backend/tests/test_rook_polynomial.py::test_case_d_three_by_three_fully_forbidden PASSED [ 30%]
backend/tests/test_rook_polynomial.py::test_case_e_standard_gatewise_6x6_benchmark PASSED [ 38%]
backend/tests/test_rook_polynomial.py::test_case_f_sparse_and_irregular_boards PASSED [ 46%]
backend/tests/test_rook_polynomial.py::test_validation_rejects_none_and_empty PASSED [ 53%]
backend/tests/test_rook_polynomial.py::test_validation_rejects_rectangular_matrix PASSED [ 61%]
backend/tests/test_rook_polynomial.py::test_validation_rejects_ragged_matrix PASSED [ 69%]
backend/tests/test_rook_polynomial.py::test_validation_rejects_non_binary_values PASSED [ 76%]
backend/tests/test_rook_polynomial.py::test_output_structure_and_types PASSED    [ 84%]
backend/tests/test_rook_polynomial.py::test_polynomial_formatter_direct PASSED   [ 92%]
backend/tests/test_rook_polynomial.py::test_sim_002_regional_benchmark PASSED    [100%]
============================== 13 passed in 0.88s ==============================
```

### 8.2 Full Backend Pytest Suite
```
============================= 32 passed in 1.77s ==============================
```
- Architecture tests: 8 passed
- Health check tests: 2 passed
- Database CRUD tests: 3 passed
- Persistence verification tests: 6 passed
- Rook Polynomial calculation engine tests: 13 passed

### 8.3 Frontend Build Check
```
vite v8.3.8 building client environment for production...
✓ 2179 modules transformed.
dist/index.html                   0.82 kB │ gzip:   0.44 kB
dist/assets/index-Cb_g20oa.css   55.52 kB │ gzip:   9.28 kB
dist/assets/index-B8OSwLQz.js   472.29 kB │ gzip: 137.46 kB
✓ built in 816ms
```
Zero build errors or warnings.

---

## 9. Known Limitations & Next Steps

- **Current Scope**: Supports square $n \times n$ matrices corresponding to the one-to-one flight-to-gate assignment model. Rectangular boards are deliberately rejected as specified.
- **Upcoming Phase**: Phase 14 will implement the **Principle of Inclusion-Exclusion (PIE) Engine**, which consumes these Rook Polynomial coefficients $r_k$ to compute the exact number of valid, conflict-free flight-to-gate allocations:
  $$N = \sum_{k=0}^n (-1)^k r_k (n - k)!$$
