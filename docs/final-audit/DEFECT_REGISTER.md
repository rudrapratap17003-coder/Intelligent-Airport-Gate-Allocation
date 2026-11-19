# GateWise — Master Defect Register

**Project:** GateWise — Intelligent Airport Gate Allocation Using Discrete Mathematics  
**Audit Scope:** Full-Stack Codebase, API Endpoints, Math Engine, UI/UX, and Workflows  
**Date:** November 16, 2026  
**Auditor:** Senior Software Architect & QA Automation Auditor  

---

## Severity Classification Standards

- **CRITICAL:** Application unusable, fatal crash, data loss, severe security vulnerability, or fundamental mathematical error.
- **HIGH:** Major workflow failure, data integrity corruption, or incorrect operational calculation.
- **MEDIUM:** Noticeable functional, responsive, or usability defect affecting user experience.
- **LOW:** Minor visual inconsistency, deprecation warning, linter notice, or non-critical inefficiency.
- **INFORMATIONAL:** Architectural boundary, educational design constraint, or suggested future optimization.

---

## Comprehensive Defect Register

| ID | Module | Issue Description | Severity | Evidence | Practical Impact | Recommended Fix | Status |
|---|---|---|:---:|---|---|---|:---:|
| **BUG-ALLOC-01** | Restriction Management / Allocation Workspace | `restrictionService.updateMatrix is not a function` runtime error in Step 3 of Guided Allocation Workspace | **HIGH** | Error reproduced on Step 3 "Run Mathematical Analysis" in `AllocationWorkspace.jsx:239` | Blocked persistence of restriction matrix and halted advancement to Step 4 and Step 5 in Guided Allocation Workspace | Implement `updateMatrix(simId, payloadOrMatrix)` on `restrictionService.js` and normalize PIE terms in `allocationService.js` | **RESOLVED & VERIFIED** |
| **DEF-01** | Backend / Routing | Starlette 0.40+ deprecation warning for `HTTP_422_UNPROCESSABLE_ENTITY` | **LOW** | 6 warnings captured during pytest in `backend/app/routes/export.py`, `comparison.py`, and `math_routes.py` | Generates deprecation notices during test execution; no functional break in HTTP status codes. | Replace `status.HTTP_422_UNPROCESSABLE_ENTITY` with `status.HTTP_422_UNPROCESSABLE_CONTENT` across all route handlers. | **OPEN (Non-Breaking)** |
| **DEF-02** | Frontend / Code Hygiene | Unused icon imports and React 19 compiler effect advisories | **LOW** | `oxlint` reported 104 warnings (0 errors) across `ReportsHub.jsx`, `SystemSettings.jsx`, `TopNavbar.jsx`, `RestrictionMatrix.jsx`, and `MathExplorer.jsx` | Unused icons slightly inflate source files; `setState` called synchronously in `useEffect` skips React compiler optimization. | Remove unused icon imports; refactor initial state evaluation to event-driven or derived state. | **OPEN (Non-Breaking)** |
| **DEF-03** | Frontend / Build | Large single JavaScript bundle chunk warning | **LOW** | Vite build output: `dist/assets/index-EjkehQlh.js` is 1,269.71 kB (345.78 kB gzip), triggering Vite's 500 kB chunk warning | Slightly increased initial asset download on constrained mobile networks; sub-50ms locally. | Implement dynamic code splitting using `React.lazy()` and `Suspense` for secondary routes (`/analytics`, `/reports`, `/math-explorer`). | **OPEN (Non-Breaking)** |
| **DEF-04** | Math Engine / Scale Boundary | Combinatorial bitmask dynamic programming scale boundary ($n \le 8$) | **INFORMATIONAL** | `backend/app/services/rook_polynomial_service.py` constrains input matrices to $n \le 8$ ($O(n \cdot 2^n)$ state space) | Prevents users from inputting large matrices ($n > 8$) in a single unpartitioned block. | Maintain as documented architectural boundary; implement Hungarian algorithm or heuristic matchers for $n > 8$ in future enterprise releases. | **DESIGN BOUNDARY** |
| **DEF-05** | Security / Architecture | Single-tenant local operational workstation model | **INFORMATIONAL** | Absence of JWT authentication and role-based access control (RBAC) in `backend/app/main.py` | System is intended for single-operator local workstation or controlled kiosk demo; cannot be deployed publicly without auth gateway. | Maintain as documented design parameter for academic project; integrate OAuth2 / JWT if converting into multi-tenant SaaS. | **DESIGN BOUNDARY** |
| **DEF-06** | Domain / Scheduling Model | Discrete turnaround epoch modeling | **INFORMATIONAL** | One-to-one assignment per simulation window without continuous timeline sliding across 24 hours | Users must configure each turnaround block as an independent scenario rather than continuous Gantt re-scheduling. | Clarify in academic defense and presentation documentation that GateWise solves the discrete epoch matching problem. | **DESIGN BOUNDARY** |

