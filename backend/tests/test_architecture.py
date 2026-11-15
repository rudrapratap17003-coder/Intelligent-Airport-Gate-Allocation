"""
GateWise — Architecture & API v1 Test Suite.
Verifies OpenAPI docs, router registration, versioning, and error handlers.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_openapi_docs_available():
    """Verify OpenAPI schema and Swagger endpoints exist."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "GateWise"
    assert "/api/health" in schema["paths"]
    assert "/api/v1/flights" in schema["paths"]
    assert "/api/v1/gates" in schema["paths"]
    assert "/api/v1/simulations" in schema["paths"]
    assert "/api/v1/restrictions/{sim_id}" in schema["paths"]


def test_swagger_ui_loads():
    """Verify Swagger UI renders at /docs."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc_loads():
    """Verify ReDoc UI renders at /redoc."""
    response = client.get("/redoc")
    assert response.status_code == 200


def test_api_v1_flights_placeholder():
    """Verify /api/v1/flights route is wired and responds."""
    response = client.get("/api/v1/flights")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_api_v1_gates_placeholder():
    """Verify /api/v1/gates route is wired and responds."""
    response = client.get("/api/v1/gates")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_api_v1_simulations_placeholder():
    """Verify /api/v1/simulations route is wired and responds."""
    response = client.get("/api/v1/simulations")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_api_v1_restrictions_placeholder():
    """Verify /api/v1/restrictions/{sim_id} route is wired and responds."""
    response = client.get("/api/v1/restrictions/SIM-001")
    assert response.status_code == 200
    data = response.json()
    assert data["simulation_id"] == "SIM-001"


def test_custom_http_error_handler():
    """Verify custom 404 response structure."""
    response = client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "HTTP_404"
