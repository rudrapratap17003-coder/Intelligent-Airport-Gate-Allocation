# Kempegowda International Airport Bengaluru (BLR)
## Authoritative Airport Data Sources & Fact Register

### 1. Authoritative Data Sources
Every factual claim regarding infrastructure, runway alignments, terminal designations, and carrier assignments is sourced directly from authoritative public aeronautical publications:

1. **Airports Authority of India (AAI) — Aeronautical Information Publication (AIP)**
   - *Document*: AIP India — VOBL AD 2.1 (Aerodrome Geographical and Administrative Data)
   - *Verified Parameters*:
     - Aerodrome ICAO Code: **VOBL**
     - Aerodrome IATA Code: **BLR**
     - Coordinates: 13°11'56" N, 77°42'20" E
     - Elevation: 915 m (3,000 ft) AMSL
     - Operator: Bangalore International Airport Limited (BIAL)

2. **Runway Infrastructure Publications**
   - *Source*: AAI AIP VOBL AD 2.12 (Runway Physical Characteristics)
   - *Verified Parameters*:
     - **North Runway (09L/27R)**: 4,000 m × 45 m, Asphalt, Instrument Landing System CAT I.
     - **South Runway (09R/27L)**: 4,000 m × 45 m, Asphalt, Instrument Landing System CAT III-B (commissioned for low-visibility operations).

3. **Terminal Commissioning & Allocation Documentation**
   - *Source*: BIAL Official Portal (bengaluruairport.com) & Ministry of Civil Aviation (MoCA) Press Releases:
     - **Terminal 1 (T1)**: Opened May 2008, expanded 2014, ~150,500 sq m. Officially designated for dedicated domestic low-cost operations (IndiGo, Akasa Air, SpiceJet, Air India Express domestic).
     - **Terminal 2 (T2 — "Terminal in a Garden")**: Phase 1 inaugurated January 2023 for domestic flights; scheduled international operations officially shifted on September 12, 2023. ~255,645 sq m Phase 1 floor area. Handles all international flights and full-service domestic operations (Air India, Vistara).

4. **International Civil Aviation Organization (ICAO)**
   - *Document*: ICAO Annex 14 — Aerodrome Design and Operations (Volume I)
   - *Verified Parameters*: Aircraft aerodrome reference codes:
     - **Code C**: Wingspan 24.0 m to <36.0 m (Airbus A320neo, Boeing 737 MAX).
     - **Code D**: Wingspan 36.0 m to <52.0 m (Boeing 757, Boeing 767).
     - **Code E**: Wingspan 52.0 m to <65.0 m (Boeing 777, Airbus A350, Boeing 787).
     - **Code F**: Wingspan 65.0 m to <80.0 m (Airbus A380-800, Boeing 747-8). Stand 210 in T2 features dual-level boarding aerobridges accommodating Code F.

---

### 2. Traceability Matrix

| Field | Value | Classification | Source |
|---|---|---|---|
| Aerodrome Name | Kempegowda International Airport | Verified Public | AAI AIP VOBL AD 2.1 |
| IATA / ICAO | BLR / VOBL | Verified Public | AAI AIP VOBL AD 2.1 |
| Geographic Center | 13.1979° N, 77.7063° E | Verified Public | AAI AIP VOBL AD 2.1 |
| Elevation | 915 m AMSL | Verified Public | AAI AIP VOBL AD 2.1 |
| North Runway | 09L/27R (4,000m × 45m CAT I) | Verified Public | AAI AIP VOBL AD 2.12 |
| South Runway | 09R/27L (4,000m × 45m CAT III-B) | Verified Public | AAI AIP VOBL AD 2.12 |
| T1 Role | Dedicated Domestic Operations | Verified Public | BIAL Official Portal |
| T2 Role | International & Full-Service Domestic | Verified Public | MoCA Release (Sept 2023) |
| Demonstration Stands | Gates G1–G6 (Stands 1–6, 201–210) | Configurable Demo | Digital Twin Configuration |
| Flight Schedules | Artificial AI101, UK202, 6E303, etc. | Simulated Operational | Simulation Generator |
| Turnarounds | 45m–120m ground handling | Simulated Operational | Simulation Engine |
