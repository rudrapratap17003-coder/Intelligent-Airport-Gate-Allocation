"""
GateWise BLR — Kempegowda International Airport (BLR) Configuration Module.
Centralized, authoritative configuration representing verified public airport data,
configurable demonstration records, and simulated operational parameters.

Data Classification Architecture:
1. VERIFIED PUBLIC DATA: Officially published BLR infrastructure specs, terminal roles,
   airline terminal designations, runway dimensions, and ICAO Annex 14 codes.
2. CONFIGURABLE DEMONSTRATION DATA: Representative stand layouts, jetway flags,
   and operational parameters configured for simulation demonstrations.
3. SIMULATED OPERATIONAL DATA: Generated flight schedules, turnaround timelines,
   delay events, and gate assignments.

Academic Simulation Disclaimer:
This system is an academic digital twin prototype. It does NOT connect to BIAL
internal operational databases, live AODB systems, or commercial scheduling feeds.
"""

from typing import Dict, List, Any
from enum import Enum


class DataTier(str, Enum):
    VERIFIED_PUBLIC = "VERIFIED_PUBLIC_DATA"
    CONFIGURABLE_DEMO = "CONFIGURABLE_DEMONSTRATION_DATA"
    SIMULATED_OPERATIONAL = "SIMULATED_OPERATIONAL_DATA"


# 1. Airport High-Level Identity (Verified Public Data)
BLR_AIRPORT_METADATA: Dict[str, Any] = {
    "iata_code": "BLR",
    "icao_code": "VOBL",
    "name": "Kempegowda International Airport Bengaluru",
    "short_name": "GateWise BLR Digital Twin",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "elevation_amsl_m": 915,
    "elevation_amsl_ft": 3000,
    "coordinates": {
        "latitude": 13.1979,
        "longitude": 77.7063
    },
    "operator": "Bangalore International Airport Limited (BIAL)",
    "data_tier": DataTier.VERIFIED_PUBLIC.value,
    "sources": [
        "Airports Authority of India (AAI) AIP VOBL AD 2.1",
        "BIAL Official Portal (bengaluruairport.com)",
        "Directorate General of Civil Aviation (DGCA) Aerodrome Directory",
        "Ministry of Civil Aviation (MoCA) Press Releases (T2 Commissioning 2023)"
    ],
    "disclaimer": (
        "Academic Digital Twin Prototype. Not connected to BIAL operational databases. "
        "Flight schedules, turnaround durations, and gate assignments are simulated."
    )
}

# 2. Runway Infrastructure (Verified Public Data)
BLR_RUNWAYS: List[Dict[str, Any]] = [
    {
        "id": "RWY-09L-27R",
        "identifier": "09L/27R",
        "name": "North Runway",
        "length_m": 4000,
        "width_m": 45,
        "surface": "Asphalt",
        "ils_category": "CAT I",
        "status": "Operational",
        "data_tier": DataTier.VERIFIED_PUBLIC.value
    },
    {
        "id": "RWY-09R-27L",
        "identifier": "09R/27L",
        "name": "South Runway",
        "length_m": 4000,
        "width_m": 45,
        "surface": "Asphalt",
        "ils_category": "CAT III-B",
        "status": "Operational",
        "data_tier": DataTier.VERIFIED_PUBLIC.value
    }
]

