"""
GateWise — Advanced Simulation Pipeline Service.
Executes the unified 10-step combinatorial simulation workflow:
validation -> rook polynomial -> PIE -> backtracking allocations -> conflict verification -> immutable persistence.
"""

import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.entities import (
    Simulation,
    SimulationRun,
    RestrictionMatrix,
    Flight,
    Gate
)
from app.services.rook_polynomial_service import RookPolynomialService
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.allocation_generator_service import AllocationGeneratorService
from app.services.conflict_detection_service import ConflictDetectionService
from app.services.bottleneck_analysis_service import BottleneckAnalysisService
from app.services.activity_service import log_activity


class SimulationPipelineService:
    """Orchestrates end-to-end mathematical simulation execution and immutable run recording."""

    @classmethod
    def execute_simulation(
        cls,
        db: Session,
        simulation_id: str,
        max_allocations: int = 100,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute full 10-step simulation pipeline and persist snapshot."""
        start_time = time.perf_counter()
        now = datetime.now(timezone.utc)

        # Step 1: Retrieve simulation
        sim = db.query(Simulation).filter(Simulation.id == simulation_id).first()
        if not sim:
            raise ValueError(f"Simulation scenario with ID {simulation_id} not found.")

        # Step 2: Retrieve linked flights and gates
        flights = [sf.flight for sf in sim.selected_flights]
        gates = [sg.gate for sg in sim.selected_gates]
        flight_ids = [f.id for f in flights]
        gate_ids = [g.id for g in gates]
        m = len(flight_ids)
        n = len(gate_ids)

        if m == 0 or n == 0:
            raise ValueError(f"Simulation {simulation_id} must have at least 1 flight and 1 gate linked.")

        # Step 3: Retrieve restriction matrix
        matrix_record = db.query(RestrictionMatrix).filter(RestrictionMatrix.simulation_id == simulation_id).first()
        if not matrix_record:
            raise ValueError(f"Restriction matrix for simulation {simulation_id} not found.")

        matrix = json.loads(matrix_record.matrix_data)

        # Step 4: Compute exact Rook Polynomial
        rook_res = RookPolynomialService.calculate(matrix)

        # Step 5: Compute exact Inclusion-Exclusion valid assignment count
        pie_res = InclusionExclusionService.calculate(matrix)

        # Step 6: Generate allocations via Backtracking Engine
        gen_res = AllocationGeneratorService.generate(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            max_results=max_allocations,
            pie_result=pie_res
        )

        # Step 7: Independently audit generated allocations via Conflict Detection Service
        detector = ConflictDetectionService.create_detector(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids
        )
        validated_allocations = []
        for alloc in gen_res["allocations"]:
            diag = detector.detect_conflicts(alloc["assignments"])
            validated_allocations.append({
                "allocation_number": alloc["allocation_number"],
                "assignments": alloc["assignments"],
                "is_valid": diag.get("is_valid", False),
                "total_conflicts": diag.get("total_conflicts", 0)
            })

        # Step 8: Cross-verify count
        n_valid = pie_res["valid_assignments"]
        gen_count = gen_res["generated_count"]
        if gen_res["generation_complete"]:
            verification_status = "VERIFIED_MATCH" if gen_count == n_valid else "DISCREPANCY_FLAGGED"
        else:
            verification_status = "TRUNCATED_SEARCH"

        # Step 8b: Compute bottleneck analysis
        flights_map = {f.id: f for f in flights}
        gates_map = {g.id: g for g in gates}
        bottlenecks = BottleneckAnalysisService.analyze(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids,
            flights_meta=flights_map,
            gates_meta=gates_map,
            simulation_id=sim.id
        )

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Step 9: Persist immutable SimulationRun snapshot
        existing_runs_count = db.query(SimulationRun).filter(SimulationRun.simulation_id == simulation_id).count()
        run_number = existing_runs_count + 1
        run_id = f"RUN-{simulation_id}-{run_number:03d}-{int(time.time()) % 10000:04d}"

        # Truncate allocations sample stored in DB to 50 items for space efficiency
        sample_allocations = validated_allocations[:50]

        run_record = SimulationRun(
            id=run_id,
            simulation_id=simulation_id,
            run_number=run_number,
            status="Completed",
            created_at=now,
            duration_ms=duration_ms,
            matrix_rows=m,
            matrix_cols=n,
            forbidden_cell_count=rook_res["forbidden_cell_count"],
            rook_coefficients=json.dumps(rook_res["coefficients"]),
            rook_polynomial=rook_res["polynomial"],
            pie_valid_allocations=n_valid,
            pie_total_possible=pie_res["total_possible_assignments"],
            feasibility_percentage=pie_res["feasibility_percentage"],
            generated_allocations_count=gen_count,
            allocations_json=json.dumps(sample_allocations),
            matrix_snapshot_json=json.dumps(matrix),
            verification_status=verification_status,
            notes=notes or f"Automated execution run #{run_number}."
        )
        db.add(run_record)

        # Step 10: Update simulation status and commit
        sim.status = "Completed"
        sim.updated_at = now

        log_activity(
            db=db,
            action_type="SIMULATION_EXECUTED",
            entity_type="Simulation",
            entity_id=sim.id,
            title=f"Simulation Run #{run_number} for '{sim.name}'",
            detail=f"Executed pipeline in {duration_ms}ms: N={n_valid} valid allocations ({pie_res['feasibility_percentage']}% feasible). Status: {verification_status}.",
            status="success"
        )

        db.commit()
        db.refresh(run_record)

        return {
            "run_id": run_id,
            "simulation_id": simulation_id,
            "simulation_name": sim.name,
            "category": sim.category,
            "run_number": run_number,
            "status": "Completed",
            "created_at": now.isoformat(),
            "duration_ms": duration_ms,
            "matrix_rows": m,
            "matrix_cols": n,
            "forbidden_cell_count": rook_res["forbidden_cell_count"],
            "rook_coefficients": rook_res["coefficients"],
            "rook_polynomial": rook_res["polynomial"],
            "pie_valid_allocations": n_valid,
            "pie_total_possible": pie_res["total_possible_assignments"],
            "feasibility_percentage": pie_res["feasibility_percentage"],
            "generated_allocations_count": gen_count,
            "generation_complete": gen_res["generation_complete"],
            "verification_status": verification_status,
            "allocations": validated_allocations,
            "bottlenecks": bottlenecks
        }
