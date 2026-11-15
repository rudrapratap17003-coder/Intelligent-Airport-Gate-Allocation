# Phase 14 — Inclusion-Exclusion Calculation Engine Report

**Project**: GateWise — Intelligent Airport Gate Allocation Using Discrete Mathematics  
**Phase**: 14 — Inclusion-Exclusion Calculation Engine  
**Status**: Completed & Verified  
**Date**: November 15, 2026  

---

## 1. Executive Summary

Phase 14 delivers the second foundational discrete mathematics engine for GateWise: the **Inclusion-Exclusion Calculation Engine**. 

Building directly upon the authoritative Rook Polynomial coefficients produced in Phase 13, this engine calculates the exact number of valid, conflict-free one-to-one flight-to-gate assignments using the **Principle of Inclusion-Exclusion (PIE)**:
$$N = \sum_{k=0}^n (-1)^k \cdot r_k \cdot (n - k)!$$

The engine:
- Operates strictly with **Python arbitrary-precision integers** for all mathematical calculations (factorials, products, and alternating sums).
- Generates itemized terms for every degree $k \in \{0, \dots, n\}$ containing the coefficient $r_k$, factorial $(n-k)!$, alternating sign $(-1)^k$, and signed contribution.
- Produces dynamic human-readable algebraic derivation steps.
- Was independently cross-verified against a brute-force permutation-enumeration algorithm ($\mathcal{O}(n!)$) that evaluates all physical gate allocations without using polynomials or formulas.

---

## 2. Mathematical Foundation & Formula

Let $n$ denote the number of flights and airport gates in an $n \times n$ assignment problem. Let $S = S_n$ be the set of all $n!$ possible one-to-one flight-to-gate assignments.

For each forbidden cell $(i, j)$ where $B[i][j] = 1$, define property $P_{i,j}$ as the event that flight $i$ is assigned to forbidden gate $j$.

