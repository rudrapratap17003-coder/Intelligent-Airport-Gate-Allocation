"""
GateWise API v1 — Export Router.
Comprehensive CSV and PDF Report export services for flights, gates,
restriction matrices, mathematical calculations, generated allocation plans,
and multi-scenario comparisons.
"""

import io
import csv
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from fastapi.responses import StreamingResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import Simulation, Flight, Gate, RestrictionMatrix
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.allocation_generator_service import AllocationGeneratorService
from app.services.pdf_report_service import PdfReportService
from app.routes.comparison import compare_scenarios
from app.schemas.api_schemas import ScenarioComparisonRequest

router = APIRouter(prefix="/export", tags=["Export System"])


# =============================================================================
# 1. ENTITY CSV EXPORTS (FLIGHTS & GATES)
# =============================================================================

@router.get("/flights/csv", summary="Export all registered flights as CSV")
def export_flights_csv(db: Session = Depends(get_db)):
    """Export the master flight registry as a downloadable CSV."""
    flights = db.query(Flight).order_by(Flight.flight_number.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Flight ID",
        "Flight Number",
        "Airline",
        "Aircraft Type",
        "Terminal",
        "Arrival Time",
        "Departure Time",
        "Passenger Capacity",
        "Status",
        "Origin",
        "Destination",
        "Flight Type",
        "Aircraft Category",
        "Turnaround (min)",
        "Data Classification"
    ])

    for f in flights:
        writer.writerow([
            f.id,
            f.flight_number,
            f.airline,
            f.aircraft_type,
            f.terminal,
            f.arrival_time,
            f.departure_time,
            f.passenger_capacity,
            f.status,
            getattr(f, "origin", "DEL") or "DEL",
            getattr(f, "destination", "BLR") or "BLR",
            getattr(f, "flight_type", "Domestic") or "Domestic",
            getattr(f, "aircraft_category", "Code C") or "Code C",
            getattr(f, "turnaround_duration", 45) or 45,
            getattr(f, "data_tier", "SIMULATED_OPERATIONAL_DATA")
        ])

    output.seek(0)
    filename = f"gatewise_flights_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/gates/csv", summary="Export all registered gates as CSV")
def export_gates_csv(db: Session = Depends(get_db)):
    """Export the master gate registry as a downloadable CSV."""
    gates = db.query(Gate).order_by(Gate.gate_number.asc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Gate ID",
        "Gate Number",
        "Terminal",
        "Gate Type",
        "Supported Aircraft",
        "Max Capacity",
        "Status",
        "Stand Type",
        "Jetway",
        "Aircraft Category",
        "Max Wingspan (m)",
        "Data Classification"
    ])

    for g in gates:
        writer.writerow([
            g.id,
            g.gate_number,
            g.terminal,
            g.gate_type,
            g.supported_aircraft,
            g.max_capacity,
            g.status,
            getattr(g, "stand_type", "Contact Aerobridge") or "Contact Aerobridge",
            "Yes" if getattr(g, "has_jetway", 1) else "No",
            getattr(g, "aircraft_category", "Code C") or "Code C",
            getattr(g, "max_wingspan_m", 36.0) or 36.0,
            getattr(g, "data_tier", "CONFIGURABLE_DEMONSTRATION_DATA")
        ])

    output.seek(0)
    filename = f"gatewise_gates_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =============================================================================
# 2. SCENARIO MATRIX & ALLOCATIONS CSV EXPORTS
# =============================================================================

