# GateWise BLR — Kempegowda International Airport Digital Twin Prototype
## Project Overview & Executive Summary

### 1. Vision & Purpose
**GateWise BLR** is an intelligent airport gate allocation framework and operational digital twin prototype developed for **Kempegowda International Airport Bengaluru (IATA: BLR, ICAO: VOBL)**. 

The application transforms generic combinatorial gate assignment into an airport-specific, operational decision-support and simulation platform. It unites rigorous discrete mathematics—specifically **Rook Polynomials** and the **Principle of Inclusion-Exclusion (PIE)**—with realistic terminal constraints, aircraft dimension rules, turnaround occupancy modeling, and an illustrative operational schematic.

---

### 2. Academic & Non-Affiliation Policy
> [!IMPORTANT]
> **Academic Demonstration Prototype Disclaimer**
> GateWise BLR is an academic research and decision-support prototype. It is **not** an official software product of Bangalore International Airport Limited (BIAL) or the Directorate General of Civil Aviation (DGCA). It does not connect to BIAL internal operational databases, confidential AODB feeds, or commercial air traffic management systems. 

The application establishes a transparent, 3-tier data classification policy:
1. **Verified Public Data**: Publicly released aerodrome dimensions, terminal roles, runway specifications, and airline terminal allocations.
2. **Configurable Demonstration Data**: Representative apron stand layouts, jetway flags, and physical dimension thresholds configured for demonstration scenarios.
3. **Simulated Operational Data**: Artificial flight schedules, turnaround windows, delay events, and mathematical gate assignments.

---

### 3. Core Capabilities
- **Terminal Operations Management**: Dedicated operational views and constraints for Terminal 1 (Dedicated Domestic) and Terminal 2 (International & Full-Service Domestic "Terminal in a Garden").
- **Aircraft Compatibility Engine**: Multi-dimensional verification enforcing ICAO Annex 14 aircraft category limits (Code C, D, E, F), wingspan boundaries, terminal eligibility, and stand operational status.
- **Turnaround & Occupancy Simulation**: Modeling aircraft ground handling windows, safety separation buffers, and stand conflict detection.
- **Simulated Operations Clock**: Controllable operational clock supporting real-time progression, variable simulation speeds (1x, 2x, 5x, 10x), tick advances, and scheduled airport events.
- **Digital Airport Map**: Illustrative schematic of BLR aprons, runways (09L/27R & 09R/27L), taxiways, and color-coded docking stands with an interactive stand inspection drawer.
- **Exact Discrete Mathematics Engine**: Deterministic computation of non-attacking rook configurations $R(B, x)$ and exact conflict-free assignment counts $N = \sum_{k=0}^n (-1)^k r_k (n-k)!$.
- **Guided Allocation Workspace**: A 7-step progressive workflow transitioning from fleet selection to compatibility restriction population, polynomial expansion, schedule generation, and conflict verification.
- **Comparative Scenario Simulation**: Evaluating the combinatorial and operational impact of airport disruptions (e.g., peak rush, stand maintenance closure, monsoon delays).
- **Publication-Grade Reporting**: Binary ReportLab PDF exports and CSV data exports carrying complete mathematical traces and digital twin disclaimers.

---

### 4. Technical Architecture Summary
- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts, Lucide Aviation Icons.
- **Backend**: FastAPI (Python 3.14), SQLAlchemy ORM, SQLite database with automatic schema migration, Pydantic v2 schemas.
- **Verification**: 173 backend pytest tests, Node.js unit tests, 512-matrix reference validation suite, zero compilation errors.