By the Principle of Inclusion-Exclusion:
$$N = N(P_1' P_2' \dots P_m') = S_0 - S_1 + S_2 - S_3 + \dots + (-1)^n S_n$$

Where:
- $S_0 = n!$ is the total unrestricted assignments.
- $S_k = r_k \cdot (n - k)!$, because each valid placement of $k$ non-attacking rooks specifies $k$ forbidden flight-gate pairs, and the remaining $n - k$ flights can be assigned to the remaining $n - k$ gates in $(n - k)!$ ways.

Hence:
$$N = \sum_{k=0}^n (-1)^k \cdot r_k \cdot (n - k)!$$

### Metrics Derived:
1. **Total Possible Assignments**: $n!$
2. **Valid Conflict-Free Assignments ($N$)**: Evaluated sum of PIE terms ($0 \le N \le n!$).
3. **Invalid Conflicted Assignments**: $n! - N$.
4. **Feasibility Percentage**: $\left(\frac{N}{n!}\right) \times 100\%$.

---

## 3. Standard GateWise SIM-001 Benchmark Calculation

For the baseline benchmark scenario `SIM-001` ($n = 6$ flights $\times$ $6$ gates, with 5 forbidden cells at $(0,1), (1,3), (2,4), (3,0), (4,2)$):

### 3.1 Rook Coefficients (from Phase 13)
$$[r_0, r_1, r_2, r_3, r_4, r_5, r_6] = [1, 5, 10, 10, 5, 1, 0]$$

### 3.2 Term-by-Term Evaluation

| $k$ | Sign $(-1)^k$ | Rook Coeff $r_k$ | Factorial $(6 - k)!$ | Computation | Signed Contribution | Running Sum |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0** | $+1$ | 1 | $6! = 720$ | $+1 \times 1 \times 720$ | **$+720$** | 720 |
| **1** | $-1$ | 5 | $5! = 120$ | $-1 \times 5 \times 120$ | **$-600$** | 120 |
| **2** | $+1$ | 10 | $4! = 24$ | $+1 \times 10 \times 24$ | **$+240$** | 360 |
| **3** | $-1$ | 10 | $3! = 6$ | $-1 \times 10 \times 6$ | **$-60$** | 300 |
| **4** | $+1$ | 5 | $2! = 2$ | $+1 \times 5 \times 2$ | **$+10$** | 310 |
| **5** | $-1$ | 1 | $1! = 1$ | $-1 \times 1 \times 1$ | **$-1$** | **309** |
| **6** | $+1$ | 0 | $0! = 1$ | $+1 \times 0 \times 1$ | **$0$** | **309** |

### 3.3 Dynamic Calculation Steps Output
```
Step 1: N = 1(6!) - 5(5!) + 10(4!) - 10(3!) + 5(2!) - 1(1!)
Step 2: N = 720 - 600 + 240 - 60 + 10 - 1
Step 3: N = 309
```

- **Total Permutations**: $6! = 720$
- **Exact Valid Assignments ($N$)**: **309**
- **Invalid Assignments**: $720 - 309 = \mathbf{411}$
- **Feasibility Percentage**: $\frac{309}{720} \times 100\% \approx \mathbf{42.9167\%}$

---

## 4. Independent Brute-Force Cross-Verification

To verify the mathematical engine without circular dependency, an independent reference algorithm was implemented:

```python
def brute_force_valid_allocations_count(matrix: list[list[int]]) -> int:
    n = len(matrix)
    count = 0
    for perm in itertools.permutations(range(n)):
        if all(matrix[flight_idx][gate_idx] == 0 for flight_idx, gate_idx in enumerate(perm)):
            count += 1
    return count
```

### Verification Across Test Scenarios:

| Case | Scenario | $n$ | Total Perms ($n!$) | PIE Engine Result ($N$) | Brute-Force Enumeration | Agreement |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Case A** | 3×3 all zeros (no restrictions) | 3 | 6 | **6** | **6** | **MATCH** |
| **Case B** | 3×3 all ones (fully forbidden) | 3 | 6 | **0** | **0** | **MATCH** |
| **Case C** | 2×2 one forbidden cell | 2 | 2 | **1** | **1** | **MATCH** |
| **Case D** | 3×3 main diagonal (derangements $D_3$) | 3 | 6 | **2** | **2** | **MATCH** |
| **Case E** | 6×6 GateWise SIM-001 benchmark | 6 | 720 | **309** | **309** | **MATCH** |
| **Row Block** | 3×3 row 0 fully forbidden | 3 | 6 | **0** | **0** | **MATCH** |
| **Col Block** | 3×3 col 0 fully forbidden | 3 | 6 | **0** | **0** | **MATCH** |
| **Partial Row**| 3×3 row 0 has 2 forbidden cells | 3 | 6 | **2** | **2** | **MATCH** |
| **SIM-002** | 3×3 regional shuttle benchmark | 3 | 6 | **2** | **2** | **MATCH** |

---

## 5. Files Created & Modified

1. **Created**: [inclusion_exclusion_service.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/services/inclusion_exclusion_service.py)
   - Core implementation with `InclusionExclusionService.calculate()` and `calculate_valid_allocations()`.
2. **Created**: [test_inclusion_exclusion.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/tests/test_inclusion_exclusion.py)
   - 11 comprehensive automated tests including all required edge cases and independent permutation enumeration cross-checks.
3. **Modified**: [api_schemas.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/schemas/api_schemas.py)
   - Added `InclusionExclusionTerm` and `InclusionExclusionResponse` Pydantic models.
4. **Modified**: [schemas/\_\_init\_\_.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/schemas/__init__.py) and [services/\_\_init\_\_.py](file:///c:/Users/rudra%20pratap/OneDrive/Documents/Intelligent%20Airport%20Gate%20Allocation/backend/app/services/__init__.py)
   - Exported services and response schemas.

---

## 6. Test Suite Execution Results

### 6.1 Dedicated Inclusion-Exclusion Test Suite
```
backend/tests/test_inclusion_exclusion.py::test_case_a_no_forbidden_assignments PASSED [  9%]
backend/tests/test_inclusion_exclusion.py::test_case_b_every_assignment_forbidden PASSED [ 18%]
backend/tests/test_inclusion_exclusion.py::test_case_c_one_forbidden_cell PASSED [ 27%]
backend/tests/test_inclusion_exclusion.py::test_case_d_three_pairwise_non_attacking_forbidden PASSED [ 36%]
backend/tests/test_inclusion_exclusion.py::test_case_e_standard_gatewise_sim_001_benchmark PASSED [ 45%]
backend/tests/test_inclusion_exclusion.py::test_multiple_forbidden_cells_sharing_entire_row PASSED [ 54%]
backend/tests/test_inclusion_exclusion.py::test_multiple_forbidden_cells_sharing_entire_column PASSED [ 63%]
backend/tests/test_inclusion_exclusion.py::test_sparse_partial_row_restrictions PASSED [ 72%]
backend/tests/test_inclusion_exclusion.py::test_sim_002_regional_3x3_benchmark PASSED [ 81%]
backend/tests/test_inclusion_exclusion.py::test_inclusion_exclusion_itemized_terms PASSED [ 90%]
backend/tests/test_inclusion_exclusion.py::test_input_validation_delegation PASSED [100%]
============================== 11 passed in 1.07s ==============================
```

### 6.2 Full Backend Pytest Suite
```
============================= 43 passed in 1.76s ==============================
```
- Architecture tests: 8 passed
- Health check tests: 2 passed
- Database CRUD tests: 3 passed
- Persistence verification tests: 6 passed
- Rook Polynomial tests: 13 passed
- Inclusion-Exclusion tests: 11 passed

### 6.3 Frontend Build Verification
```
vite v8.3.8 building client environment for production...
✓ 2179 modules transformed.
dist/index.html                   0.82 kB │ gzip:   0.44 kB
dist/assets/index-Cb_g20oa.css   55.52 kB │ gzip:   9.28 kB
dist/assets/index-B8OSwLQz.js   472.29 kB │ gzip: 137.46 kB
✓ built in 793ms
```
Zero errors or warnings.

---

## 7. Known Limitations & Next Steps

- **Scope**: Evaluates square $n \times n$ restriction matrices. Actual allocation generation (generating individual flight-to-gate assignment pairs) is purposely excluded in this phase and will be addressed in subsequent simulation/backtracking phases.
- **Upcoming Phases**: Subsequent phases will connect the mathematical engines to REST API endpoints, analytics telemetry dashboards, and the interactive Mathematical Explorer UI.