@router.get("/simulations/{sim_id}/matrix/csv", summary="Export scenario restriction matrix as CSV")
def export_restriction_matrix_csv(sim_id: str, db: Session = Depends(get_db)):
    """Export the binary restriction matrix with flight and gate identifiers as CSV."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Simulation {sim_id} not found.")

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restriction matrix not found.")

    matrix = json.loads(matrix_record.matrix_data)
    flight_ids = [sf.flight_id for sf in sim.selected_flights]
    gate_ids = [sg.gate_id for sg in sim.selected_gates]

    output = io.StringIO()
    writer = csv.writer(output)

    # Header row with Gate IDs
    writer.writerow(["Flight \\ Gate"] + gate_ids)

    for r, f_id in enumerate(flight_ids):
        row_vals = matrix[r] if r < len(matrix) else [0] * len(gate_ids)
        writer.writerow([f_id] + row_vals)

    output.seek(0)
    filename = f"gatewise_matrix_{sim_id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/simulations/{sim_id}/allocations/csv", summary="Export generated allocations as CSV")
def export_allocations_csv(
    sim_id: str,
    max_results: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """Generate and export valid flight-to-gate allocations as a downloadable CSV."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Simulation {sim_id} not found.")

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restriction matrix not found.")

    matrix = json.loads(matrix_record.matrix_data)
    flight_ids = [sf.flight_id for sf in sim.selected_flights]
    gate_ids = [sg.gate_id for sg in sim.selected_gates]

    gen_res = AllocationGeneratorService.generate(
        matrix=matrix,
        flight_ids=flight_ids,
        gate_ids=gate_ids,
        max_results=max_results
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Allocation #",
        "Flight ID",
        "Assigned Gate ID",
        "Scenario ID",
        "Scenario Name"
    ])

    for alloc in gen_res["allocations"]:
        a_num = alloc["allocation_number"]
        for pair in alloc["assignments"]:
            writer.writerow([
                a_num,
                pair["flight_id"],
                pair["gate_id"],
                sim.id,
                sim.name
            ])

    output.seek(0)
    filename = f"gatewise_allocations_{sim_id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =============================================================================
# 3. MATHEMATICAL CALCULATION CSV EXPORT
# =============================================================================

@router.get("/simulations/{sim_id}/calculation/csv", summary="Export mathematical calculation steps as CSV")
def export_calculation_csv(sim_id: str, db: Session = Depends(get_db)):
    """Export exact Rook Polynomial and Principle of Inclusion-Exclusion steps as CSV."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Simulation {sim_id} not found.")

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restriction matrix not found.")

    matrix = json.loads(matrix_record.matrix_data)
    math_res = InclusionExclusionService.calculate(matrix)

    n = len(matrix)
    total_cells = n * n
    forbidden_count = math_res["forbidden_cell_count"]
    density = round((forbidden_count / total_cells) * 100, 2) if total_cells > 0 else 0.0

    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["# GateWise Mathematical Calculation Export"])
    writer.writerow(["Scenario ID", sim.id])
    writer.writerow(["Scenario Name", sim.name])
    writer.writerow(["Matrix Dimension", f"{n}x{n}"])
    writer.writerow(["Total Permutations (n!)", math_res["total_possible_assignments"]])
    writer.writerow(["Valid Allocations (N)", math_res["valid_assignments"]])
    writer.writerow(["Invalid Allocations Suppressed", math_res["invalid_assignments"]])
    writer.writerow(["Feasibility Percentage", f"{math_res['feasibility_percentage']}%"])
    writer.writerow(["Forbidden Cells Count", forbidden_count])
    writer.writerow(["Restriction Density", f"{density}%"])
    writer.writerow(["Rook Polynomial Expression", math_res["polynomial"]])
    writer.writerow([])

    # PIE Table Section
    writer.writerow([
        "Degree (k)",
        "Sign (-1)^k",
        "Rook Coefficient (r_k)",
        "Remaining Permutations (n-k)!",
        "Term Contribution",
        "Running Partial Sum",
        "Pedagogical Meaning"
    ])

    running_sum = 0
    for term in math_res["inclusion_exclusion_terms"]:
        contrib = term["contribution"]
        running_sum += contrib
        k = term["k"]
        if k == 0:
            meaning = "Unrestricted universe baseline: n! permutations"
        elif k == 1:
            meaning = f"Subtract single-restriction violations ({term['rook_coefficient']} cells * (n-1)!)"
        elif k % 2 == 0:
            meaning = f"Add back double-counted {k}-restriction violations"
        else:
            meaning = f"Subtract triple-counted {k}-restriction violations"

        sign_str = "+1" if (term["sign"] == "+" or term["sign"] == 1 or term["sign"] > 0) else "-1"

        writer.writerow([
            term["k"],
            sign_str,
            term["rook_coefficient"],
            term["factorial_value"],
            term["contribution"],
            running_sum,
            meaning
        ])

    output.seek(0)
    filename = f"gatewise_math_calculation_{sim_id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =============================================================================
# 4. SCENARIO PDF REPORT EXPORT
# =============================================================================

@router.get("/simulations/{sim_id}/report/pdf", summary="Generate Publication-Grade Scenario PDF Report")
def export_scenario_pdf(sim_id: str, db: Session = Depends(get_db)):
    """Generate and download a binary PDF report for a single simulation scenario."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Simulation {sim_id} not found.")

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restriction matrix not found.")

    matrix = json.loads(matrix_record.matrix_data)
    flight_ids = [sf.flight_id for sf in sim.selected_flights]
    gate_ids = [sg.gate_id for sg in sim.selected_gates]

    math_res = InclusionExclusionService.calculate(matrix)
    gen_res = AllocationGeneratorService.generate(
        matrix=matrix,
        flight_ids=flight_ids,
        gate_ids=gate_ids,
        max_results=10
    )

    pdf_bytes = PdfReportService.generate_scenario_pdf(
        sim_id=sim.id,
        sim_name=sim.name,
        sim_desc=sim.description or "",
        matrix=matrix,
        flight_ids=flight_ids,
        gate_ids=gate_ids,
        math_res=math_res,
        sample_allocations=gen_res["allocations"]
    )

    filename = f"gatewise_report_{sim_id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/simulations/{sim_id}/report/html", response_class=HTMLResponse, summary="Generate Printable Academic Report HTML")
