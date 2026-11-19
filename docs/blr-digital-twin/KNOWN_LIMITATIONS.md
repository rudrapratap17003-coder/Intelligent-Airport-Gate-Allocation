# GateWise BLR — Known Limitations & Scope Boundaries
## Transparent Academic Disclosure & System Boundaries

### 1. Model Scope Boundaries
GateWise BLR is designed as an educational, decision-support, and simulation platform for discrete mathematics and airport operations. The following limitations are documented by design:

#### 1. Static Combinatorial Matching vs Dynamic Air Traffic Sequencing
- **Limitation**: The core mathematical engine (Rook Polynomials & PIE) operates on a static square matrix matching $n$ flights to $n$ stands for a defined operational time window.
- **Context**: In real-world airport operations, flights arrive continuously across a 24-hour horizon. While GateWise BLR models turnaround durations and detects temporal stand conflicts, the classical Rook Polynomial formula applies to static discrete assignment windows. It should not be misconstrued as an unbounded dynamic mixed-integer linear programming (MILP) solver.

#### 2. Representative Demonstration Stands vs Full Apron Layout
- **Limitation**: Kempegowda International Airport possesses over 100 aircraft parking stands across its passenger aprons, cargo aprons, and maintenance hangars.
- **Context**: GateWise BLR implements a representative demonstration layout (Stands G1–G6: contact aerobridge stands, remote bus stands, and Code F dual-level stands). This allows complete mathematical tractability and clear visual demonstration without overwhelming presentation screens.

#### 3. Air Traffic Control (ATC) & Airspace Exclusions
- **Limitation**: The simulation engine models ground stand occupancy, taxi routing schematics, and terminal boundaries.
- **Context**: En-route airspace management, terminal radar approach control (TRACON), runway wake turbulence separation sequencing, and dynamic weather deviations are outside the system scope.

#### 4. BIAL Operational Databases (AODB) Absence
- **Limitation**: The application does not interface with BIAL's proprietary Airport Operational Database (AODB) or SITA/Amadeus airport management feeds.
- **Context**: This is a strict security and policy constraint. All operational flights, delay scenarios, and turnaround events are synthetic demonstration records.

---

### 2. Scalability Parameters
- **Maximum Recommended Board Size for Exact Rook Polynomial**: $n \le 12 \times 12$. Due to combinatorial complexity (computing $k$-subsets on arbitrary boards), exact rook polynomial evaluation is exponential in the worst case for dense boards. For academic and demonstration purposes, $n = 6 \times 6$ to $n = 8 \times 8$ provides sub-millisecond evaluation with high pedagogical clarity.
- **Browser Memory Limits**: The interactive SVG map schematic renders smoothly across mobile and desktop viewport widths down to 360px without canvas degradation.
