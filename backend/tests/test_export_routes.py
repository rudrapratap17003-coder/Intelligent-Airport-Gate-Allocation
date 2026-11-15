"""
Tests for GateWise Phase 26 — Report Export System endpoints (/api/v1/export).
Verifies CSV exports for flights, gates, restriction matrices, allocations,
mathematical calculations, scenario comparisons, printable academic HTML,
and binary ReportLab PDF generation.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_export_flights_csv():
    """Verify CSV export of registered flights."""
    response = client.get("/api/v1/export/flights/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "Content-Disposition" in response.headers
    content = response.text
    assert "Flight Number" in content
    assert "Airline" in content
    assert "Terminal" in content


def test_export_gates_csv():
    """Verify CSV export of registered gates."""
    response = client.get("/api/v1/export/gates/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "Content-Disposition" in response.headers
    content = response.text
    assert "Gate Number" in content
    assert "Terminal" in content
    assert "Gate Type" in content


def test_export_matrix_csv_sim001():
    """Verify CSV export of restriction matrix for SIM-001."""
    response = client.get("/api/v1/export/simulations/SIM-001/matrix/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    assert "Flight \\ Gate" in content


def test_export_allocations_csv_sim001():
    """Verify CSV export of generated allocations for SIM-001."""
    response = client.get("/api/v1/export/simulations/SIM-001/allocations/csv?max_results=10")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    assert "Allocation #" in content
    assert "Flight ID" in content
    assert "Assigned Gate ID" in content


def test_export_calculation_csv_sim001():
    """Verify mathematical calculation CSV export for SIM-001."""
    response = client.get("/api/v1/export/simulations/SIM-001/calculation/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    assert "# GateWise Mathematical Calculation Export" in content
    assert "Scenario ID,SIM-001" in content
    assert "Total Permutations (n!),720" in content
    assert "Valid Allocations (N),309" in content
    assert "Degree (k),Sign (-1)^k,Rook Coefficient (r_k)" in content
    assert "Running Partial Sum" in content


def test_export_scenario_pdf_sim001():
    """Verify binary PDF report generation for SIM-001."""
    response = client.get("/api/v1/export/simulations/SIM-001/report/pdf")
    assert response.status_code == 200
    assert "application/pdf" in response.headers["content-type"]
    assert "attachment;" in response.headers["Content-Disposition"]
    assert response.content.startswith(b"%PDF-")  # Valid PDF binary signature
    assert len(response.content) > 1000


def test_export_academic_report_html_sim001():
    """Verify printable academic HTML report for SIM-001."""
    response = client.get("/api/v1/export/simulations/SIM-001/report/html")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    html = response.text
    assert "GateWise — Airport Gate Allocation Mathematical Report" in html
    assert "SIM-001" in html
    assert "R(B, x) =" in html
    assert "Principle of Inclusion-Exclusion" in html


def test_export_comparison_csv_get_and_post():
    """Verify multi-scenario comparison CSV export via GET and POST."""
    # Test GET with query param
    get_res = client.get("/api/v1/export/comparison/csv?ids=SIM-001,SIM-002")
    assert get_res.status_code == 200
    assert "text/csv" in get_res.headers["content-type"]
    content = get_res.text
    assert "# GateWise Multi-Scenario Comparison Export" in content
    assert "SIM-001" in content
    assert "SIM-002" in content
    assert "Rook Polynomial R(B, x)" in content
    assert "COMBINATORIAL INSIGHTS" in content

    # Test POST with JSON body
    post_res = client.post("/api/v1/export/comparison/csv", json={"simulation_ids": ["SIM-001", "SIM-002"]})
    assert post_res.status_code == 200
    assert "text/csv" in post_res.headers["content-type"]


def test_export_comparison_pdf_get_and_post():
    """Verify multi-scenario comparison binary PDF export via GET and POST."""
    # Test GET
    get_res = client.get("/api/v1/export/comparison/pdf?ids=SIM-001,SIM-002")
    assert get_res.status_code == 200
    assert "application/pdf" in get_res.headers["content-type"]
    assert get_res.content.startswith(b"%PDF-")
    assert len(get_res.content) > 1000

    # Test POST
    post_res = client.post("/api/v1/export/comparison/pdf", json={"simulation_ids": ["SIM-001", "SIM-002"]})
    assert post_res.status_code == 200
    assert "application/pdf" in post_res.headers["content-type"]
    assert post_res.content.startswith(b"%PDF-")


def test_export_comparison_insufficient_ids():
    """Verify 422 error when fewer than 2 IDs are provided for comparison export."""
    res = client.get("/api/v1/export/comparison/csv?ids=SIM-001")
    assert res.status_code == 422


def test_export_matrix_csv_not_found():
    """Verify 404 for non-existent simulation export."""
    response = client.get("/api/v1/export/simulations/SIM-NONEXISTENT/matrix/csv")
    assert response.status_code == 404


def test_export_scenario_pdf_not_found():
    """Verify 404 for PDF export of non-existent simulation."""
    response = client.get("/api/v1/export/simulations/SIM-NONEXISTENT/report/pdf")
    assert response.status_code == 404
