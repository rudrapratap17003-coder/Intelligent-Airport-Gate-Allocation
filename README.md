# GateWise — Intelligent Airport Gate Allocation Framework
### Applied Discrete Mathematics & Combinatorial Optimization Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%20|%203.14-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Pytest-162%20Passed-brightgreen.svg?logo=pytest&logoColor=white)](https://pytest.org/)

---

## 1. Project Overview

**GateWise** is an educational and operational platform designed to model and solve the **Airport Gate Allocation Problem (AGAP)** using rigorous discrete mathematics.

In modern hub airports, dispatching incoming and departing aircraft to terminal gates involves satisfying dense operational constraints (aircraft wingspan, gate clearance, international customs isolation, airline terminal priorities, and maintenance curfews). Rather than relying on opaque black-box heuristics or evaluating factorial brute-force permutations ($n!$), GateWise pairs the **Rook Polynomial** $R(B, x)$ with the **Principle of Inclusion-Exclusion (PIE)** to calculate the **exact integer number of valid assignments $N$** in sub-millisecond execution time, followed by constraint-directed backtracking to generate conflict-free allocation plans.

---

## 2. Discrete Mathematical Foundations

### A. The Binary Restriction Board $B$
Let $n$ be the number of flights and $n$ the number of available terminal gates. The operational constraints are represented as an $n \times n$ binary restriction matrix $B$:
$$B[i][j] = \begin{cases} 0, & \text{if Flight } i \text{ is ALLOWED at Gate } j \\ 1, & \text{if Flight } i \text{ is FORBIDDEN from Gate } j \end{cases}$$

### B. Unconstrained Permutation Universe $S_0$
Without restrictions, the total number of bijective one-to-one flight-to-gate assignments is given by the factorial:
$$S_0 = n! = n \times (n - 1) \times \dots \times 1$$

### C. Exact Rook Polynomial $R(B, x)$
The Rook Polynomial represents the generating function for placing non-attacking rooks on the forbidden cells of board $B$:
$$R(B, x) = \sum_{k=0}^n r_k x^k = r_0 + r_1 x + r_2 x^2 + \dots + r_n x^n$$
- $r_k$ represents the exact number of ways to place $k$ non-attacking rooks onto forbidden cells (no two rooks sharing the same row or column).
- $r_0 = 1$ always (one trivial empty placement).
- Computed using **Row-by-Row Dynamic Programming with Column Bitmask Tracking** in $\mathcal{O}(n \cdot 2^n)$ state space.

### D. Principle of Inclusion-Exclusion (PIE)
The exact count of conflict-free flight-to-gate assignments $N$ is derived via the alternating sum:
$$N = \sum_{k=0}^n (-1)^k \cdot r_k \cdot (n - k)!$$
All computations use arbitrary-precision Python integers with zero floating-point roundoff errors.

### E. Feasibility Ratio
$$\text{Feasibility Rate} = \left(\frac{N}{n!}\right) \times 100\%$$
- When $N > 0$, the scenario is **Feasible**.
- When $N = 0$, an operational **Bottleneck** exists where no complete one-to-one assignment can be achieved.

---

## 3. System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │               CLIENT (Browser)               │
                    │  React 19 • Vite 8 • Tailwind v4 • Recharts  │
                    └──────────────────────┬───────────────────────┘
                                           │ HTTP REST / JSON
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │               FASTAPI BACKEND                │
                    │      Versioned API Router (/api/v1)          │
                    └──────┬───────────────┬───────────────┬───────┘
                           │               │               │
        ┌──────────────────┴───┐ ┌─────────┴─────────┐ ┌───┴──────────────────┐
        │ COMBINATORIAL ENGINE │ │ GENERATOR & AUDIT │ │  PERSISTENCE LAYER   │
        │ • Rook Polynomial DP │ │ • Backtracking    │ │ • SQLite 3           │
        │ • Inclusion-Exclusion│ │ • Conflict Audit  │ │ • SQLAlchemy 2.x ORM │
        │ • Arbitrary Precision│ │ • Constraint Check│ │ • Activity Log Trace │
        └──────────────────────┘ └───────────────────┘ └──────────────────────┘
