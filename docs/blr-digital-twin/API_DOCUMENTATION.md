# GateWise BLR — API Reference Documentation
## RESTful Endpoints Specification (FastAPI v1)

All endpoints are versioned under `/api/v1` and accessible over HTTP/JSON.

---

### 1. BLR Digital Twin Endpoints (`/api/v1/blr`)

#### `GET /api/v1/blr/config`
Returns verified public BLR airport metadata, runways, terminals, aircraft categories, and data classification tiers.
- **Response**: `200 OK`
  ```json
  {
    "metadata": {
      "iata_code": "BLR",
      "icao_code": "VOBL",
      "name": "Kempegowda International Airport Bengaluru",
      "operator": "Bangalore International Airport Limited (BIAL)",
      "data_tier": "VERIFIED_PUBLIC_DATA"
    },
    "runways": [
      { "identifier": "09L/27R", "name": "North Runway", "length_m": 4000, "ils_category": "CAT I" },
      { "identifier": "09R/27L", "name": "South Runway", "length_m": 4000, "ils_category": "CAT III-B" }
    ],
    "terminals": { "T1": {...}, "T2": {...} },
    "aircraft_categories": { "Code C": {...}, "Code D": {...}, "Code E": {...}, "Code F": {...} }
  }
  ```

#### `GET /api/v1/blr/terminals`
Returns operational summaries and live metrics for Terminal 1 and Terminal 2.
- **Response**: `200 OK`
  ```json
  [
    {
      "terminal_id": "T1",
      "name": "Terminal 1",
      "role": "Dedicated Domestic Operations",
      "statistics": {
        "total_stands": 2,
        "available_stands": 2,
        "occupied_stands": 0,
        "stand_utilization_pct": 0.0
      }
    },
    {
      "terminal_id": "T2",
      "name": "Terminal 2 ('Terminal in a Garden')",
      "role": "International Operations & Full-Service Domestic",
      "statistics": {
        "total_stands": 4,
        "available_stands": 3,
        "occupied_stands": 1,
        "stand_utilization_pct": 25.0
      }
    }
  ]
  ```

#### `GET /api/v1/blr/terminals/{terminal_id}`
Returns operational summary for a specific terminal (`T1` or `T2`). Returns `404` for unrecognized terminal identifiers.

#### `GET /api/v1/blr/stands`
Returns all airport gates/stands enriched with BLR stand specifications (stand number, terminal, category, wingspan, jetway flag, data tier).
- **Query Parameters**:
  - `terminal` (optional): Filter by terminal (`T1` or `T2`).

#### `POST /api/v1/blr/compatibility/check`
Evaluates whether a designated flight can physically and operationally dock at a designated stand.
- **Request Body**:
  ```json
  { "flight_id": "FL-001", "gate_id": "GT-001" }
  ```
- **Response**: `200 OK`
  ```json
  {
    "flight_id": "FL-001",
    "gate_id": "GT-001",
    "is_compatible": false,
    "status": "Incompatible",
    "diagnostic_reasons": [
      "Terminal Mismatch: Flight belongs to T2, but Stand is located in T1.",
      "Terminal Restriction: Terminal 1 is dedicated to Domestic operations. International flights must be assigned to Terminal 2.",
      "Aircraft Category Limit Exceeded: Flight aircraft is Code E, but Stand supports up to Code C only."
    ]
  }
  ```

#### `GET /api/v1/blr/turnaround/timeline`
Computes turnaround windows and stand occupancy timelines for all registered flights.

#### `POST /api/v1/blr/turnaround/verify-allocation`
Checks whether a proposed allocation has overlapping turnaround occupancies at any physical stand.
- **Request Body**:
  ```json
  {
    "allocations": [
      { "flight_id": "FL-001", "gate_id": "GT-003" },
      { "flight_id": "FL-002", "gate_id": "GT-003" }
    ]
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "valid": false,
    "conflicts_count": 1,
    "conflicts": [
      {
        "gate_id": "GT-003",
        "overlap_minutes": 75,
        "reason": "Physical Stand Overlap: Flight UK202 arrives at 08:45 before Stand is released by Flight AI101 at 10:00 (75 min overlap)."
      }
    ]
  }
  ```

#### `GET /api/v1/blr/alerts`
Returns rule-generated operational alerts (flight delays, maintenance stands, capacity bottlenecks).

#### `GET /api/v1/blr/simulation/clock`
Returns simulated clock state (`is_running`, `sim_time`, `speed_multiplier`, `events`).

#### `POST /api/v1/blr/simulation/clock/control`
Controls simulation clock:
- **Actions**: `"start"`, `"pause"`, `"resume"`, `"reset"`, `"tick"`, `"speed"`, `"set_time"`.

---

### 2. Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Application status, version, and health check |
| `GET` | `/api/v1/flights` | List all flights in the registry |
| `POST` | `/api/v1/flights` | Register new flight with BLR fields |
| `GET` | `/api/v1/gates` | List all apron stands/gates |
| `POST` | `/api/v1/gates` | Register new stand with dimensions |
| `GET` | `/api/v1/simulations` | List all scenarios |
| `POST` | `/api/v1/simulations` | Create a new scenario |
| `GET` | `/api/v1/simulations/{id}/matrix` | Get binary restriction matrix |
| `PUT` | `/api/v1/simulations/{id}/matrix` | Update binary restriction matrix |
| `GET` | `/api/v1/simulations/{id}/calculation` | Evaluate Rook Polynomial & PIE |
| `POST` | `/api/v1/simulations/{id}/generate` | Generate conflict-free allocations |
| `GET` | `/api/v1/export/simulations/{id}/report/pdf` | Export binary PDF report |
| `GET` | `/api/v1/export/flights/csv` | Export flights registry as CSV |
| `GET` | `/api/v1/export/gates/csv` | Export gates registry as CSV |