---

## Verification of Previously Resolved Defects

The audit independently verified whether previously addressed defects have remained resolved or suffered regressions:

### 1. BUG-UI-01 — Tailwind CSS v4 Reset Encapsulation
- **Original Symptom:** Global CSS reset `* { margin: 0; padding: 0; box-sizing: border-box; }` outside `@layer base` caused utility padding (`lg:pl-64`, `p-4`, `p-6`) to collapse, causing sidebar overlapping.
- **Verification Method:** Inspected `frontend/src/index.css`. Confirmed that the reset is encapsulated within `@layer base { * { ... } }`.
- **Finding:** **RESOLVED (No Regression)**. Verified across all 6 viewports with clean sidebar spacing and proper padding.

### 2. BUG-VIS-01 — Blank Rendering on About Route
- **Original Symptom:** `/about` route rendered as a blank screen in early audit captures.
- **Verification Method:** Inspected `frontend/src/pages/About.jsx` and executed headless browser CDP navigation test via `scratch/test_browser_console_errors.py`.
- **Finding:** **RESOLVED (No Regression)**. Page renders completely with full project overview, mathematical explanations, architecture diagram, and 0 runtime exceptions.

### 3. BUG-VIS-02 to BUG-VIS-05 — Mobile & Tablet Viewport Layouts
- **Original Symptom:** Horizontal table overflow and cramped metric cards on 390×844 and 768×1024 viewports.
- **Verification Method:** Multi-viewport headless Chromium capture at 360×800, 390×844, 768×1024, 1024×768, 1366×768, and 1920×1080.
- **Finding:** **RESOLVED (No Regression)**. Responsive cards, overflow-x scrolling containers, and responsive grids adapt smoothly across all viewports.

### 4. BUG-ALLOC-01 — Restriction Service Runtime Error in Guided Allocation Workspace
- **Original Symptom:** Step 3 of Guided Allocation Workspace threw `TypeError: restrictionService.updateMatrix is not a function` when clicking "Run Mathematical Analysis".
- **Verification Method:** Executed `scratch/test_bug_alloc_01.py` with headless Chromium automating all 16 scenarios, plus unit tests in `frontend/src/lib/restrictionService.test.js`.
- **Finding:** **RESOLVED & VERIFIED**. `updateMatrix` implemented on `restrictionService.js`, PIE itemized terms normalized in `allocationService.js`, and Guided Allocation Workspace verified end-to-end through Step 7. Full documentation in `docs/bug-fixes/BUG-ALLOC-01.md`.

---

## Detailed Defect Reproduction Steps & Workarounds

