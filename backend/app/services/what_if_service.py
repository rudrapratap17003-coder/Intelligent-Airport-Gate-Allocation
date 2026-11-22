"""
GateWise — What-If Scenario Analysis Engine.
Simulates hypothetical operational changes (e.g. gate closures, maintenance, additional restrictions)
in complete isolation without mutating the persistent database state, computing mathematical deltas,
feasibility shifts, and bottleneck migrations.
"""

from typing import List, Dict, Any, Optional
import copy

from app.services.rook_polynomial_service import RookPolynomialService
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.bottleneck_analysis_service import BottleneckAnalysisService


class WhatIfService:
    """Evaluates hypothetical allocation scenarios against baseline benchmarks."""

    @classmethod
    def evaluate(
        cls,
        baseline_matrix: List[List[int]],
        flight_ids: List[str],
        gate_ids: List[str],
        disabled_gate_ids: Optional[List[str]] = None,
        additional_restrictions: Optional[List[Dict[str, Any]]] = None,
        modified_matrix: Optional[List[List[int]]] = None,
        simulation_id: str = "BASELINE",
        simulation_name: str = "Baseline Scenario"
    ) -> Dict[str, Any]:
        """Compute comparative delta between baseline and hypothetical scenario."""
        m = len(baseline_matrix)
        n = len(baseline_matrix[0]) if m > 0 else 0

        # 1. Compute baseline mathematical metrics
        baseline_rook = RookPolynomialService.calculate(baseline_matrix)
        baseline_pie = InclusionExclusionService.calculate(baseline_matrix)
        baseline_bottlenecks = BottleneckAnalysisService.analyze(
            matrix=baseline_matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            simulation_id=simulation_id
        )

        n_baseline = baseline_pie["valid_assignments"]
        feasibility_baseline = baseline_pie["feasibility_percentage"]

        # 2. Construct hypothetical matrix
        if modified_matrix is not None:
            hypo_matrix = copy.deepcopy(modified_matrix)
        else:
            hypo_matrix = copy.deepcopy(baseline_matrix)

        applied_changes = []

        # Apply disabled gates (set entire column to 1)
        if disabled_gate_ids:
            for g_id in disabled_gate_ids:
                if g_id in gate_ids:
                    col_idx = gate_ids.index(g_id)
                    for r_idx in range(m):
                        hypo_matrix[r_idx][col_idx] = 1
                    applied_changes.append(f"Gate {g_id} marked unavailable (all docking slots closed).")

        # Apply additional flight-gate restrictions
        if additional_restrictions:
            for item in additional_restrictions:
                f_id = item.get("flight_id")
                g_id = item.get("gate_id")
                if f_id in flight_ids and g_id in gate_ids:
                    r_idx = flight_ids.index(f_id)
                    c_idx = gate_ids.index(g_id)
                    hypo_matrix[r_idx][c_idx] = 1
                    applied_changes.append(f"Assignment ({f_id} -> {g_id}) marked forbidden.")

        # 3. Compute hypothetical mathematical metrics
        hypo_rook = RookPolynomialService.calculate(hypo_matrix)
        hypo_pie = InclusionExclusionService.calculate(hypo_matrix)
        hypo_bottlenecks = BottleneckAnalysisService.analyze(
            matrix=hypo_matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            simulation_id=f"{simulation_id}-WHAT-IF"
        )

        n_hypo = hypo_pie["valid_assignments"]
        feasibility_hypo = hypo_pie["feasibility_percentage"]

        # 4. Compute deltas
        delta_n = n_hypo - n_baseline
        if n_baseline > 0:
            pct_change = round((delta_n / n_baseline) * 100, 2)
        else:
            pct_change = 0.0 if n_hypo == 0 else 100.0

        feasibility_delta = round(feasibility_hypo - feasibility_baseline, 2)

        # 5. Classify impact
        if n_hypo == 0 and n_baseline > 0:
            impact_level = "CRITICAL"
        elif pct_change <= -50.0:
            impact_level = "CRITICAL"
        elif -50.0 < pct_change <= -10.0:
            impact_level = "MODERATE"
        elif -10.0 < pct_change <= 0.0:
            impact_level = "NEGLIGIBLE"
        else:
            impact_level = "ENHANCED"

        # 6. Bottleneck shifts
        baseline_critical_f = {cf["flight_id"] for cf in baseline_bottlenecks["critical_flights"]}
        hypo_critical_f = {cf["flight_id"] for cf in hypo_bottlenecks["critical_flights"]}
        newly_critical = hypo_critical_f - baseline_critical_f

        bottleneck_changes = []
        for f_id in newly_critical:
            bottleneck_changes.append(f"Flight {f_id} has become severely bottlenecked under hypothetical constraints.")

        # 7. Generate explanatory narrative
        explanations = []
        if applied_changes:
            explanations.extend(applied_changes)

        if delta_n < 0:
            explanations.append(
                f"Valid conflict-free allocations decreased by {abs(delta_n):,} assignments ({abs(pct_change)}% reduction)."
            )
        elif delta_n > 0:
            explanations.append(
                f"Valid conflict-free allocations increased by {delta_n:,} assignments (+{pct_change}% increase)."
            )
        else:
            explanations.append("Hypothetical changes resulted in zero change to the total valid assignment count.")

        if n_hypo == 0:
            explanations.append(
                "CRITICAL WARNING: The hypothetical configuration admits ZERO conflict-free allocations. "
                "At least one flight or gate constraint has produced a complete deadlock."
            )

        return {
            "simulation_id": simulation_id,
            "simulation_name": simulation_name,
            "baseline": {
                "valid_assignments": n_baseline,
                "total_possible": baseline_pie["total_possible_assignments"],
                "feasibility_percentage": feasibility_baseline,
                "rook_coefficients": baseline_rook["coefficients"],
                "rook_polynomial": baseline_rook["polynomial"],
                "forbidden_cell_count": baseline_rook["forbidden_cell_count"],
                "critical_flight_count": len(baseline_bottlenecks["critical_flights"])
            },
            "hypothetical": {
                "valid_assignments": n_hypo,
                "total_possible": hypo_pie["total_possible_assignments"],
                "feasibility_percentage": feasibility_hypo,
                "rook_coefficients": hypo_rook["coefficients"],
                "rook_polynomial": hypo_rook["polynomial"],
                "forbidden_cell_count": hypo_rook["forbidden_cell_count"],
                "critical_flight_count": len(hypo_bottlenecks["critical_flights"])
            },
            "delta_valid_allocations": delta_n,
            "percentage_change": pct_change,
            "feasibility_delta": feasibility_delta,
            "impact_level": impact_level,
            "bottleneck_changes": bottleneck_changes,
            "explanations": explanations
        }
