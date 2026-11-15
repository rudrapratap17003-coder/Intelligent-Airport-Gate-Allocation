"""
GateWise — Health endpoint test.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint():
    """Verify the health endpoint returns expected data."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["application"] == "GateWise"
    assert "version" in data
    assert "description" in data


def test_health_endpoint_fields():
    """Verify all expected fields are present."""
    response = client.get("/api/health")
    data = response.json()
    expected_keys = {"status", "application", "version", "description"}
    assert expected_keys == set(data.keys())
