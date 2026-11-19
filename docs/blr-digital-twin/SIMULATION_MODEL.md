# GateWise BLR — Simulation Model
## Aircraft Turnaround, Resource Occupancy, & Simulation Operations Engine

### 1. Aircraft Turnaround & Occupancy Formulation
Ground operations require aircraft to occupy a parking stand for a finite turnaround window encompassing deboarding, refueling, catering, baggage handling, cleaning, and boarding.

#### Occupancy Window Equation:
For any flight $f_i$:
$$\text{Window}(f_i) = [T_{\text{arrival}}(f_i), T_{\text{arrival}}(f_i) + D_{\text{turnaround}}(f_i) + B_{\text{buffer}}(f_i)]$$

Where:
- $T_{\text{arrival}}(f_i)$: Inbound touchdown and stand docking timestamp (in minutes from midnight).
- $D_{\text{turnaround}}(f_i)$: Ground servicing duration.
- $B_{\text{buffer}}(f_i)$: Mandatory safety buffer time required between consecutive dockings at the same physical stand.

#### Category Benchmark Turnaround Assumptions:
| Aircraft Code | Typical Aircraft | Default Turnaround $D$ | Safety Buffer $B$ | Total Stand Block Window |
|---|---|---|---|---|
| **Code C** | A320neo, B737 MAX | 45 minutes | 15 minutes | 60 minutes |
| **Code D** | B757, B767 | 65 minutes | 20 minutes | 85 minutes |
| **Code E** | B777, A350, B787 | 90 minutes | 30 minutes | 120 minutes |
| **Code F** | A380-800 | 120 minutes | 35 minutes | 155 minutes |

> [!NOTE]
> Turnaround values are configurable demonstration parameters reflecting standard airline ground handling schedules for academic simulation purposes.

---

### 2. Stand Occupancy Conflict Detection
When an allocation assigns multiple flights $\{f_a, f_b\}$ to the same physical stand $g_k$, the turnaround service verifies non-overlapping occupancy:

Let $f_a$ arrive before $f_b$:
$$T_{\text{arrival}}(f_b) \ge T_{\text{arrival}}(f_a) + D_{\text{turnaround}}(f_a) + B_{\text{buffer}}(f_a)$$

If $T_{\text{arrival}}(f_b) < \text{ReleaseTime}(f_a)$, an **Occupancy Conflict** is flagged:
$$\text{OverlapMinutes} = \text{ReleaseTime}(f_a) - T_{\text{arrival}}(f_b)$$

---

### 3. Simulation Operations Engine & Clock Architecture
The simulated airport operates on a controllable operational clock completely decoupled from system wall-clock time:

- **State Representation**:
  - `sim_time_minutes`: Minutes from midnight (e.g. 510 = `08:30 IST`).
  - `is_running`: Boolean running flag.
  - `speed_multiplier`: Time acceleration factor ($1\times, 2\times, 5\times, 10\times$).
  - `scenario_seed`: Reproducible simulation seed (e.g. `BLR-MORNING-PEAK-2026`).
- **Control Interface**:
  - `start` / `resume`: Begins clock progression.
  - `pause`: Freezes simulation time.
  - `tick(advance_minutes)`: Advances clock by a discrete step (e.g. $+5$ min).
  - `speed(multiplier)`: Sets simulation acceleration.
  - `reset`: Restores clock to standard morning baseline (`08:30 IST`).
- **Event Queue**:
  - Sequential schedule of operational events: flight touchdowns, docking confirmations, boarding calls, delay notifications, and pushbacks.
  - Events transition from `SCHEDULED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` based on simulation clock advancement.
