"""
GateWise BLR — Digital Twin Test Suite.
Verifies airport configuration, terminal operations, compatibility engine,
turnaround calculations, operational alerts, and simulation clock controls.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.airport_config import BLR_AIRPORT_METADATA, BLR_TERMINALS, AIRCRAFT_CATEGORIES


@pytest.fixture
def client():
    return TestClient(app)


def test_blr_config(client):
    """Verify BLR airport configuration metadata and data classification tiers."""
    response = client.get("/api/v1/blr/config")
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["iata_code"] == "BLR"
    assert data["metadata"]["icao_code"] == "VOBL"
    assert "Kempegowda" in data["metadata"]["name"]
    assert len(data["runways"]) == 2
    assert "T1" in data["terminals"]
    assert "T2" in data["terminals"]
    assert "Code C" in data["aircraft_categories"]
    assert "Code E" in data["aircraft_categories"]
    assert "tier_1" in data["data_classification"]
    assert "tier_2" in data["data_classification"]
    assert "tier_3" in data["data_classification"]


def test_blr_terminals_overview(client):
    """Verify terminal summary listing."""
    response = client.get("/api/v1/blr/terminals")
    assert response.status_code == 200
    terminals = response.json()
    assert len(terminals) == 2
    t1 = next(t for t in terminals if t["terminal_id"] == "T1")
    t2 = next(t for t in terminals if t["terminal_id"] == "T2")
    assert t1["name"] == "Terminal 1"
    assert t2["name"] == "Terminal 2 ('Terminal in a Garden')"
    assert t1["statistics"]["total_stands"] >= 2
    assert t2["statistics"]["total_stands"] >= 4


def test_blr_terminal_detail(client):
    """Verify specific terminal query."""
    res_t1 = client.get("/api/v1/blr/terminals/T1")
    assert res_t1.status_code == 200
    assert res_t1.json()["terminal_id"] == "T1"
    assert "Dedicated Domestic" in res_t1.json()["role"]

    res_t2 = client.get("/api/v1/blr/terminals/T2")
    assert res_t2.status_code == 200
    assert res_t2.json()["terminal_id"] == "T2"
    assert "International" in res_t2.json()["role"]

    res_invalid = client.get("/api/v1/blr/terminals/T99")
    assert res_invalid.status_code == 404


def test_blr_stands_list(client):
    """Verify stands listing and enrichment."""
    response = client.get("/api/v1/blr/stands")
    assert response.status_code == 200
    stands = response.json()
    assert len(stands) >= 6
    for s in stands:
        assert "gate_number" in s
        assert "stand_number" in s
        assert "stand_type" in s
        assert "aircraft_category" in s
        assert "max_wingspan_m" in s


def test_compatibility_check_valid_code_c(client):
    """Verify valid Code C narrow-body flight on Code C stand."""
    payload = {"flight_id": "FL-003", "gate_id": "GT-001"}
    response = client.post("/api/v1/blr/compatibility/check", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["is_compatible"] is True
    assert result["status"] == "Compatible"
    assert len(result["diagnostic_reasons"]) == 0


def test_compatibility_check_category_mismatch(client):
    """Verify Code E wide-body flight on Code C stand is rejected."""
    # FL-001 is Code E (B777), GT-001 is Code C (G1) in T1
    payload = {"flight_id": "FL-001", "gate_id": "GT-001"}
    response = client.post("/api/v1/blr/compatibility/check", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["is_compatible"] is False
    assert result["status"] == "Incompatible"
    # Should flag aircraft category limit and terminal mismatch
    assert any("Category Limit Exceeded" in r for r in result["diagnostic_reasons"])


def test_compatibility_check_terminal_role_mismatch(client):
    """Verify International flight cannot be assigned to Terminal 1."""
    # Create or check international flight with T1 stand
    payload = {"flight_id": "FL-001", "gate_id": "GT-002"}
    response = client.post("/api/v1/blr/compatibility/check", json=payload)
    assert response.status_code == 200
    result = response.json()
    assert result["is_compatible"] is False
    assert any("Terminal Mismatch" in r or "Terminal Restriction" in r for r in result["diagnostic_reasons"])


def test_turnaround_timeline(client):
    """Verify turnaround calculation and occupancy timeline."""
    response = client.get("/api/v1/blr/turnaround/timeline")
    assert response.status_code == 200
    timeline = response.json()
    assert len(timeline) >= 6
    for item in timeline:
        assert "turnaround_duration_min" in item
        assert "safety_buffer_min" in item
        assert "total_occupancy_min" in item
        assert item["total_occupancy_min"] == item["turnaround_duration_min"] + item["safety_buffer_min"]


def test_turnaround_verify_allocation_overlap(client):
    """Verify detection of temporal turnaround overlap on the same physical stand."""
    # Assign FL-001 (08:30-10:00) and FL-002 (08:45-09:45) to the same gate GT-003
    payload = {
        "allocations": [
            {"flight_id": "FL-001", "gate_id": "GT-003"},
            {"flight_id": "FL-002", "gate_id": "GT-003"}
        ]
    }
    response = client.post("/api/v1/blr/turnaround/verify-allocation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert data["conflicts_count"] >= 1
    assert "Physical Stand Overlap" in data["conflicts"][0]["reason"]


def test_operational_alerts(client):
    """Verify generation of operational alerts."""
    response = client.get("/api/v1/blr/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)
    # FL-005 is marked Delayed, so there should be a FLIGHT_DELAY alert
    delay_alerts = [a for a in alerts if a["category"] == "FLIGHT_DELAY"]
    assert len(delay_alerts) >= 1
    assert delay_alerts[0]["entity_identifier"] == "AI505"


def test_simulation_clock_lifecycle(client):
    """Verify simulation clock controls: start, tick, pause, reset, speed."""
    # Get initial
    res_init = client.get("/api/v1/blr/simulation/clock")
    assert res_init.status_code == 200
    assert "sim_time" in res_init.json()

    # Start
    res_start = client.post("/api/v1/blr/simulation/clock/control", json={"action": "start"})
    assert res_start.status_code == 200
    assert res_start.json()["is_running"] is True

    # Advance tick by 15 min
    res_tick = client.post("/api/v1/blr/simulation/clock/control", json={"action": "tick", "advance_minutes": 15})
    assert res_tick.status_code == 200

    # Set speed to 5x
    res_speed = client.post("/api/v1/blr/simulation/clock/control", json={"action": "speed", "speed": 5})
    assert res_speed.status_code == 200
    assert res_speed.json()["speed_multiplier"] == 5

    # Pause
    res_pause = client.post("/api/v1/blr/simulation/clock/control", json={"action": "pause"})
    assert res_pause.status_code == 200
    assert res_pause.json()["is_running"] is False

    # Reset
    res_reset = client.post("/api/v1/blr/simulation/clock/control", json={"action": "reset"})
    assert res_reset.status_code == 200
    assert res_reset.json()["sim_time"] == "08:30"
    assert res_reset.json()["is_running"] is False
