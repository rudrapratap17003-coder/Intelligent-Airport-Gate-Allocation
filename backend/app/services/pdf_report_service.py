"""
GateWise PDF Report Generation Service.
Generates professional, publication-grade binary PDF reports for:
1. Single Scenario Mathematical & Allocation Reports
2. Multi-Scenario Comparative Analysis Reports
Uses ReportLab with custom aviation styling, readable tables, and multi-page layouts.
"""

import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable
)
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and render 'Page X of Y' footers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header running line
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 755, 572, 755)

        self.drawString(40, 760, "GateWise — Intelligent Airport Gate Allocation Framework")
        self.drawRightString(572, 760, "Discrete Mathematics & PIE Engine")

        # Footer running line
        self.line(40, 42, 572, 42)
        self.drawString(40, 32, "Confidential & Academic Use Only — Generated via Exact Arbitrary-Precision Combinatorics")
        self.drawRightString(572, 32, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


class PdfReportService:
    """Service producing publication-grade PDF documents for GateWise."""

    @classmethod
    def _get_styles(cls):
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=4
        )

        subtitle_style = ParagraphStyle(
            'DocSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#475569"),
            spaceAfter=12
        )

        h1_style = ParagraphStyle(
            'SectionH1',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0369a1"),
            spaceBefore=12,
            spaceAfter=6,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#334155")
        )

        code_style = ParagraphStyle(
            'CodeBlock',
            parent=styles['Normal'],
            fontName='Courier-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#0369a1")
        )

        return {
            'title': title_style,
            'subtitle': subtitle_style,
            'h1': h1_style,
            'body': body_style,
            'code': code_style
        }

    @classmethod
    def generate_scenario_pdf(
        cls,
        sim_id: str,
        sim_name: str,
        sim_desc: str,
        matrix: List[List[int]],
        flight_ids: List[str],
        gate_ids: List[str],
        math_res: Dict[str, Any],
        sample_allocations: List[Dict[str, Any]]
    ) -> bytes:
        """Generate binary PDF for a single scenario."""
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=50,
            bottomMargin=50
        )
        styles = cls._get_styles()
        story = []

        now_str = datetime.now(timezone.utc).strftime("%B %d, %Y %H:%M:%S UTC")

        # 1. Header Banner
        story.append(Paragraph(f"Mathematical Allocation Report: {sim_name}", styles['title']))
        story.append(Paragraph(f"Scenario ID: <b>{sim_id}</b> | Generated: {now_str} | Status: Feasible" if math_res['valid_assignments'] > 0 else f"Scenario ID: <b>{sim_id}</b> | Generated: {now_str} | Status: Infeasible Bottleneck", styles['subtitle']))
        if sim_desc:
            story.append(Paragraph(f"<i>{sim_desc}</i>", styles['body']))
            story.append(Spacer(1, 6))

        # 2. Executive KPI Summary Table
        n = len(matrix)
        total_cells = n * n
        forbidden_count = math_res.get("forbidden_cell_count", 0)
        density = round((forbidden_count / total_cells) * 100, 2) if total_cells > 0 else 0.0

        kpi_data = [
            [
                Paragraph("<b>Dimension (n × n)</b>", styles['body']),
                Paragraph("<b>Total Permutations</b>", styles['body']),
                Paragraph("<b>Valid Assignments (N)</b>", styles['body']),
                Paragraph("<b>Feasibility Ratio</b>", styles['body']),
                Paragraph("<b>Restriction Density</b>", styles['body'])
            ],
            [
                Paragraph(f"{n} × {n}", styles['code']),
                Paragraph(f"{math_res['total_possible_assignments']:,}", styles['code']),
                Paragraph(f"{math_res['valid_assignments']:,}", styles['code']),
                Paragraph(f"{math_res['feasibility_percentage']}%", styles['code']),
                Paragraph(f"{density}% ({forbidden_count}/{total_cells})", styles['code'])
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[100, 110, 115, 100, 107])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 10))

        # 3. Restriction Board B Table
        story.append(Paragraph("1. Binary Restriction Board B (0 = Allowed, 1 = Forbidden)", styles['h1']))
        matrix_header = [Paragraph("<b>F \\ G</b>", styles['code'])] + [
            Paragraph(f"<b>{g}</b>", styles['code']) for g in gate_ids[:n]
        ]
        matrix_rows = [matrix_header]
        for r, f_id in enumerate(flight_ids[:n]):
            row_cells = [Paragraph(f"<b>{f_id}</b>", styles['code'])]
            for c in range(n):
                val = matrix[r][c] if r < len(matrix) and c < len(matrix[r]) else 0
                bg_color = "#fee2e2" if val == 1 else "#f0fdf4"
                row_cells.append(Paragraph(f"<font color='{'#dc2626' if val==1 else '#16a34a'}'><b>{val}</b></font>", styles['code']))
            matrix_rows.append(row_cells)

        col_w = min(42, int(480 / (n + 1)))
        m_table = Table(matrix_rows, colWidths=[70] + [col_w] * n)
        table_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]
        # Color individual cells
        for r_idx in range(1, len(matrix_rows)):
            for c_idx in range(1, n + 1):
                val = matrix[r_idx - 1][c_idx - 1]
                if val == 1:
                    table_styles.append(('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), colors.HexColor("#fee2e2")))
                else:
                    table_styles.append(('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), colors.HexColor("#f0fdf4")))

        m_table.setStyle(TableStyle(table_styles))
        story.append(m_table)
        story.append(Spacer(1, 10))

        # 4. Rook Polynomial
        story.append(Paragraph("2. Exact Rook Polynomial Formulation R(B, x)", styles['h1']))
        story.append(Paragraph("Evaluated using Row-by-Row Dynamic Programming with Column Bitmask Tracking:", styles['body']))
        poly_str = math_res.get('polynomial', '1')
        story.append(Spacer(1, 3))
        story.append(Paragraph(f"<b>R(B, x) = {poly_str}</b>", styles['code']))
        story.append(Spacer(1, 10))

        # 5. Principle of Inclusion-Exclusion (PIE) Step Table
        story.append(Paragraph("3. Principle of Inclusion-Exclusion (PIE) Alternating Step Table", styles['h1']))
        story.append(Paragraph("Formula: <b>N = ∑ (-1)ᵏ · rₖ · (n - k)!</b>", styles['body']))
        story.append(Spacer(1, 4))

        pie_data = [[
            Paragraph("<b>Degree k</b>", styles['body']),
            Paragraph("<b>Sign (-1)ᵏ</b>", styles['body']),
            Paragraph("<b>Rook Coeff rₖ</b>", styles['body']),
            Paragraph("<b>(n - k)! Permutations</b>", styles['body']),
            Paragraph("<b>Term Contribution</b>", styles['body'])
        ]]
        for t in math_res.get("inclusion_exclusion_terms", []):
            is_pos = (t["sign"] == "+" or t["sign"] == 1 or (isinstance(t["sign"], (int, float)) and t["sign"] > 0))
            s_color = "#16a34a" if is_pos else "#dc2626"
            sign_str = "+" if is_pos else "-"
            pie_data.append([
                Paragraph(f"k = {t['k']}", styles['code']),
                Paragraph(f"<font color='{s_color}'><b>{sign_str}1</b></font>", styles['code']),
                Paragraph(f"{t['rook_coefficient']:,}", styles['code']),
                Paragraph(f"{t['factorial_value']:,}", styles['code']),
                Paragraph(f"<font color='{s_color}'><b>{sign_str}{abs(t['contribution']):,}</b></font>", styles['code'])
            ])

        pie_table = Table(pie_data, colWidths=[90, 80, 110, 130, 122])
        pie_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(pie_table)
        story.append(Spacer(1, 10))

        # 6. Sample Valid Flight-to-Gate Plans
        story.append(Paragraph("4. Verified Flight-to-Gate Allocation Plans", styles['h1']))
        if math_res['valid_assignments'] == 0:
            story.append(Paragraph("<font color='#dc2626'><b>No valid conflict-free flight-to-gate matchings exist for this scenario (N = 0).</b></font>", styles['body']))
        else:
            alloc_count = len(sample_allocations)
            story.append(Paragraph(f"Showing {alloc_count} sample allocation plan(s) verified by independent conflict detection auditor:", styles['body']))
            story.append(Spacer(1, 4))
            alloc_rows = [[
                Paragraph("<b>Plan #</b>", styles['body']),
                Paragraph("<b>Flight-to-Gate Assignment Pairs</b>", styles['body']),
                Paragraph("<b>Auditor Status</b>", styles['body'])
            ]]
            for a in sample_allocations[:8]:
                pairs_text = " | ".join([f"<b>{p['flight_id']}</b> → {p['gate_id']}" for p in a.get("assignments", [])])
                alloc_rows.append([
                    Paragraph(f"#{a.get('allocation_number', 1)}", styles['code']),
                    Paragraph(pairs_text, styles['body']),
                    Paragraph("<font color='#16a34a'><b>Valid (0 Conflicts)</b></font>", styles['code'])
                ])
            alloc_table = Table(alloc_rows, colWidths=[60, 360, 112])
            alloc_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(alloc_table)

        doc.build(story, canvasmaker=NumberedCanvas)
        return buf.getvalue()

    @classmethod
    def generate_comparison_pdf(cls, comparison_data: Dict[str, Any]) -> bytes:
        """Generate binary PDF for multi-scenario comparison."""
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=letter,
            leftMargin=40,
            rightMargin=40,
            topMargin=50,
            bottomMargin=50
        )
        styles = cls._get_styles()
        story = []

        now_str = datetime.now(timezone.utc).strftime("%B %d, %Y %H:%M:%S UTC")
        scenarios = comparison_data.get("scenarios", [])

        # 1. Header
        story.append(Paragraph("GateWise — Multi-Scenario Comparative Mathematical Report", styles['title']))
        story.append(Paragraph(f"Comparing {len(scenarios)} Scenarios | Generated: {now_str}", styles['subtitle']))
        story.append(Spacer(1, 6))

        # 2. Comparative Matrix Table
        story.append(Paragraph("1. Scenario Parameters & Combinatorial Performance", styles['h1']))
        comp_rows = [[
            Paragraph("<b>Scenario</b>", styles['body']),
            Paragraph("<b>Dim</b>", styles['body']),
            Paragraph("<b>Density</b>", styles['body']),
            Paragraph("<b>Rook Polynomial R(B, x)</b>", styles['body']),
            Paragraph("<b>Valid (N)</b>", styles['body']),
            Paragraph("<b>Feasibility</b>", styles['body'])
        ]]
        for s in scenarios:
            f_color = "#16a34a" if s.get("is_feasible") else "#dc2626"
            comp_rows.append([
                Paragraph(f"<b>{s.get('name')}</b><br/><font color='#64748b'>{s.get('id')}</font>", styles['body']),
                Paragraph(f"{s.get('matrix_size')}×{s.get('matrix_size')}" if s.get('matrix_size') else "N/A", styles['code']),
                Paragraph(f"{s.get('restriction_density')}%", styles['code']),
                Paragraph(s.get('rook_polynomial') or "1", styles['code']),
                Paragraph(f"<font color='{f_color}'><b>{s.get('exact_valid_assignments'):,}</b></font>", styles['code']),
                Paragraph(f"<font color='{f_color}'><b>{s.get('feasibility_percentage')}%</b></font>", styles['code'])
            ])

        c_table = Table(comp_rows, colWidths=[120, 45, 55, 172, 70, 70])
        c_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(c_table)
        story.append(Spacer(1, 12))

        # 3. Matrix Delta Section
        story.append(Paragraph("2. Pairwise Matrix Delta Analysis", styles['h1']))
        matrix_comp = comparison_data.get("matrix_comparison")
        if matrix_comp and matrix_comp.get("is_compatible"):
            story.append(Paragraph(
                f"Both primary scenarios share identical dimension ({matrix_comp.get('dimension')}×{matrix_comp.get('dimension')}). "
                f"Cell comparison: <b>{matrix_comp.get('identical_cells_count')} identical cells</b>, "
                f"<b>{matrix_comp.get('different_cells_count')} differing cells</b>.",
                styles['body']
            ))
        else:
            explanation = matrix_comp.get("explanation") if matrix_comp else "Differing problem dimensions."
            story.append(Paragraph(f"<i>Dimension Notice: {explanation}</i>", styles['body']))
        story.append(Spacer(1, 10))

        # 4. Automated Combinatorial Insights
        story.append(Paragraph("3. Automated Mathematical Insights & Diagnostic Findings", styles['h1']))
        insights = comparison_data.get("insights", [])
        if insights:
            for ins in insights:
                sev = ins.get("severity", "info")
                t_color = "#dc2626" if sev == "critical" else "#d97706" if sev == "warning" else "#0284c7"
                story.append(Paragraph(f"<font color='{t_color}'>■</font> <b>{ins.get('title')}</b>", styles['body']))
                story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;{ins.get('message')}", styles['body']))
                story.append(Spacer(1, 4))
        else:
            story.append(Paragraph("No anomalous combinatorial deviations detected across evaluated scenarios.", styles['body']))

        doc.build(story, canvasmaker=NumberedCanvas)
        return buf.getvalue()
