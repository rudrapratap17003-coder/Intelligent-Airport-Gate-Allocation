# Bug Fix Verification Report: BUG-ALLOC-01

**Defect ID:** BUG-ALLOC-01  
**Title:** Restriction Service Runtime Error in Guided Allocation Workspace (`restrictionService.updateMatrix is not a function`)  
**Severity:** HIGH (Blocked Step 3 to Step 4 progression in Guided Allocation Workspace)  
**Module:** Restriction Management / Allocation Workspace  
**Status:** **RESOLVED & VERIFIED**  
**Date:** November 16, 2026  

---

## 1. Executive Summary

During execution of the Guided Allocation Workspace workflow (Step 3: Define Binary Restriction Board $B$), clicking the **"Run Mathematical Analysis"** button triggered a fatal client-side runtime exception:

```text
TypeError: restrictionService.updateMatrix is not a function
```

This error prevented the restriction board from persisting to the backend, aborted mathematical derivation, and prevented users from advancing to Step 4 (Algebraic Derivations) or Step 5 (Synthesizing Concrete Allocations).

A minimal, surgical correction was implemented at the service and component layers. The fix was verified using an end-to-end headless Chromium automation script covering all 16 required functional regression scenarios, automated unit tests, and production builds.

---

## 2. Root Cause Analysis

1. **Missing Service Method on `restrictionService`:**  
   In `frontend/src/pages/AllocationWorkspace.jsx` (line 239), the mathematical analysis transition handler `runMathematicalAnalysis()` attempted to call:
   ```javascript
   await restrictionService.updateMatrix(simId, {
     rows: selectedFlightIds.length,
     cols: selectedGateIds.length,
     matrix: matrixData
   })
   ```
   However, `frontend/src/lib/restrictionService.js` exported only `saveMatrixForSimulation(simulationId, matrix)`, `toggleCell()`, `clearAllRestrictions()`, and related presets. It did not define or export an `updateMatrix` method.
2. **Itemized PIE Term Field Naming Mismatch in Step 4:**  
   Upon advancing to Step 4, the PIE itemized table in `AllocationWorkspace.jsx` attempted to call `.toLocaleString()` on `t.coefficient`, `t.factorial_remaining`, and `t.signed_contribution`. The backend API returns these fields as `rook_coefficient`, `factorial_value`, and `contribution`, which caused a subsequent `TypeError: Cannot read properties of undefined (reading 'toLocaleString')`.

---

## 3. Affected Files

| File Path | Change Type | Description |
|---|:---:|---|
| `frontend/src/lib/restrictionService.js` | **Modified** | Implemented `updateMatrix(simulationId, payloadOrMatrix)` supporting both object and array payloads; updated relative import. |
| `frontend/src/lib/allocationService.js` | **Modified** | Normalized `itemized_terms` in `getCalculation` to populate both naming conventions (`rook_coefficient`/`coefficient`, `factorial_value`/`factorial_remaining`, `contribution`/`signed_contribution`). |
| `frontend/src/pages/AllocationWorkspace.jsx` | **Modified** | Hardened Step 4 PIE breakdown rendering with safe null-coalescing fallbacks. |
| `frontend/src/lib/restrictionService.test.js` | **Created** | Automated unit test suite verifying `updateMatrix`, input validation, and service contracts. |

---

## 4. Exact Code Diffs

### 4.1 `frontend/src/lib/restrictionService.js`