# 3. Terminal Specifications (Verified Public Roles + Configurable Demonstration Stands)
BLR_TERMINALS: Dict[str, Dict[str, Any]] = {
    "T1": {
        "id": "T1",
        "name": "Terminal 1",
        "opened_year": 2008,
        "expanded_year": 2014,
        "role": "Dedicated Domestic Operations",
        "description": "Original terminal handling domestic low-cost and regional carriers.",
        "area_sq_m": 150500,
        "primary_airlines": [
            {"code": "6E", "name": "IndiGo", "type": "Domestic"},
            {"code": "QP", "name": "Akasa Air", "type": "Domestic"},
            {"code": "SG", "name": "SpiceJet", "type": "Domestic"},
            {"code": "IX", "name": "Air India Express (Domestic)", "type": "Domestic"}
        ],
        "allowed_flight_types": ["Domestic"],
        "supported_aircraft_categories": ["Code C", "Code D"],
        "max_wingspan_m": 52.0,
        "contact_stands_count": 16,
        "remote_stands_count": 8,
        "data_tier": DataTier.VERIFIED_PUBLIC.value,
        "operational_status": "Active"
    },
    "T2": {
        "id": "T2",
        "name": "Terminal 2 ('Terminal in a Garden')",
        "opened_year": 2023,
        "role": "International Operations & Full-Service Domestic",
        "description": "Phase 1 eco-terminal handling international flights and full-service domestic carriers.",
        "area_sq_m": 255645,
        "primary_airlines": [
            {"code": "AI", "name": "Air India", "type": "Full-Service / International"},
            {"code": "UK", "name": "Vistara", "type": "Full-Service Domestic"},
            {"code": "EK", "name": "Emirates", "type": "International Wide-Body"},
            {"code": "SQ", "name": "Singapore Airlines", "type": "International Wide-Body"},
            {"code": "QR", "name": "Qatar Airways", "type": "International Wide-Body"},
            {"code": "LH", "name": "Lufthansa", "type": "International Wide-Body"},
            {"code": "BA", "name": "British Airways", "type": "International Wide-Body"},
            {"code": "EY", "name": "Etihad Airways", "type": "International Wide-Body"},
            {"code": "AF", "name": "Air France", "type": "International Wide-Body"},
            {"code": "KL", "name": "KLM", "type": "International Wide-Body"}
        ],
        "allowed_flight_types": ["Domestic", "International"],
        "supported_aircraft_categories": ["Code C", "Code D", "Code E", "Code F"],
        "max_wingspan_m": 80.0,
        "contact_stands_count": 16,
        "remote_stands_count": 8,
        "data_tier": DataTier.VERIFIED_PUBLIC.value,
        "operational_status": "Active"
    }
}

# 4. ICAO Aircraft Categories & Standard Turnaround Times (Verified Public Standards)
AIRCRAFT_CATEGORIES: Dict[str, Dict[str, Any]] = {
    "Code C": {
        "category": "Code C",
        "wingspan_range": "24.0m to <36.0m",
        "max_wingspan_m": 36.0,
        "max_length_m": 45.0,
        "representative_models": ["Airbus A320neo", "Airbus A321neo", "Boeing 737-800", "Boeing 737 MAX 8"],
        "default_turnaround_min": 45,
        "min_buffer_min": 15,
        "description": "Narrow-body short/medium haul",
        "data_tier": DataTier.VERIFIED_PUBLIC.value
    },
    "Code D": {
        "category": "Code D",
        "wingspan_range": "36.0m to <52.0m",
        "max_wingspan_m": 52.0,
        "max_length_m": 60.0,
        "representative_models": ["Boeing 757-200", "Boeing 767-300"],
        "default_turnaround_min": 65,
        "min_buffer_min": 20,
        "description": "Medium/wide-body transcontinental",
        "data_tier": DataTier.VERIFIED_PUBLIC.value
    },
    "Code E": {
        "category": "Code E",
        "wingspan_range": "52.0m to <65.0m",
        "max_wingspan_m": 65.0,
        "max_length_m": 75.0,
        "representative_models": ["Airbus A330-300", "Airbus A350-900", "Boeing 777-300ER", "Boeing 787-9 Dreamliner"],
        "default_turnaround_min": 90,
        "min_buffer_min": 30,
        "description": "Wide-body long-haul international",
        "data_tier": DataTier.VERIFIED_PUBLIC.value
    },
    "Code F": {
        "category": "Code F",
        "wingspan_range": "65.0m to <80.0m",
        "max_wingspan_m": 80.0,
        "max_length_m": 80.0,
        "representative_models": ["Airbus A380-800", "Boeing 747-8 Intercontinental"],
        "default_turnaround_min": 120,
        "min_buffer_min": 35,
        "description": "Super-heavy high-capacity long-haul (T2 dual-boarding aerobridges only)",
        "data_tier": DataTier.VERIFIED_PUBLIC.value
    }
}

