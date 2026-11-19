# Kempegowda International Airport Bengaluru (BLR)
## Terminal 1 & Terminal 2 Configuration Specification

### 1. Terminal 1 (Dedicated Domestic Terminal)
- **Role**: Dedicated Domestic Low-Cost and Regional Carrier Operations.
- **Opened**: May 2008 (Substantial expansion and modernization commissioned in 2014).
- **Floor Area**: ~150,500 square meters.
- **Operating Airlines**:
  - IndiGo (`6E`) — Primary domestic hub carrier.
  - Akasa Air (`QP`) — Domestic network operations.
  - SpiceJet (`SG`) — Domestic trunk and regional flights.
  - Air India Express (`IX`) — Domestic routes.
- **Operational Boundaries**:
  - Exclusively handles flights categorized as `Domestic`.
  - International flights attempting assignment to T1 are strictly rejected by the compatibility engine.
- **Aircraft Capability**:
  - Supports aircraft up to **Code C** (wingspan < 36.0 m) and select **Code D** (wingspan < 52.0 m).
  - Code E wide-body aircraft (Boeing 777, Airbus A350) and Code F aircraft cannot be accommodated at T1 contact aerobridge stands.
- **Stands Architecture**:
  - Contact stands with single passenger boarding bridges (e.g. Stands G1–G2).
  - Remote apron parking stands serviced via bus boarding lounges.

---

### 2. Terminal 2 ("Terminal in a Garden")
- **Role**: Scheduled International Operations & Full-Service Domestic Hub.
- **Opened**: Phase 1 inaugurated January 2023 for domestic flights; all international operations shifted September 12, 2023.
- **Floor Area**: ~255,645 square meters (Phase 1).
- **Operating Airlines**:
  - All scheduled international carriers: Emirates (`EK`), Singapore Airlines (`SQ`), Qatar Airways (`QR`), Lufthansa (`LH`), British Airways (`BA`), Etihad Airways (`EY`), Air France (`AF`), KLM (`KL`), Virgin Atlantic (`VS`), Malaysia Airlines (`MH`), Cathay Pacific (`CX`), etc.
  - Full-service domestic carriers: Air India (`AI`), Vistara (`UK`).
- **Operational Boundaries**:
  - Accommodates both `International` and `Domestic` flight categories.
  - Dedicated immigration, customs, and dual-boarding separation corridors.
- **Aircraft Capability**:
  - Supports **Code C, Code D, Code E, and Code F** aircraft (wingspan up to 80.0 m).
  - Stand G6 (representing Stand 210) is equipped with dual-level boarding aerobridges designed for super-heavy Code F aircraft, notably the Airbus A380-800.
- **Stands Architecture**:
  - Dual and single aerobridge contact docking bays.
  - Wide-body capable remote apron stands with high-capacity bus transfer lanes.

---

### 3. Apron Stands vs Passenger Boarding Gates
GateWise BLR explicitly models the physical difference between passenger boarding gates and aircraft apron parking stands:

```
+------------------------------------+------------------------------------+
| Passenger Boarding Gate (Terminal) | Apron Aircraft Parking Stand (Bays)|
+------------------------------------+------------------------------------+
| Located inside the terminal concourse| Located on the concrete tarmac/apron|
| Manages passenger queuing & scanning| Docking location for physical plane|
| May connect via jetway OR bus lounge| Physical limits: wingspan, length  |
| 1:1 or 1:N relationship with stands | 1 Stand can connect to multiple gates|
+------------------------------------+------------------------------------+
```

In the demonstration dataset:
- **Contact Aerobridge Stands** (Stands G1–G5) have a direct 1:1 jetway linkage.
- **Contact Dual Aerobridge Stand** (Stand G6) has dual jetways for simultaneous upper and lower deck passenger boarding.
- **Remote Apron Stands** connect to bus gates and require dedicated turnaround transfer buffering.