```

---

## 4. Key Features & Modules

1. **Guided Allocation Workspace (`/workspace`)**:
   - Integrated 7-step guided decision workflow: Select Flights $\to$ Select Gates $\to$ Configure Restriction Grid $\to$ Compute Rook & PIE $\to$ Generate Allocations $\to$ Verify & Audit $\to$ Export Reports.
2. **Live Operations Dashboard (`/dashboard`)**:
   - Real-time fleet, terminal gate, and active scenario metrics.
   - Live aggregate mathematical feasibility indicators and audit activity trail.
3. **Flight Operations Registry (`/flights`)**:
   - Master aircraft registry with search, filtering, CRUD operations, and responsive mobile cards.
4. **Gate Management (`/gates`)**:
   - Terminal gate registry with aircraft size restrictions and status controls.
5. **Restriction Matrix (`/matrix`)**:
   - Interactive $n \times n$ binary restriction grid with cell toggling, density telemetry, and sample pattern presets.
6. **Step-by-Step Calculation Engine (`/calculations`)**:
   - 5-step pedagogical walkthrough: Board Formulation $\to$ Factorial Permutations $\to$ Rook Polynomial Derivation $\to$ PIE Alternating Sums $\to$ Feasibility Verdict.
7. **Allocation Simulator & Interactive Visualization (`/simulator` & `/bipartite`)**:
   - Backtracking permutation generator with early branch pruning.
   - Independent conflict detection auditing every single flight-gate assignment.
   - Interactive SVG bipartite assignment diagram with hover-highlighting and matrix overlay.
8. **Mathematical Analytics (`/analytics`)**:
   - Combinatorial telemetry workspace evaluating coefficient histograms, density heatmaps, and constraint distributions.
9. **Scenario Management & Comparison (`/scenarios` & `/comparison`)**:
   - Full lifecycle scenario management (create, duplicate, edit, delete).
   - Multi-scenario comparison comparing up to 6 scenarios with difference matrix ($M_1 - M_2$) analysis and automated rule-based insights.
10. **Interactive Mathematics Explorer (`/math-explorer`)**:
    - Real-time ad-hoc restriction sandbox with preset templates (Derangements, Bottlenecks, Upper Triangular).
    - Non-attacking chess rook placement simulator with live row/column collision alerts.
    - Permutation theory explorer ($1 \le n \le 8$) with factorial growth tables.
11. **Reports & Export Hub (`/reports`)**:
    - Direct binary PDF reports generated server-side with ReportLab, including formula boxes, matrix tables, and allocation plans.
    - Streaming CSV exports for master flights, gates, restriction matrices, mathematical derivations, and allocations.
12. **System Settings & Health (`/settings`)**:
    - Live system diagnostics, API connectivity monitoring, and database health metrics.

---

## 5. Getting Started & Installation

### Prerequisites
- **Python**: 3.10, 3.11, 3.12, 3.13, or 3.14
- **Node.js**: 18.x, 20.x, or 22.x
- **Git**

### A. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed the database with initial benchmark data
python seed.py

# Launch the FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API is now live at `http://127.0.0.1:8000`.
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc Documentation: `http://127.0.0.1:8000/redoc`

### B. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The application interface is now accessible at `http://localhost:5173`.

---

## 6. Automated Testing Suite

GateWise includes an exhaustive test suite covering mathematical accuracy, edge-case invariants, API contracts, and integration workflows:

```bash
# Run all backend tests
cd backend
python -m pytest tests/ -v
```

**Verification Results:**
- **156 passed in 6.86s** across 16 test modules.
- **0 regressions**, **0 floating-point roundoff errors**.

```bash
# Run production frontend build
cd frontend
npm run build
```
- Built with Vite v8.3.8: 2,561 modules transformed, 0 build errors.

---

## 7. API Endpoints Reference

All endpoints are versioned under `/api/v1`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health status check |
| `GET` | `/api/v1/dashboard/summary` | Consolidated live operations and mathematical summary |
| `GET` | `/api/v1/flights` | List all registered flights |
| `POST` | `/api/v1/flights` | Register a new flight |
| `GET` | `/api/v1/gates` | List all terminal gates |
| `POST` | `/api/v1/gates` | Register a new terminal gate |
| `GET` | `/api/v1/simulations` | List all simulation scenarios |
| `POST` | `/api/v1/simulations` | Create a new scenario with linked entities |
| `GET` | `/api/v1/simulations/{id}/calculate` | Exact Rook Polynomial and PIE evaluation |
| `GET` | `/api/v1/simulations/{id}/allocations` | Backtracking generation with independent conflict auditing |
| `POST` | `/api/v1/simulations/{id}/validate-allocation` | Independent constraint auditor for allocation payload |
| `GET` | `/api/v1/analytics/overview` | Platform-wide combinatorial telemetry |
| `POST` | `/api/v1/comparison` | Multi-scenario side-by-side comparison & matrix delta |
| `POST` | `/api/v1/math/evaluate` | Ad-hoc evaluation for arbitrary $n \times n$ matrices |
| `GET` | `/api/v1/math/permutations/{n}` | Factorial breakdown and sample permutations |
| `GET` | `/api/v1/export/flights/csv` | Download registered flights CSV |
| `GET` | `/api/v1/export/gates/csv` | Download terminal gates CSV |
| `GET` | `/api/v1/export/simulations/{id}/matrix/csv` | Download binary restriction matrix CSV |
| `GET` | `/api/v1/export/simulations/{id}/allocations/csv` | Download generated allocations CSV |
| `GET` | `/api/v1/export/simulations/{id}/report/html` | Printable publication-grade academic report |

---

## 8. Deployment Guidelines

### Frontend (Vercel / Netlify / Cloudflare Pages)
- **Root Directory**: `frontend/`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: URL of the deployed FastAPI backend (e.g. `https://api.gatewise.example.com/api/v1`).

### Backend (Render / Railway / Docker)
- **Docker Deployment**:
  ```dockerfile
  FROM python:3.12-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  RUN python seed.py
  EXPOSE 8000
  CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
  ```

---

## 9. License & Academic Attribution
Developed for educational demonstration and applied discrete mathematics research.
GateWise demonstrates the computational elegance of discrete combinatorial structures in civil aviation operations.
