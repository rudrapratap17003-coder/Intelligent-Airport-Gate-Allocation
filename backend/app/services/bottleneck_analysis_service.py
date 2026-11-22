"""
GateWise — Allocation Bottleneck Analysis Service.
Performs row-and-column constraint analysis on the binary restriction matrix to detect
operational bottlenecks, over-constrained flights, overloaded gates, and Hall's Condition violations.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import Simulation, Flight, Gate, RestrictionMatrix


class BottleneckAnalysisService:
    """Analyzes restriction matrices for allocation bottlenecks and constraint density."""

    @classmethod
    def analyze(
        cls,
        matrix: List[List[int]],
        flight_ids: Optional[List[str]] = None,
        gate_ids: Optional[List[str]] = None,
        flights_meta: Optional[Dict[str, Flight]] = None,
        gates_meta: Optional[Dict[str, Gate]] = None,
        simulation_id: str = "UNKNOWN"
    ) -> Dict[str, Any]:
        """Perform comprehensive constraint and bottleneck diagnosis."""
        m = len(matrix)
        n = len(matrix[0]) if m > 0 else 0

        resolved_f_ids = flight_ids or [f"FL-{i+1:03d}" for i in range(m)]
        resolved_g_ids = gate_ids or [f"GT-{j+1:03d}" for j in range(n)]

        total_cells = m * n
        total_forbidden = sum(sum(row) for row in matrix)
        overall_density = (total_forbidden / total_cells * 100) if total_cells > 0 else 0.0

        # Row analysis (Flights)
        critical_flights = []
        flight_stats = []
        zero_flight_cause = None

        for i, row in enumerate(matrix):
            f_id = resolved_f_ids[i] if i < len(resolved_f_ids) else f"Row-{i}"
            forbidden_count = sum(row)
            available_count = n - forbidden_count
            available_pct = (available_count / n * 100) if n > 0 else 0.0

            f_obj = flights_meta.get(f_id) if flights_meta else None
            f_num = f_obj.flight_number if f_obj else f_id
            f_type = f_obj.flight_type if f_obj else "Unknown"

            stat = {
                "flight_id": f_id,
                "flight_number": f_num,
                "flight_type": f_type,
                "row_index": i,
                "forbidden_gates": forbidden_count,
                "available_gates": available_count,
                "availability_pct": round(available_pct, 1),
                "is_critical": available_count <= 2
            }
            flight_stats.append(stat)

            if available_count == 0:
                zero_flight_cause = f"Flight {f_num} ({f_id}) has 0 available gates (all {n} gates forbidden). Zero valid allocations possible."
                critical_flights.append({**stat, "severity": "FATAL", "reason": "No available gates"})
            elif available_count == 1:
                critical_flights.append({**stat, "severity": "HIGH", "reason": "Only 1 gate alternative available"})
            elif available_count == 2:
                critical_flights.append({**stat, "severity": "MEDIUM", "reason": "Constrained to 2 gates"})

        # Column analysis (Gates)
        critical_gates = []
        gate_stats = []

        for j in range(n):
            g_id = resolved_g_ids[j] if j < len(resolved_g_ids) else f"Col-{j}"
            forbidden_count = sum(matrix[i][j] for i in range(m))
            eligible_count = m - forbidden_count
            eligibility_pct = (eligible_count / m * 100) if m > 0 else 0.0

            g_obj = gates_meta.get(g_id) if gates_meta else None
            g_num = g_obj.gate_number if g_obj else g_id
            g_type = g_obj.gate_type if g_obj else "Unknown"

            stat = {
                "gate_id": g_id,
                "gate_number": g_num,
                "gate_type": g_type,
                "column_index": j,
                "forbidden_flights": forbidden_count,
                "eligible_flights": eligible_count,
                "eligibility_pct": round(eligibility_pct, 1),
                "is_critical": eligible_count <= 1 or eligible_count >= m - 1
            }
            gate_stats.append(stat)

            if eligible_count == 0:
                critical_gates.append({**stat, "severity": "WARNING", "reason": "Gate is forbidden for all flights (unusable stand)"})
            elif eligible_count == 1:
                critical_gates.append({**stat, "severity": "HIGH", "reason": "Only 1 flight can use this gate"})
            elif eligible_count >= m - 1 and m >= 4:
                critical_gates.append({**stat, "severity": "HIGH_DEMAND", "reason": "Heavily contended gate (eligible for nearly all flights)"})

        # Over-constrained status
        over_constrained = bool(zero_flight_cause) or (m > n)
        if m > n and not zero_flight_cause:
            zero_flight_cause = f"Flight count ({m}) strictly exceeds gate count ({n}). Pigeonhole Principle guarantees 0 complete allocations."

        # Structured bottlenecks
        bottlenecks = []
        for cf in critical_flights:
            bottlenecks.append({
                "type": "FLIGHT_BOTTLENECK",
                "entity_id": cf["flight_id"],
                "name": cf["flight_number"],
                "severity": cf.get("severity", "MEDIUM"),
                "description": f"Flight {cf['flight_number']} has only {cf['available_gates']} eligible gate(s) out of {n}.",
                "remedy": "Enable additional gate compatibility or adjust aircraft stand assignment."
            })

        for cg in critical_gates:
            if cg.get("severity") == "WARNING":
                bottlenecks.append({
                    "type": "GATE_UNDERUTILIZED",
                    "entity_id": cg["gate_id"],
                    "name": cg["gate_number"],
                    "severity": "LOW",
                    "description": f"Gate {cg['gate_number']} cannot be used by any scheduled flights in this window.",
                    "remedy": "Check gate restrictions or allocate to overflow/maintenance."
                })
            elif cg.get("severity") == "HIGH_DEMAND":
                bottlenecks.append({
                    "type": "GATE_CONTENTION",
                    "entity_id": cg["gate_id"],
                    "name": cg["gate_number"],
                    "severity": "MEDIUM",
                    "description": f"Gate {cg['gate_number']} is in high contention across {cg['eligible_flights']} flights.",
                    "remedy": "Distribute traffic across adjacent contact stands."
                })

        # Recommendations
        recommendations = []
        if over_constrained:
            recommendations.append("Resolve over-constrained flight/gate dimensions before attempting simulation.")
        if critical_flights:
            most_critical = critical_flights[0]["flight_number"]
            recommendations.append(f"Prioritize stand availability for {most_critical} to increase total valid allocations.")
        if overall_density > 60:
            recommendations.append("Overall matrix restriction density exceeds 60%. Consider relaxing non-critical terminal separation rules.")
        elif overall_density < 20:
            recommendations.append("Matrix has high operational flexibility (<20% restrictions). Schedule is robust against minor delays.")
        if not recommendations:
            recommendations.append("No critical allocation bottlenecks detected in current configuration.")

        return {
            "simulation_id": simulation_id,
            "matrix_rows": m,
            "matrix_cols": n,
            "total_forbidden": total_forbidden,
            "restriction_density_pct": round(overall_density, 2),
            "critical_flights": critical_flights,
            "critical_gates": critical_gates,
            "flight_stats": flight_stats,
            "gate_stats": gate_stats,
            "over_constrained": over_constrained,
            "zero_allocation_cause": zero_flight_cause,
            "bottlenecks": bottlenecks,
            "recommendations": recommendations
        }
