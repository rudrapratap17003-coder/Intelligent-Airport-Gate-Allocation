"""
GateWise — Allocation Generator Service.
Generates actual, unique, conflict-free flight-to-gate assignments using
constraint-based recursive backtracking on the binary restriction matrix.

Mathematical Formulation & Consistency:
---------------------------------------
An allocation is a bijective function f: Flights -> Gates such that:
  1. Each flight i is assigned exactly one gate f(i).
  2. Each gate j is allocated to exactly one flight (injective & surjective permutation).
  3. No assignment violates the restriction matrix: B[i][f(i)] == 0 for all i.
  4. The total number of valid allocations is governed exactly by the Principle of
     Inclusion-Exclusion (PIE):
       N = sum_{k=0}^n (-1)^k * r_k * (n - k)!
  5. Backtracking searches the tree of valid partial assignments, pruning immediately
     whenever a gate is already occupied or the matrix cell is forbidden.
"""

from typing import List, Dict, Any, Optional
from app.services.rook_polynomial_service import validate_restriction_matrix
from app.services.inclusion_exclusion_service import InclusionExclusionService


MAX_SYSTEM_RESULT_LIMIT = 10000


class AllocationGeneratorError(ValueError):
    """Base exception for allocation generation errors."""
    pass


class AllocationGeneratorService:
    """Service generating individual conflict-free flight-to-gate allocations using backtracking."""

    @classmethod
    def generate(
        cls,
        matrix: List[List[int]],
        flight_ids: Optional[List[str]] = None,
        gate_ids: Optional[List[str]] = None,
        max_results: int = 100,
        pie_result: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate actual valid flight-to-gate allocations satisfying the restriction matrix.

        Args:
            matrix: Validated square binary restriction matrix (1 = forbidden, 0 = allowed).
            flight_ids: Ordered flight identifiers. Defaults to ['FL-001', 'FL-002', ...].
            gate_ids: Ordered gate identifiers. Defaults to ['GT-001', 'GT-002', ...].
            max_results: Maximum number of allocations to generate (positive integer, max 10000).
            pie_result: Optional precomputed Inclusion-Exclusion result dict to avoid redundant recomputation.

        Returns:
            dict containing:
                - matrix_size: int
                - total_possible_assignments: int
                - total_valid_assignments: int
                - generated_count: int
                - max_results: int
                - generation_complete: bool
                - has_more: bool
                - algorithm: str ("backtracking")
                - allocations: List[Dict[str, Any]]

        Raises:
            AllocationGeneratorError / ValueError: On invalid limits, matrix or identifier mismatches.
        """
        # 1. Validate result limit
        if not isinstance(max_results, int) or isinstance(max_results, bool) or max_results <= 0:
            raise AllocationGeneratorError(
                f"max_results must be a positive integer greater than zero. Received: {repr(max_results)}"
            )

        if max_results > MAX_SYSTEM_RESULT_LIMIT:
            raise AllocationGeneratorError(
                f"max_results cannot exceed system safeguard limit of {MAX_SYSTEM_RESULT_LIMIT}. Received: {max_results}"
            )

        # 2. Validate restriction matrix dimensions and binary integrity
        n = validate_restriction_matrix(matrix)

        # 3. Validate or default flight identifiers
        if flight_ids is None:
            resolved_flights = [f"FL-{i+1:03d}" for i in range(n)]
        else:
            if not isinstance(flight_ids, list):
                raise AllocationGeneratorError("flight_ids must be a list of string identifiers.")
            if len(flight_ids) != n:
                raise AllocationGeneratorError(
                    f"Number of flight_ids ({len(flight_ids)}) must match matrix dimension n={n}."
                )
            if len(set(flight_ids)) != n:
                raise AllocationGeneratorError(
                    "Duplicate flight identifiers detected in flight_ids. Each identifier must be unique."
                )
            for f in flight_ids:
                if not isinstance(f, str) or not f.strip():
                    raise AllocationGeneratorError(f"Invalid flight identifier: {repr(f)}. Must be non-empty string.")
            resolved_flights = [f.strip() for f in flight_ids]

        # 4. Validate or default gate identifiers
        if gate_ids is None:
            resolved_gates = [f"GT-{j+1:03d}" for j in range(n)]
        else:
            if not isinstance(gate_ids, list):
                raise AllocationGeneratorError("gate_ids must be a list of string identifiers.")
            if len(gate_ids) != n:
                raise AllocationGeneratorError(
                    f"Number of gate_ids ({len(gate_ids)}) must match matrix dimension n={n}."
                )
            if len(set(gate_ids)) != n:
                raise AllocationGeneratorError(
                    "Duplicate gate identifiers detected in gate_ids. Each identifier must be unique."
                )
            for g in gate_ids:
                if not isinstance(g, str) or not g.strip():
                    raise AllocationGeneratorError(f"Invalid gate identifier: {repr(g)}. Must be non-empty string.")
            resolved_gates = [g.strip() for g in gate_ids]

        # 5. Query authoritative Inclusion-Exclusion Engine (Phase 14) for exact mathematical counts
        if pie_result is None:
            pie_result = InclusionExclusionService.calculate(matrix)
        total_possible = pie_result["total_possible_assignments"]  # n!
        total_valid = pie_result["valid_assignments"]              # Exact PIE N

        # If zero valid allocations exist, return immediately without searching
        if total_valid == 0:
            return {
                "matrix_size": n,
                "total_possible_assignments": total_possible,
                "total_valid_assignments": 0,
                "generated_count": 0,
                "max_results": max_results,
                "generation_complete": True,
                "has_more": False,
                "algorithm": "backtracking",
                "allocations": []
            }

        # Optimization A: Precompute allowed gate indices for each flight to prune iteration branches
        allowed_gates_by_flight: Tuple[Tuple[int, ...], ...] = tuple(
            tuple(g for g in range(n) if matrix[f][g] == 0)
            for f in range(n)
        )

        # Optimization B: Pre-allocate pair dictionaries to avoid dictionary construction at leaves
        flight_gate_pair_cache = tuple(
            tuple({"flight_id": resolved_flights[i], "gate_id": resolved_gates[j]} for j in range(n))
            for i in range(n)
        )

        # 6. Constraint-based recursive backtracking
        allocations: List[Dict[str, Any]] = []
        current_assignment: List[int] = []  # Maps flight_idx -> gate_idx

        def backtrack(flight_idx: int, occupied_mask: int):
            nonlocal allocations
            if len(allocations) >= max_results:
                return

            # All n flights have been successfully assigned non-forbidden, distinct gates
            if flight_idx == n:
                allocation_num = len(allocations) + 1
                assignments = [
                    flight_gate_pair_cache[i][current_assignment[i]]
                    for i in range(n)
                ]
                allocations.append({
                    "allocation_number": allocation_num,
                    "assignments": assignments
                })
                return

            # For current flight, evaluate only allowed gates
            for gate_idx in allowed_gates_by_flight[flight_idx]:
                if not (occupied_mask & (1 << gate_idx)):
                    current_assignment.append(gate_idx)
                    backtrack(flight_idx + 1, occupied_mask | (1 << gate_idx))
                    current_assignment.pop()
                    if len(allocations) >= max_results:
                        return

        backtrack(0, 0)

        generated_count = len(allocations)
        generation_complete = (generated_count == total_valid)
        has_more = (total_valid > generated_count)

        return {
            "matrix_size": n,
            "total_possible_assignments": total_possible,
            "total_valid_assignments": total_valid,
            "generated_count": generated_count,
            "max_results": max_results,
            "generation_complete": generation_complete,
            "has_more": has_more,
            "algorithm": "backtracking",
            "allocations": allocations
        }


def generate_allocations(
    matrix: List[List[int]],
    flight_ids: Optional[List[str]] = None,
    gate_ids: Optional[List[str]] = None,
    max_results: int = 100,
    pie_result: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Convenience functional wrapper for AllocationGeneratorService.generate."""
    return AllocationGeneratorService.generate(
        matrix=matrix,
        flight_ids=flight_ids,
        gate_ids=gate_ids,
        max_results=max_results,
        pie_result=pie_result
    )
