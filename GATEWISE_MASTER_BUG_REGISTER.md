# GateWise — Master Bug Register & Defect Resolution Catalog

**Project:** GateWise — Intelligent Airport Gate Allocation & Mathematical Decision Support System  
**Audit Date:** November 16, 2026  
**Auditor:** Antigravity Autonomous Engineering & QA Agent  
**Status:** **PHASE 4 COMPLETE — VERIFIED**

---

## Master Defect Register

### BUG-UI-01: Universal CSS Reset Suppressing Tailwind Layout Padding
- **Severity:** Critical
- **Affected Files:** `frontend/src/index.css`
- **Reproduction Steps:** Load `/dashboard` or `/workspace` on desktop; observe sidebar overlapping main content if `lg:pl-64` was overridden by universal `* { padding: 0 }`.
- **Root Cause:** Universal reset placed outside `@layer base` caused raw CSS declarations to override Tailwind utility layer classes.
- **Fix Applied:** Enclosed universal reset inside `@layer base { * { margin: 0; box-sizing: border-box; } }`.
- **Regression Test:** Verify `lg:pl-64`, `p-4`, `p-6` apply across 1920×1080 and 1366×768.
- **Verification Evidence:** `screenshots/audit/post_fix_dashboard_1920x1080.png`.
- **Status:** **RESOLVED & VERIFIED**

---

### BUG-VIS-01: About Page Runtime Crash (`ReferenceError: O is not defined`)
- **Severity:** Critical
- **Affected Files:** `frontend/src/pages/About.jsx`
- **Reproduction Steps:** Navigate to `/about`.
- **Root Cause:** Unescaped curly braces in JSX `{O}` inside LaTeX math string `$\mathcal{O}(n \cdot 2^n)$` evaluated undefined variable `O`.
- **Fix Applied:** Replaced with unicode formatted text `O(n · 2ⁿ)`.
- **Regression Test:** Load `/about` via Chrome DevTools Protocol; check console errors.
- **Verification Evidence:** `screenshots/visual-qa-final/about_1920x1080.png` (clean render).
- **Status:** **RESOLVED & VERIFIED**

---

### BUG-VIS-02: Mobile Flight & Gate Table Illegibility (390×844 Viewport)
- **Severity:** High
- **Affected Files:** `frontend/src/components/ui/Table.jsx`, `frontend/src/pages/FlightManagement.jsx`, `frontend/src/pages/GateManagement.jsx`
- **Reproduction Steps:** Emulate iPhone 12/13/14 (390×844); view flight table.
- **Root Cause:** Table cells lacked minimum column constraints, squishing text vertically.
- **Fix Applied:** Added `min-w-[640px]` scroll constraint in `Table.jsx` and responsive mobile card view (`sm:hidden`) in `FlightManagement.jsx`.
- **Regression Test:** Viewport 390×844 screenshot capture.
- **Verification Evidence:** `screenshots/visual-qa-final/flights_390x844.png`.
- **Status:** **RESOLVED & VERIFIED**

---

### BUG-VIS-03: Dashboard Mobile Header Button Wrap & Banner Truncation
- **Severity:** Medium
- **Affected Files:** `frontend/src/pages/Dashboard.jsx`
- **Reproduction Steps:** Emulate 390×844 on `/dashboard`.
- **Root Cause:** Rigid `flex` row without wrapping forced header buttons outside container.
- **Fix Applied:** Converted to responsive `flex-wrap` layout with compact mobile button padding.
- **Regression Test:** Emulated 390px capture on `/dashboard`.
- **Verification Evidence:** `screenshots/visual-qa-final/dashboard_390x844.png`.
- **Status:** **RESOLVED & VERIFIED**

---

### BUG-VIS-04: Tablet (768×1024) Grid Misalignment & Formula Text Wrap
- **Severity:** Medium
- **Affected Files:** `frontend/src/pages/Dashboard.jsx`
- **Reproduction Steps:** Emulate iPad 768×1024 portrait; inspect module grid.
- **Root Cause:** `md:grid-cols-2` left uneven card distribution; PIE formula lacked word break.
- **Fix Applied:** Standardized to `sm:grid-cols-2 lg:grid-cols-4` and added `break-all` on formula box.
- **Regression Test:** 768×1024 screenshot verification.
- **Verification Evidence:** `screenshots/visual-qa-final/dashboard_768x1024.png`.
- **Status:** **RESOLVED & VERIFIED**

---

### BUG-VIS-05: Mobile Analytics Tab Clipping & Recharts X-Axis Margin
- **Severity:** Medium
- **Affected Files:** `frontend/src/pages/Analytics.jsx`
- **Reproduction Steps:** Emulate 390×844 on `/analytics`.
- **Root Cause:** Tab buttons overflowed screen edge; Recharts chart margins clipped Y-axis ticks.
- **Fix Applied:** Added wrapping tab pills and adjusted chart margins to `left: -10, right: 10`.
- **Regression Test:** 390×844 capture on `/analytics`.
- **Verification Evidence:** `screenshots/visual-qa-final/analytics_390x844.png`.
- **Status:** **RESOLVED & VERIFIED**

---

### BUG-GIT-01: `.gitignore` Overbroad `lib/` Matching Ignoring `frontend/src/lib/`
- **Severity:** Critical
- **Affected Files:** `.gitignore`
- **Reproduction Steps:** Check `git status --ignored frontend/src/lib/`.
- **Root Cause:** Bare `lib/` in `.gitignore` matched all directories named `lib/`, preventing tracking of frontend service adapters.
- **Fix Applied:** Changed to `/lib/` and added explicit exception `!frontend/src/lib/`.
- **Regression Test:** `git ls-files frontend/src/lib/` confirmed all 14 service files tracked.
- **Verification Evidence:** Tracked in commit `2718455` on GitHub remote `origin/main`.
- **Status:** **RESOLVED & VERIFIED**

---

### BUG-TEST-01: Test Suite Assertion Hardcoding Simulation IDs in `test_dashboard_routes.py`
- **Severity:** Low
- **Affected Files:** `backend/tests/test_dashboard_routes.py`
- **Reproduction Steps:** Run pytest after creating dynamic scenarios in database.
- **Root Cause:** Test asserted `simulation_id in ["SIM-001", "SIM-002", "SIM-003"]` rather than validating that a valid scenario ID string starting with `SIM-` was returned.
- **Fix Applied:** Updated assertion to verify `isinstance(sim_id, str) and sim_id.startswith("SIM-")`.
- **Regression Test:** Pytest suite 162/162 passed.
- **Verification Evidence:** `tests/test_dashboard_routes.py` passing cleanly.
- **Status:** **RESOLVED & VERIFIED**

---

## Defect Summary
- **Total Registered Defects:** 8
- **Critical:** 3
- **High:** 1
- **Medium:** 3
- **Low:** 1
- **Resolved & Verified:** 8 (100%)
- **Open Defect Count:** 0