```diff
--- a/frontend/src/lib/restrictionService.js
+++ b/frontend/src/lib/restrictionService.js
@@ -6,7 +6,7 @@
  */
 
-import api from './api'
+import api from './api.js'
 
 const LEGACY_STORAGE_KEY = 'gatewise_restrictions_data'
 
@@ -58,6 +58,21 @@ export const restrictionService = {
     }
   },
 
+  /**
+   * Update restriction matrix for simulation scenario.
+   * Accepts either a 2D matrix array directly or an object containing { matrix: [...] }.
+   * Provides backwards compatibility and matches the signature used in AllocationWorkspace.
+   */
+  updateMatrix: async (simulationId, payloadOrMatrix) => {
+    const matrix = Array.isArray(payloadOrMatrix)
+      ? payloadOrMatrix
+      : payloadOrMatrix?.matrix
+    if (!Array.isArray(matrix)) {
+      throw new Error(`Invalid matrix payload provided to updateMatrix for simulation ${simulationId}.`)
+    }
+    return await restrictionService.saveMatrixForSimulation(simulationId, matrix)
+  },
+
   /**
    * Toggle a single cell in the matrix and persist directly to backend.
    */
```

### 4.2 `frontend/src/lib/allocationService.js`

```diff
--- a/frontend/src/lib/allocationService.js
+++ b/frontend/src/lib/allocationService.js
@@ -21,7 +21,13 @@ export const allocationService = {
       ...data,
       rook_polynomial: data.polynomial,
       exact_valid_assignments: data.valid_assignments,
-      itemized_terms: data.inclusion_exclusion_terms
+      itemized_terms: (data.inclusion_exclusion_terms || []).map((t) => ({
+        ...t,
+        coefficient: t.rook_coefficient !== undefined ? t.rook_coefficient : (t.coefficient ?? 0),
+        factorial_remaining: t.factorial_value !== undefined ? t.factorial_value : (t.factorial_remaining ?? 0),
+        signed_contribution: t.contribution !== undefined ? t.contribution : (t.signed_contribution ?? 0),
+        sign: t.sign === 1 || t.sign === '+' ? 1 : -1
+      }))
     }
   },
```

### 4.3 `frontend/src/pages/AllocationWorkspace.jsx`

```diff
--- a/frontend/src/pages/AllocationWorkspace.jsx
+++ b/frontend/src/pages/AllocationWorkspace.jsx
@@ -718,17 +718,22 @@ export const AllocationWorkspace = () => {
-                {mathResult.itemized_terms.map((t) => (
+                {(mathResult.itemized_terms || []).map((t) => {
+                  const coeff = t.coefficient ?? t.rook_coefficient ?? 0
+                  const fact = t.factorial_remaining ?? t.factorial_value ?? 0
+                  const contrib = t.signed_contribution ?? t.contribution ?? 0
+                  const isPos = t.sign === 1 || t.sign === '+'
+                  return (
                     <tr key={t.k} className="hover:bg-white/[0.02]">
                       <td className="p-2.5 font-bold text-gw-text">k = {t.k}</td>
-                      <td className="p-2.5 text-gw-warning">r_{t.k} = {t.coefficient.toLocaleString()}</td>
-                      <td className="p-2.5 text-gw-text-secondary">({selectedFlightIds.length - t.k})! = {t.factorial_remaining.toLocaleString()}</td>
-                      <td className="p-2.5">{t.sign === 1 ? '+' : '-'}</td>
-                      <td className={`p-2.5 text-right font-bold ${t.sign === 1 ? 'text-gw-success' : 'text-gw-error'}`}>
-                        {t.signed_contribution > 0 ? `+${t.signed_contribution.toLocaleString()}` : t.signed_contribution.toLocaleString()}
+                      <td className="p-2.5 text-gw-warning">r_{t.k} = {coeff.toLocaleString()}</td>
+                      <td className="p-2.5 text-gw-text-secondary">({selectedFlightIds.length - t.k})! = {fact.toLocaleString()}</td>
+                      <td className="p-2.5">{isPos ? '+' : '-'}</td>
+                      <td className={`p-2.5 text-right font-bold ${contrib >= 0 ? 'text-gw-success' : 'text-gw-error'}`}>
+                        {contrib > 0 ? `+${contrib.toLocaleString()}` : contrib.toLocaleString()}
                       </td>
                     </tr>
-                ))}
+                  )
+                })}
```

---

## 5. Functional Regression Verification Results

An automated end-to-end regression test script (`scratch/test_bug_alloc_01.py`) was executed against a live running Chromium browser and FastAPI backend:

| # | Test Step / Requirement | Observed Outcome | Status |
|---|---|---|:---:|
| 1 | Open Allocation Workspace (`/workspace`) | Page mounted with title "Guided Allocation Workspace" | **PASSED** |
| 2 | Navigate to Step 3 (Restrictions) | Completed Step 1 (Flights) & Step 2 (Gates), mounted Step 3 header | **PASSED** |
| 3 | Toggle unrestricted cell (0, 0) to restricted | Cell clicked via DOM event | **PASSED** |
| 4 | Verify cell changes visually | Cell text updated from `0 (Open)` to `1 (Restricted)`, background updated | **PASSED** |
| 5 | Verify forbidden count increases | Forbidden count increased from 0 to 1 | **PASSED** |
| 6 | Verify allowed count decreases | Allowed count decreased from 36 to 35 | **PASSED** |
| 7 | Verify matrix density updates | Density recalculated dynamically to 2.8% | **PASSED** |
| 8 | Toggle same cell (0, 0) back | Cell clicked again | **PASSED** |
| 9 | Verify all counts restore | Forbidden count returned to 0, allowed restored to 36, density returned to 0% | **PASSED** |
| 10 | Click "Apply Realistic Pattern" | Realistic pattern applied; forbidden count increased to 10 (27.8% density) | **PASSED** |
| 11 | Verify resulting matrix | Alternating diagonal restrictions populated correctly | **PASSED** |
| 12 | Click "Clear (All Allowed)" | Cleared; all cells reset to 0 | **PASSED** |
| 13 | Verify every cell becomes 0 | Verified forbidden count = 0, allowed = 36 | **PASSED** |
| 14 | Configure custom restrictions | Set cell (0, 1) and (1, 0) as restricted; verified forbidden count = 2 | **PASSED** |
| 15 | Click "Run Mathematical Analysis" | `updateMatrix` executed successfully; matrix persisted to backend; Step 4 mounted | **PASSED** |
| 16 | Advance to Step 5 & Generate Allocations | Synthesized verified conflict-free plans; audit reported "Zero Forbidden Restriction Violations" | **PASSED** |

### Additional Edge-Case & Error-Handling Tests:
- `restrictionService.updateMatrix('SIM-001', null)` $\implies$ Threw expected `Invalid matrix payload` error.
- `restrictionService.updateMatrix('SIM-001', { matrix: 'invalid' })` $\implies$ Threw expected `Invalid matrix payload` error.
- `restrictionService.updateMatrix('SIM-001', 42)` $\implies$ Threw expected `Invalid matrix payload` error.

---

## 6. Regression Check Results

- **Frontend Unit Tests (`restrictionService.test.js`):** 6 / 6 Passed.
- **Frontend Matrix Validation Tests (`matrixValidationService.test.js`):** 16 / 16 Passed.
- **Frontend Production Build (`vite build`):** Compiled 2,994 modules in 2.05s with 0 errors.
- **Frontend Linting (`oxlint`):** 0 errors.
- **Backend Automated Tests (`pytest`):** 162 / 162 Passed in 6.30s.
- **Browser CDP 14-Route Console Audit:** 14 / 14 routes mounted with 0 uncaught runtime exceptions.

---

## 7. Before-and-After Behavior

- **Before:** When a user attempted to run mathematical analysis in Step 3 of the Guided Allocation Workspace, the interface threw `restrictionService.updateMatrix is not a function`, stopping the wizard and leaving the user unable to compute or generate allocations.
- **After:** Step 3 executes cleanly. The matrix is persisted to the backend via `updateMatrix`, Step 4 displays full algebraic derivations and the itemized PIE table, and Step 5 generates conflict-free allocation plans.

---

## 8. Remaining Limitations

- Allocation Workspace continues to enforce balanced $n \times n$ bipartite matching ($m = n$).
- Exact Rook Polynomial calculation is bounded at $n \le 8$ due to the combinatorial complexity of exact permanent computation.