def export_academic_report_html(sim_id: str, db: Session = Depends(get_db)):
    """Generate a printable academic HTML report for the simulation scenario."""
    sim = db.query(Simulation).filter(Simulation.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Simulation {sim_id} not found.")

    matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == sim_id).first()
    if not matrix_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restriction matrix not found.")

    matrix = json.loads(matrix_record.matrix_data)
    flight_ids = [sf.flight_id for sf in sim.selected_flights]
    gate_ids = [sg.gate_id for sg in sim.selected_gates]

    math_res = InclusionExclusionService.calculate(matrix)
    gen_res = AllocationGeneratorService.generate(
        matrix=matrix,
        flight_ids=flight_ids,
        gate_ids=gate_ids,
        max_results=10
    )

    n = len(matrix)
    total_cells = n * n
    forbidden_count = math_res["forbidden_cell_count"]
    density = round((forbidden_count / total_cells) * 100, 2) if total_cells > 0 else 0.0

    pie_rows_html = ""
    for term in math_res["inclusion_exclusion_terms"]:
        is_pos = (term["sign"] == "+" or term["sign"] == 1 or (isinstance(term["sign"], (int, float)) and term["sign"] > 0))
        sign_color = "#10b981" if is_pos else "#ef4444"
        sign_str = "+" if is_pos else "-"
        pie_rows_html += f"""
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">k = {term['k']}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: {sign_color}; font-weight: bold; font-family: monospace;">{sign_str}1</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">{term['rook_coefficient']:,}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace;">{term['factorial_value']:,}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: {sign_color}; font-family: monospace;">{sign_str}{abs(term['contribution']):,}</td>
        </tr>
        """

    matrix_headers = "".join([f"<th style='padding: 6px; font-family: monospace; font-size: 11px;'>{g}</th>" for g in gate_ids])
    matrix_rows_html = ""
    for r, f_id in enumerate(flight_ids):
        cells_html = ""
        for c in range(n):
            val = matrix[r][c]
            bg = "#fee2e2" if val == 1 else "#f0fdf4"
            fg = "#991b1b" if val == 1 else "#166534"
            cells_html += f"<td style='padding: 6px; text-align: center; background: {bg}; color: {fg}; font-weight: bold; font-family: monospace; border: 1px solid #cbd5e1;'>{val}</td>"
        matrix_rows_html += f"<tr><td style='padding: 6px; font-family: monospace; font-weight: bold; font-size: 11px;'>{f_id}</td>{cells_html}</tr>"

    allocations_html = ""
    for alloc in gen_res["allocations"]:
        pairs_str = ", ".join([f"<strong>{p['flight_id']}</strong> → {p['gate_id']}" for p in alloc["assignments"]])
        allocations_html += f"<li style='margin-bottom: 6px; font-family: monospace; font-size: 12px;'>Plan #{alloc['allocation_number']}: {pairs_str}</li>"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>GateWise Academic Report — {sim.name}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 40px auto;
            max-width: 850px;
            line-height: 1.5;
        }}
        h1, h2, h3 {{ color: #0f172a; margin-top: 24px; }}
        .header {{ border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 24px; }}
        .meta-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }}
        .meta-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }}
        .meta-card .label {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-family: monospace; }}
        .meta-card .val {{ font-size: 18px; font-weight: bold; color: #0f172a; font-family: monospace; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 12px; }}
        th {{ background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 12px; color: #475569; }}
        .formula-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace; }}
        @media print {{
            body {{ margin: 0; max-width: 100%; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
            Print / Save as PDF
        </button>
    </div>

    <div class="header">
        <h1 style="margin: 0; font-size: 24px;">GateWise — Airport Gate Allocation Mathematical Report</h1>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">
            Scenario ID: <strong>{sim.id}</strong> | Name: <strong>{sim.name}</strong> | Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y %H:%M:%S UTC')}
        </p>
    </div>

    <div class="meta-grid">
        <div class="meta-card">
            <div class="label">Dimension (n × n)</div>
            <div class="val">{n} × {n}</div>
        </div>
        <div class="meta-card">
            <div class="label">Total Permutations</div>
            <div class="val">{math_res['total_possible_assignments']:,}</div>
        </div>
        <div class="meta-card">
            <div class="label">Exact Valid (N)</div>
            <div class="val" style="color: #16a34a;">{math_res['valid_assignments']:,}</div>
        </div>
        <div class="meta-card">
            <div class="label">Feasibility Rate</div>
            <div class="val" style="color: #0284c7;">{math_res['feasibility_percentage']}%</div>
        </div>
    </div>

    <h2>1. Binary Restriction Board B</h2>
    <p style="font-size: 13px; color: #475569;">
        Matrix B contains {forbidden_count} forbidden assignments out of {total_cells} total cells (density = {density}%).
        Values: <strong>0 = Allowed</strong>, <strong>1 = Forbidden</strong>.
    </p>
    <table>
        <thead>
            <tr>
                <th style="padding: 6px;">Flight \\ Gate</th>
                {matrix_headers}
            </tr>
        </thead>
        <tbody>
            {matrix_rows_html}
        </tbody>
    </table>

    <h2>2. Exact Rook Polynomial Formulation</h2>
    <p style="font-size: 13px; color: #475569;">
        Evaluated using Row-by-Row Dynamic Programming with column bitmask memoization.
    </p>
    <div class="formula-box">
        <strong>R(B, x) = {math_res['polynomial']}</strong>
    </div>

    <h2>3. Principle of Inclusion-Exclusion (PIE) Step Table</h2>
    <p style="font-size: 13px; color: #475569;">
        Formula: <strong>N = ∑ (-1)ᵏ · rₖ · (n - k)!</strong>
    </p>
    <table>
        <thead>
            <tr>
                <th>Degree k</th>
                <th style="text-align: center;">Sign (-1)ᵏ</th>
                <th style="text-align: right;">Rook Coeff rₖ</th>
                <th style="text-align: right;">Permutations (n - k)!</th>
                <th style="text-align: right;">Term Contribution</th>
            </tr>
        </thead>
        <tbody>
            {pie_rows_html}
        </tbody>
    </table>

    <div class="formula-box" style="margin-top: 16px; background: #f8fafc; border-color: #cbd5e1;">
        <strong>Total Feasible Conflict-Free Permutations: N = {math_res['valid_assignments']:,}</strong>
    </div>

    <h2>4. Sample Conflict-Free Allocation Plans</h2>
    <p style="font-size: 13px; color: #475569;">
        Generated using depth-first backtracking with independent constraint auditor verification:
    </p>
    <ul>
        {allocations_html or "<li>No valid assignments exist (infeasible board).</li>"}
    </ul>

    <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
        GateWise Intelligent Airport Gate Allocation Framework — Discrete Mathematics & Combinatorial Optimization Engine
    </div>
</body>
</html>
    """
    return HTMLResponse(content=html_content)


# =============================================================================
# 5. SCENARIO COMPARISON EXPORTS (CSV & PDF)
# =============================================================================

def _parse_comparison_ids(ids_query: Optional[str], ids_body: Optional[List[str]]) -> List[str]:
    """Extract and validate scenario IDs from either query string or body."""
    raw_ids = []
    if ids_body:
        raw_ids.extend(ids_body)
    elif ids_query:
        raw_ids.extend([s.strip() for s in ids_query.split(",") if s.strip()])

    unique_ids = list(dict.fromkeys(raw_ids))
    if len(unique_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least 2 distinct simulation scenario IDs are required for comparison export."
        )
    return unique_ids


@router.get("/comparison/csv", summary="Export multi-scenario comparison as CSV (GET)")
@router.post("/comparison/csv", summary="Export multi-scenario comparison as CSV (POST)")
def export_comparison_csv(
    ids: Optional[str] = Query(default=None, description="Comma-separated simulation IDs"),
    payload: Optional[ScenarioComparisonRequest] = Body(default=None),
    db: Session = Depends(get_db)
):
    """Export side-by-side scenario comparison metrics, difference matrices, and insights as CSV."""
    unique_ids = _parse_comparison_ids(ids, payload.simulation_ids if payload else None)

    # Invoke authoritative comparison service
    comp_res = compare_scenarios(ScenarioComparisonRequest(simulation_ids=unique_ids), db=db)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow(["# GateWise Multi-Scenario Comparison Export"])
    writer.writerow(["Export Timestamp", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")])
    writer.writerow(["Scenarios Count", len(comp_res.scenarios)])
    writer.writerow([])

    # Section 1: Scenario Overview Metrics
    writer.writerow(["# SECTION 1: SCENARIO COMBINATORIAL COMPARISON"])
    writer.writerow([
        "Scenario ID",
        "Scenario Name",
        "Flights",
        "Gates",
        "Dimension",
        "Forbidden Cells",
        "Restriction Density (%)",
        "Rook Degree",
        "Rook Polynomial R(B, x)",
        "Total Permutations (n!)",
        "Valid Assignments (N)",
        "Feasibility (%)",
        "Is Feasible"
    ])

    for s in comp_res.scenarios:
        writer.writerow([
            s.id,
            s.name,
            s.flight_count,
            s.gate_count,
            f"{s.matrix_size}x{s.matrix_size}" if s.matrix_size else "N/A",
            s.forbidden_count,
            s.restriction_density,
            s.polynomial_degree,
            s.rook_polynomial or "1",
            s.total_possible_assignments,
            s.exact_valid_assignments,
            s.feasibility_percentage,
            s.is_feasible
        ])

    writer.writerow([])

    # Section 2: Dimension & Structure Compatibility
    writer.writerow(["# SECTION 2: DIMENSION & STRUCTURE COMPATIBILITY"])
    writer.writerow(["Are Dimensions Compatible", comp_res.are_dimensions_compatible])
    if comp_res.matrix_comparison:
        mc = comp_res.matrix_comparison
        writer.writerow(["Identical Cells", mc.identical_cells_count])
        writer.writerow(["Different Cells", mc.different_cells_count])
        writer.writerow(["Structural Summary", mc.explanation])
    writer.writerow([])

    # Section 3: Automated Combinatorial Insights
    writer.writerow(["# SECTION 3: AUTOMATED COMBINATORIAL INSIGHTS"])
    writer.writerow(["Category", "Severity", "Finding Title", "Diagnostic Message"])
    for ins in comp_res.insights:
        writer.writerow([
            ins.type,
            ins.severity,
            ins.title,
            ins.message
        ])

    output.seek(0)
    filename = f"gatewise_comparison_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/comparison/pdf", summary="Export multi-scenario comparison as PDF (GET)")
@router.post("/comparison/pdf", summary="Export multi-scenario comparison as PDF (POST)")
def export_comparison_pdf(
    ids: Optional[str] = Query(default=None, description="Comma-separated simulation IDs"),
    payload: Optional[ScenarioComparisonRequest] = Body(default=None),
    db: Session = Depends(get_db)
):
    """Generate and download a binary PDF comparative analysis report across selected scenarios."""
    unique_ids = _parse_comparison_ids(ids, payload.simulation_ids if payload else None)

    # Invoke authoritative comparison service
    comp_res = compare_scenarios(ScenarioComparisonRequest(simulation_ids=unique_ids), db=db)

    pdf_bytes = PdfReportService.generate_comparison_pdf(comp_res.model_dump())

    filename = f"gatewise_comparison_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
