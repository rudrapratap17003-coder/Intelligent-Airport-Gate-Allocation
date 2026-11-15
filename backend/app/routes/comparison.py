"""
GateWise API v1 — Scenario Comparison Router (Phase 23).
Provides multi-scenario mathematical and structural comparison, comparative metrics,
cell-by-cell matrix difference evaluation, and deterministic rule-based insights.
"""

import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.entities import Simulation, RestrictionMatrix
from app.schemas.api_schemas import (
    ScenarioComparisonRequest,
    ScenarioComparisonResponse,
    ScenarioComparisonItem,
    MatrixComparisonResult,
    ComparisonInsight
)
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.rook_polynomial_service import validate_restriction_matrix

router = APIRouter(prefix="/comparison", tags=["Scenario Comparison"])


@router.post(
    "",
    response_model=ScenarioComparisonResponse,
    summary="Compare two or more simulation scenarios mathematically and visually"
)
def compare_scenarios(
    payload: ScenarioComparisonRequest,
    db: Session = Depends(get_db)
):
    """Perform side-by-side comparative analysis across selected simulation scenarios."""
    # 1. Deduplicate while preserving order
    raw_ids = payload.simulation_ids
    unique_ids = list(dict.fromkeys(raw_ids))

    if len(unique_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least 2 distinct simulation scenarios must be selected for comparison."
        )

    # 2. Fetch and validate existence
    sims = db.query(Simulation).filter(Simulation.id.in_(unique_ids)).all()
    found_map = {s.id: s for s in sims}

    missing = [sid for sid in unique_ids if sid not in found_map]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation scenario(s) not found: {missing}"
        )

    # Maintain requested order
    ordered_sims = [found_map[sid] for sid in unique_ids]

    # 3. Analyze each scenario
    comparison_items: List[ScenarioComparisonItem] = []
    matrix_list = []
    dimensions_set = set()

    for sim in ordered_sims:
        f_count = len(sim.selected_flights)
        g_count = len(sim.selected_gates)
        matrix_rec = sim.restriction_matrix

        is_valid_config = False
        val_msg = ""
        matrix_size = None
        forbidden_cnt = 0
        allowed_cnt = 0
        density = 0.0
        tot_possible = 0
        exact_valid = 0
        invalid_assignments = 0
        feasibility_pct = 0.0
        is_feasible = False
        poly_str = None
        coeffs = []
        degree = 0
        pos_sum = 0
        neg_sum = 0
        matrix_data = None

        if f_count == 0 or g_count == 0:
            val_msg = "Incomplete: No flights or gates selected."
        elif f_count != g_count:
            val_msg = f"Unbalanced: {f_count} flights vs {g_count} gates (requires square n x n)."
        elif not matrix_rec:
            val_msg = "Incomplete: Restriction matrix not initialized."
        else:
            try:
                matrix_data = json.loads(matrix_rec.matrix_data)
                validate_restriction_matrix(matrix_data)
                n = len(matrix_data)
                if n != f_count:
                    val_msg = f"Dimension mismatch: matrix {n}x{n} != flights ({f_count})."
                else:
                    is_valid_config = True
                    matrix_size = n
                    val_msg = f"Valid balanced configuration ({n} × {n})."
                    dimensions_set.add(n)
                    matrix_list.append((sim.id, sim.name, matrix_data, n))

                    # Compute mathematical derivation via Inclusion-Exclusion Engine
                    pie_res = InclusionExclusionService.calculate(matrix_data)
                    forbidden_cnt = pie_res["forbidden_cell_count"]
                    allowed_cnt = (n * n) - forbidden_cnt
                    density = round((forbidden_cnt / (n * n) * 100.0), 2) if (n * n) > 0 else 0.0
                    tot_possible = pie_res["total_possible_assignments"]
                    exact_valid = pie_res["valid_assignments"]
                    invalid_assignments = pie_res["invalid_assignments"]
                    feasibility_pct = pie_res["feasibility_percentage"]
                    is_feasible = (exact_valid > 0)
                    poly_str = pie_res["polynomial"]
                    coeffs = pie_res["rook_coefficients"]
                    degree = max([idx for idx, c in enumerate(coeffs) if c > 0] or [0])

                    # Calculate positive and negative term sums
                    for term in pie_res["inclusion_exclusion_terms"]:
                        if term["sign"] > 0:
                            pos_sum += term["contribution"]
                        else:
                            neg_sum += abs(term["contribution"])
            except Exception as ex:
                val_msg = f"Invalid restriction matrix: {str(ex)}"

        comparison_items.append(
            ScenarioComparisonItem(
                id=sim.id,
                name=sim.name,
                flight_count=f_count,
                gate_count=g_count,
                matrix_size=matrix_size,
                is_valid_config=is_valid_config,
                validation_message=val_msg,
                forbidden_count=forbidden_cnt,
                allowed_count=allowed_cnt,
                restriction_density=density,
                total_possible_assignments=tot_possible,
                exact_valid_assignments=exact_valid,
                invalid_assignments=invalid_assignments,
                feasibility_percentage=feasibility_pct,
                is_feasible=is_feasible,
                rook_polynomial=poly_str,
                rook_coefficients=coeffs,
                polynomial_degree=degree,
                positive_sum=pos_sum,
                negative_sum=neg_sum,
                matrix=matrix_data
            )
        )

    # 4. Check Dimension Compatibility & Matrix Diff
    valid_items = [item for item in comparison_items if item.is_valid_config]
    are_dimensions_compatible = (len(dimensions_set) == 1 and len(valid_items) >= 2)

    matrix_comp_result: Optional[MatrixComparisonResult] = None
    if are_dimensions_compatible and len(matrix_list) >= 2:
        dim = matrix_list[0][3]
        m1 = matrix_list[0][2]
        m2 = matrix_list[1][2]
        diff_matrix = [[m1[r][c] - m2[r][c] for c in range(dim)] for r in range(dim)]
        identical_cells = sum(diff_matrix[r][c] == 0 for r in range(dim) for c in range(dim))
        different_cells = (dim * dim) - identical_cells

        if len(matrix_list) == 2:
            expl = f"Cell-by-cell matrix comparison between '{matrix_list[0][1]}' and '{matrix_list[1][1]}' ({dim} × {dim})."
        else:
            expl = f"Cell-by-cell matrix comparison between first two compatible scenarios: '{matrix_list[0][1]}' and '{matrix_list[1][1]}' ({dim} × {dim})."

        matrix_comp_result = MatrixComparisonResult(
            is_compatible=True,
            dimension=dim,
            identical_cells_count=identical_cells,
            different_cells_count=different_cells,
            difference_matrix=diff_matrix,
            explanation=expl
        )
    else:
        if len(dimensions_set) > 1:
            expl = f"Direct cell-by-cell matrix comparison is unavailable because scenarios have differing board dimensions ({', '.join(f'{d}×{d}' for d in sorted(dimensions_set))})."
        else:
            expl = "Direct cell-by-cell matrix comparison requires at least 2 balanced scenarios."
        matrix_comp_result = MatrixComparisonResult(
            is_compatible=False,
            dimension=None,
            identical_cells_count=0,
            different_cells_count=0,
            difference_matrix=None,
            explanation=expl
        )

    # 5. Deterministic Rule-Based Mathematical Insights
    insights: List[ComparisonInsight] = []

    if valid_items:
        # Feasibility Ranking
        sorted_by_feas = sorted(valid_items, key=lambda x: x.feasibility_percentage, reverse=True)
        best_feas = sorted_by_feas[0]
        worst_feas = sorted_by_feas[-1]

        if best_feas.id != worst_feas.id:
            diff_pct = round(best_feas.feasibility_percentage - worst_feas.feasibility_percentage, 1)
            insights.append(
                ComparisonInsight(
                    type="FEASIBILITY",
                    severity="success",
                    title="Feasibility Disparity",
                    message=(
                        f"Scenario '{best_feas.name}' offers the highest feasibility at {best_feas.feasibility_percentage.toFixed(1) if hasattr(best_feas.feasibility_percentage, 'toFixed') else best_feas.feasibility_percentage:.1f}%, "
                        f"exceeding '{worst_feas.name}' ({worst_feas.feasibility_percentage:.1f}%) by {diff_pct}%."
                    )
                )
            )

        # Infeasible Check
        infeasible_scenarios = [s for s in valid_items if not s.is_feasible]
        if infeasible_scenarios:
            names = ", ".join(f"'{s.name}'" for s in infeasible_scenarios)
            insights.append(
                ComparisonInsight(
                    type="FEASIBILITY",
                    severity="warning",
                    title="Zero Valid Allocations (Bottleneck)",
                    message=(
                        f"Scenario(s) {names} have 0 valid conflict-free assignments (N = 0). "
                        "The restriction constraints eliminate all bijective permutations."
                    )
                )
            )

        # Restriction Density Comparison
        sorted_by_density = sorted(valid_items, key=lambda x: x.restriction_density, reverse=True)
        max_dense = sorted_by_density[0]
        min_dense = sorted_by_density[-1]
        if max_dense.id != min_dense.id:
            insights.append(
                ComparisonInsight(
                    type="DENSITY",
                    severity="info",
                    title="Restriction Density Spectrum",
                    message=(
                        f"Scenario '{max_dense.name}' has the most restricted board ({max_dense.forbidden_count} forbidden cells, {max_dense.restriction_density}% density), "
                        f"whereas '{min_dense.name}' has the fewest restrictions ({min_dense.forbidden_count} forbidden cells, {min_dense.restriction_density}% density)."
                    )
                )
            )

        # Identical Structure Check
        if matrix_comp_result and matrix_comp_result.is_compatible and matrix_comp_result.different_cells_count == 0:
            insights.append(
                ComparisonInsight(
                    type="STRUCTURE",
                    severity="info",
                    title="Identical Restriction Structure",
                    message="Scenarios have identical restriction matrices, yielding identical Rook polynomials and PIE totals."
                )
            )

        # Rook Degree Capacity
        max_deg_scenario = max(valid_items, key=lambda x: x.polynomial_degree)
        insights.append(
            ComparisonInsight(
                type="POLYNOMIAL",
                severity="info",
                title="Rook Polynomial Degree",
                message=(
                    f"Scenario '{max_deg_scenario.name}' reaches Rook polynomial degree {max_deg_scenario.polynomial_degree}, "
                    f"meaning up to {max_deg_scenario.polynomial_degree} simultaneous non-attacking conflict placements are possible."
                )
            )
        )

    return ScenarioComparisonResponse(
        scenarios=comparison_items,
        are_dimensions_compatible=are_dimensions_compatible,
        matrix_comparison=matrix_comp_result,
        insights=insights
    )