# 5. Configurable Demonstration Apron Stands (Configurable Demonstration Data)
# Explicitly distinct from passenger boarding gates:
# Stands represent physical aircraft parking bays on the apron.
DEMO_BLR_STANDS: List[Dict[str, Any]] = [
    # Terminal 1 Stands (Stands 1 to 6 - Contact; Stands R1 to R2 - Remote)
    {
        "id": "STAND-T1-01",
        "stand_number": "Stand 1",
        "terminal": "T1",
        "stand_type": "Contact Aerobridge",
        "has_jetway": True,
        "max_aircraft_category": "Code C",
        "max_wingspan_m": 36.0,
        "max_length_m": 45.0,
        "connected_gate_id": "GT-001",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    },
    {
        "id": "STAND-T1-02",
        "stand_number": "Stand 2",
        "terminal": "T1",
        "stand_type": "Contact Aerobridge",
        "has_jetway": True,
        "max_aircraft_category": "Code C",
        "max_wingspan_m": 36.0,
        "max_length_m": 45.0,
        "connected_gate_id": "GT-002",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    },
    {
        "id": "STAND-T1-03",
        "stand_number": "Stand 3",
        "terminal": "T1",
        "stand_type": "Contact Aerobridge",
        "has_jetway": True,
        "max_aircraft_category": "Code C",
        "max_wingspan_m": 36.0,
        "max_length_m": 45.0,
        "connected_gate_id": "GT-003-T1",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    },
    {
        "id": "STAND-T1-R1",
        "stand_number": "Stand R1",
        "terminal": "T1",
        "stand_type": "Remote Apron Stand",
        "has_jetway": False,
        "max_aircraft_category": "Code C",
        "max_wingspan_m": 36.0,
        "max_length_m": 45.0,
        "connected_gate_id": "GT-T1-BUS1",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    },
    # Terminal 2 Stands (Stands 201 to 204 - Contact Wide/Dual; Stand 210 - Code F; Stand R21 - Remote)
    {
        "id": "STAND-T2-01",
        "stand_number": "Stand 201",
        "terminal": "T2",
        "stand_type": "Contact Aerobridge",
        "has_jetway": True,
        "max_aircraft_category": "Code E",
        "max_wingspan_m": 65.0,
        "max_length_m": 75.0,
        "connected_gate_id": "GT-003",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    },
    {
        "id": "STAND-T2-02",
        "stand_number": "Stand 202",
        "terminal": "T2",
        "stand_type": "Contact Aerobridge",
        "has_jetway": True,
        "max_aircraft_category": "Code E",
        "max_wingspan_m": 65.0,
        "max_length_m": 75.0,
        "connected_gate_id": "GT-004",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    },
    {
        "id": "STAND-T2-03",
        "stand_number": "Stand 203",
        "terminal": "T2",
        "stand_type": "Contact Aerobridge",
        "has_jetway": True,
        "max_aircraft_category": "Code E",
        "max_wingspan_m": 65.0,
        "max_length_m": 75.0,
        "connected_gate_id": "GT-005",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    },
    {
        "id": "STAND-T2-10",
        "stand_number": "Stand 210 (Code F)",
        "terminal": "T2",
        "stand_type": "Contact Dual Aerobridge",
        "has_jetway": True,
        "max_aircraft_category": "Code F",
        "max_wingspan_m": 80.0,
        "max_length_m": 80.0,
        "connected_gate_id": "GT-006",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    },
    {
        "id": "STAND-T2-R21",
        "stand_number": "Stand R21",
        "terminal": "T2",
        "stand_type": "Remote Apron Stand",
        "has_jetway": False,
        "max_aircraft_category": "Code E",
        "max_wingspan_m": 65.0,
        "max_length_m": 75.0,
        "connected_gate_id": "GT-T2-BUS1",
        "status": "Available",
        "data_tier": DataTier.CONFIGURABLE_DEMO.value
    }
]


def get_airport_overview() -> Dict[str, Any]:
    """Returns consolidated airport metadata, runways, and terminal specifications."""
    return {
        "metadata": BLR_AIRPORT_METADATA,
        "runways": BLR_RUNWAYS,
        "terminals": BLR_TERMINALS,
        "aircraft_categories": AIRCRAFT_CATEGORIES,
        "data_classification": {
            "tier_1": {
                "name": "Verified Public Data",
                "tag": DataTier.VERIFIED_PUBLIC.value,
                "description": "Airport coordinates, ICAO/IATA identifiers, runway specs, airline terminal designations."
            },
            "tier_2": {
                "name": "Configurable Demonstration Data",
                "tag": DataTier.CONFIGURABLE_DEMO.value,
                "description": "Representative apron stands, jetway availability, physical limits."
            },
            "tier_3": {
                "name": "Simulated Operational Data",
                "tag": DataTier.SIMULATED_OPERATIONAL.value,
                "description": "Simulated flights, schedules, turnaround windows, delay conditions, and allocations."
            }
        }
    }