### BUG-ALLOC-01: Restriction Service Runtime Error in Guided Allocation Workspace
- **Root Cause:** In `frontend/src/pages/AllocationWorkspace.jsx` (line 239), the Step 3 execution handler `runMathematicalAnalysis()` called `await restrictionService.updateMatrix(simId, { rows, cols, matrix: matrixData })`. In `frontend/src/lib/restrictionService.js`, the service exported `saveMatrixForSimulation(simulationId, matrix)` but omitted `updateMatrix`. In Step 4, itemized PIE table fields also had a naming discrepancy (`coefficient` vs `rook_coefficient`).
- **Severity:** HIGH (Blocked progression from Step 3 to Step 4 and Step 5 in Guided Allocation Workspace).
- **Affected Components:**
  - `frontend/src/lib/restrictionService.js`
  - `frontend/src/lib/allocationService.js`
  - `frontend/src/pages/AllocationWorkspace.jsx`
- **Reproduction Steps:**
  1. Open browser to `http://localhost:5173/workspace`.
  2. Select 6 flights and click "Continue to Select Gates".
  3. Select 6 gates and click "Continue to Restrictions".
  4. In Step 3, click "Run Mathematical Analysis".
  5. Observe console exception: `TypeError: restrictionService.updateMatrix is not a function`.
- **Fix Details:**
  1. Implemented `updateMatrix(simulationId, payloadOrMatrix)` in `restrictionService.js` accepting both `{ matrix: [...] }` objects and direct 2D arrays, delegating directly to `saveMatrixForSimulation(simulationId, matrix)`.
  2. Normalized `itemized_terms` in `allocationService.js` so both `rook_coefficient` and `coefficient` are populated.
  3. Added null-safe fallback accessors in `AllocationWorkspace.jsx` Step 4 PIE table.
- **Regression Test Results:**
  - Automated headless Chrome CDP test (`scratch/test_bug_alloc_01.py`) verified all 16 specified workflow scenarios: step navigation, cell toggling, count updates, reverting, applying realistic pattern, clearing, backend persistence, Step 4 mathematical analysis, and Step 5 allocation generation with 0 conflicts.
  - Dedicated unit test suite (`frontend/src/lib/restrictionService.test.js`): 6 / 6 passed.
  - Full interactive reconciliation suite (`scratch/reconcile_interactive_workflows.py`): 13 / 13 interactive screenshots captured.
- **Resolution Status:** **RESOLVED & VERIFIED**.

### DEF-01: Starlette 422 Deprecation Warning
- **Reproduction Steps:**
  1. Open terminal in `backend/` directory.
  2. Run `py -3 -m pytest tests/test_comparison_routes.py`.
  3. Observe warning: `StarletteDeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT' instead.`
- **Workaround:** Ignorable during development; warnings do not impact HTTP protocol compliance or test assertions.

### DEF-02: Oxlint Warnings
- **Reproduction Steps:**
  1. Open terminal in `frontend/` directory.
  2. Run `npm run lint`.
  3. Observe 104 warnings regarding unused imports and hook immutability notes.
- **Workaround:** Build succeeds with 0 errors; Rollup tree-shakes unused icon exports.

### DEF-03: Vite Chunk Size Notice
- **Reproduction Steps:**
  1. Open terminal in `frontend/` directory.
  2. Run `npm run build`.
  3. Observe notice: `(!) Some chunks are larger than 500 kB after minification.`
- **Workaround:** Production build completes cleanly in 2.32s; total gzipped payload is 345 kB, well within standard web performance thresholds.

---

## Audit Conclusion

Following post-audit manual testing, one high-severity defect (**BUG-ALLOC-01**) was identified in the Guided Allocation Workspace (`restrictionService.updateMatrix is not a function`). This issue was immediately diagnosed, corrected in the service and component layers, and verified through both automated unit tests and full interactive browser testing across all 16 scenarios.

No **CRITICAL** defects exist. The only high-severity issue (**BUG-ALLOC-01**) has been fully resolved and verified. The remaining three low-severity items (DEF-01, DEF-02, DEF-03) represent non-breaking code hygiene and optimization opportunities, while the three informational items (DEF-04, DEF-05, DEF-06) document theoretical and architectural boundaries. The application is confirmed **DEMONSTRATION READY**.
