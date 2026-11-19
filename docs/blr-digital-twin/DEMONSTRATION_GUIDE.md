# GateWise BLR — Live Demonstration & Evaluator Guide
## Step-by-Step Script for College Evaluations, Hackathons, & Presentations

### Prerequisites
1. Start Backend:
   ```bash
   cd backend
   py -3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. Start Frontend:
   ```bash
   cd frontend
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
3. Open browser: `http://127.0.0.1:5173/`

---

### Phase 1: Operational Center & Simulation Clock (2 Minutes)
1. Navigate to `/dashboard` (**BLR Operations Center**).
2. Point out the top header telemetry:
   - Airport Code badge: `VOBL / BLR`.
   - Simulation Clock: `08:30 IST`.
   - Operational Alerts banner (e.g., flight delay AI505).
3. Demonstrate the **Simulation Clock Controls**:
   - Click the **Play** button to initiate simulation time progression.
   - Click **+5m** to advance time in 5-minute increments.
   - Click the speed multiplier button (`1x` $\rightarrow$ `2x` $\rightarrow$ `5x`) to demonstrate accelerated time.
   - Click **Reset** to return to standard morning baseline (`08:30 IST`).

---

### Phase 2: Terminal 1 vs Terminal 2 Operations (2 Minutes)
1. Use the **Terminal Switcher** in the top navigation bar:
   - Click **Terminal 1**: Show that the interface filters to domestic flights and narrow-body stands.
   - Click **Terminal 2**: Highlight the `Code F` indicator badge and wide-body carrier support.
2. Navigate to `/terminals` (**Terminal Operations**):
   - Review Terminal 1: Opened 2008, 150.5k sq m, dedicated domestic (IndiGo, Akasa, SpiceJet).
   - Review Terminal 2: "Terminal in a Garden", opened 2023, 255.6k sq m, international hub + full-service domestic (Air India, Vistara).
   - Inspect the stands table showing max wingspan, jetway types, and ICAO aircraft codes.

---

### Phase 3: Digital Airport Map Exploration (2 Minutes)
1. Navigate to `/airport-map` (**Digital Airport Map**):
   - Explain the illustrative schematic: North Runway (09L/27R, CAT I), South Runway (09R/27L, CAT III-B), Terminal 1 apron on the west, and Terminal 2 apron on the east.
   - Point out the color coding: Green = Available, Blue = Occupied, Amber = Maintenance/Restricted.
2. Click on stand **G1** (T1):
   - Notice the stand inspection drawer displays: Code C, max 36m wingspan, single jetway.
3. Click on stand **G6** (T2):
   - Notice the stand inspection drawer displays: Code F, max 80m wingspan, dual-level boarding aerobridges for the Airbus A380.

---

### Phase 4: Guided Allocation Workspace & BLR Compatibility Integration (3 Minutes)
1. Navigate to `/workspace` (**Allocation Workspace**):
   - Step 1: Select 6 benchmark flights (AI101, UK202, 6E303, SG404, AI505, UK606). Click "Continue to Gates".
   - Step 2: Select 6 benchmark gates (G1 through G6). Click "Continue to Restrictions".
   - Step 3 (**Define Binary Restriction Board B**):
     - Click **"Apply BLR Compatibility Rules"**:
     - Notice how the application automatically sets cells to `1` (Forbidden) based on real physical rules:
       - AI101 (Wide-body Code E) forbidden on Stand G1 (Code C).
       - International flights forbidden on T1 stands.
     - Show the resulting restriction density: e.g. 5 forbidden cells on a 6 × 6 board.
   - Step 4 (**Evaluate Discrete Mathematics**):
     - Click **"Compute Deterministic Allocation"**:
     - Explain the mathematical output:
       - Permutations $n! = 6! = 720$.
       - Rook Polynomial: $R(B, x) = 1 + 5x + 9x^2 + 7x^3 + 2x^4$.
       - Principle of Inclusion-Exclusion exact integer sum: $N = 309$ valid conflict-free assignments out of 720.
   - Step 5 (**Generate Allocations**):
     - Click **"Generate Valid Allocations"**:
     - Backtracking generator produces the valid assignment list.
     - Highlight that every assignment passes the 5-rule independent conflict auditor.

---

### Phase 5: Publication-Grade Export & Verification (1 Minute)
1. Navigate to `/reports` (**Reports Hub**).
2. Click **Download PDF Report** for `SIM-001`:
   - Inspect the downloaded PDF:
     - Header: *"GateWise BLR — Kempegowda International Airport Bengaluru Digital Twin"*.
     - Footer: *"Academic Digital Twin — Simulated Operational Data (Not connected to BIAL internal systems)"*.
     - High-resolution mathematical table with alternating PIE signs, factorial scaling, and partial sums.
3. Show evaluator that the entire system is deterministic, thoroughly tested, mathematically rigorous, and completely free of mock or fabricated data.
