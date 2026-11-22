"""
GateWise — Allocation Conflict Detection Engine.
Independently verifies flight-to-gate allocations against the binary restriction matrix
and one-to-one assignment requirements without relying on the Allocation Generator.
"""

from typing import List, Dict, Any, Optional, Set, Tuple
from app.services.rook_polynomial_service import validate_restriction_matrix, InvalidMatrixError


class ConflictDetectionError(ValueError):
    """Exception raised when input matrix or expected reference lists are structurally invalid."""
    pass


class ConflictDetector:
    """Pre-validated conflict detector instance.

    Caches validated matrix dimensions and identifier lookup tables for high-throughput
    batch auditing without redundant re-validation of static scenario constraints.
    """

    def __init__(
        self,
        matrix: List[List[int]],
        flight_ids: List[str],
        gate_ids: List[str]
    ):
        # 1. Validate restriction matrix dimensions and binary integrity
        dims = validate_restriction_matrix(matrix)
        self.dims = dims
        self.num_rows = dims.rows
        self.num_cols = dims.cols
        self.n = dims.rows
        self.matrix = matrix

        # 2. Validate expected flight identifiers
        if not isinstance(flight_ids, list):
            raise ConflictDetectionError("flight_ids must be a list of string identifiers.")
        if len(flight_ids) != self.num_rows:
            raise ConflictDetectionError(
                f"Number of flight_ids ({len(flight_ids)}) must match matrix flight count m={self.num_rows}."
            )
        if len(set(flight_ids)) != self.num_rows:
            raise ConflictDetectionError(
                "Duplicate flight identifiers detected in expected flight_ids."
            )
        for f in flight_ids:
            if not isinstance(f, str) or not f.strip():
                raise ConflictDetectionError(
                    f"Invalid flight identifier in flight_ids: {repr(f)}. Must be a non-empty string."
                )

        # 3. Validate expected gate identifiers
        if not isinstance(gate_ids, list):
            raise ConflictDetectionError("gate_ids must be a list of string identifiers.")
        if len(gate_ids) != self.num_cols:
            raise ConflictDetectionError(
                f"Number of gate_ids ({len(gate_ids)}) must match matrix gate count n={self.num_cols}."
            )
        if len(set(gate_ids)) != self.num_cols:
            raise ConflictDetectionError(
                "Duplicate gate identifiers detected in expected gate_ids."
            )
        for g in gate_ids:
            if not isinstance(g, str) or not g.strip():
                raise ConflictDetectionError(
                    f"Invalid gate identifier in gate_ids: {repr(g)}. Must be a non-empty string."
                )

        self.expected_flights = [f.strip() for f in flight_ids]
        self.expected_gates = [g.strip() for g in gate_ids]
        self.flight_to_idx = {fid: idx for idx, fid in enumerate(self.expected_flights)}
        self.gate_to_idx = {gid: idx for idx, gid in enumerate(self.expected_gates)}

    def detect_conflicts(self, allocation: Any) -> Dict[str, Any]:
        """Independently inspect an allocation and identify assignment conflicts."""
        n = self.n
        matrix = self.matrix
        expected_flights = self.expected_flights
        expected_gates = self.expected_gates
        flight_to_idx = self.flight_to_idx
        gate_to_idx = self.gate_to_idx

        # Initialize diagnostic state
        conflicts: List[Dict[str, Any]] = []
        seen_conflict_keys: Set[Tuple[str, Optional[str], Optional[str], str]] = set()

        def add_conflict(conflict_type: str, severity: str, flight_id: Optional[str], gate_id: Optional[str], message: str):
            key = (conflict_type, flight_id, gate_id, message)
            if key not in seen_conflict_keys:
                seen_conflict_keys.add(key)
                conflicts.append({
                    "conflict_type": conflict_type,
                    "severity": severity,
                    "flight_id": flight_id,
                    "gate_id": gate_id,
                    "message": message
                })

        missing_flights: List[str] = []
        unknown_flights: List[str] = []
        unknown_gates: List[str] = []
        unassigned_gates: List[str] = []
        checked_assignments = 0

        # Extract raw assignments from allocation container
        raw_assignments = None
        if hasattr(allocation, "model_dump"):
            dumped = allocation.model_dump()
            if isinstance(dumped, dict) and "assignments" in dumped:
                raw_assignments = dumped["assignments"]
            elif isinstance(dumped, list):
                raw_assignments = dumped
        elif isinstance(allocation, dict):
            if "assignments" in allocation:
                raw_assignments = allocation["assignments"]
            else:
                add_conflict(
                    conflict_type="MALFORMED_ASSIGNMENT",
                    severity="ERROR",
                    flight_id=None,
                    gate_id=None,
                    message="Allocation dictionary is missing required 'assignments' key."
                )
        elif isinstance(allocation, list):
            raw_assignments = allocation
        else:
            add_conflict(
                conflict_type="MALFORMED_ASSIGNMENT",
                severity="ERROR",
                flight_id=None,
                gate_id=None,
                message=f"Allocation must be a list or a dictionary containing 'assignments', got {type(allocation).__name__}."
            )

        # If assignments list is unavailable or malformed
        if raw_assignments is None or not isinstance(raw_assignments, list):
            if raw_assignments is not None and not isinstance(raw_assignments, list):
                add_conflict(
                    conflict_type="MALFORMED_ASSIGNMENT",
                    severity="ERROR",
                    flight_id=None,
                    gate_id=None,
                    message=f"'assignments' must be a list, got {type(raw_assignments).__name__}."
                )
            missing_flights = list(expected_flights)
            unassigned_gates = list(expected_gates)
            for f in missing_flights:
                add_conflict("MISSING_FLIGHT", "ERROR", f, None, f"Expected flight '{f}' is missing from the allocation.")
            for g in unassigned_gates:
                add_conflict("UNASSIGNED_GATE", "ERROR", None, g, f"Expected gate '{g}' is unassigned in the allocation.")
            add_conflict("INCOMPLETE_ALLOCATION", "ERROR", None, None, f"Allocation is incomplete: contains 0 assignments out of {n} required.")
            return {
                "is_valid": False,
                "matrix_size": n,
                "total_conflicts": len(conflicts),
                "conflicts": conflicts,
                "missing_flights": missing_flights,
                "unknown_flights": unknown_flights,
                "unknown_gates": unknown_gates,
                "unassigned_gates": unassigned_gates,
                "checked_assignments": 0,
                "validation_summary": f"Allocation contains {len(conflicts)} conflict(s)."
            }

        checked_assignments = len(raw_assignments)
        seen_flights: Dict[str, List[int]] = {}  # flight_id -> list of record indices
        seen_gates: Dict[str, List[int]] = {}    # gate_id -> list of record indices

        # Inspect individual assignment records
        for idx, item in enumerate(raw_assignments):
            if hasattr(item, "model_dump"):
                item_dict = item.model_dump()
            elif isinstance(item, dict):
                item_dict = item
            else:
                add_conflict(
                    conflict_type="MALFORMED_ASSIGNMENT",
                    severity="ERROR",
                    flight_id=None,
                    gate_id=None,
                    message=f"Assignment record at index {idx} is malformed: expected dictionary, got {type(item).__name__}."
                )
                continue

            f_raw = item_dict.get("flight_id")
            g_raw = item_dict.get("gate_id")

            f_valid = isinstance(f_raw, str) and bool(f_raw.strip())
            g_valid = isinstance(g_raw, str) and bool(g_raw.strip())

            if not f_valid:
                add_conflict(
                    conflict_type="MALFORMED_ASSIGNMENT",
                    severity="ERROR",
                    flight_id=None,
                    gate_id=str(g_raw) if g_valid else None,
                    message=f"Assignment record at index {idx} has missing or invalid 'flight_id'."
                )
            if not g_valid:
                add_conflict(
                    conflict_type="MALFORMED_ASSIGNMENT",
                    severity="ERROR",
                    flight_id=str(f_raw) if f_valid else None,
                    gate_id=None,
                    message=f"Assignment record at index {idx} has missing or invalid 'gate_id'."
                )

            if not f_valid or not g_valid:
                continue

            fid = f_raw.strip()
            gid = g_raw.strip()

            # Record occurrences
            seen_flights.setdefault(fid, []).append(idx)
            seen_gates.setdefault(gid, []).append(idx)

            # Check Unknown Flights
            if fid not in flight_to_idx:
                if fid not in unknown_flights:
                    unknown_flights.append(fid)
                add_conflict(
                    conflict_type="UNKNOWN_FLIGHT",
                    severity="ERROR",
                    flight_id=fid,
                    gate_id=gid,
                    message=f"Flight '{fid}' is not in the expected flight list."
                )

            # Check Unknown Gates
            if gid not in gate_to_idx:
                if gid not in unknown_gates:
                    unknown_gates.append(gid)
                add_conflict(
                    conflict_type="UNKNOWN_GATE",
                    severity="ERROR",
                    flight_id=fid,
                    gate_id=gid,
                    message=f"Gate '{gid}' is not in the expected gate list."
                )

            # Check Duplicate Flight Assignment
            if len(seen_flights[fid]) > 1:
                add_conflict(
                    conflict_type="DUPLICATE_FLIGHT",
                    severity="ERROR",
                    flight_id=fid,
                    gate_id=gid,
                    message=f"Flight '{fid}' is assigned to more than one gate."
                )

            # Check Duplicate Gate Assignment
            if len(seen_gates[gid]) > 1:
                add_conflict(
                    conflict_type="DUPLICATE_GATE",
                    severity="ERROR",
                    flight_id=fid,
                    gate_id=gid,
                    message=f"Gate '{gid}' is assigned to more than one flight."
                )

            # Check Forbidden Matrix Cells
            if fid in flight_to_idx and gid in gate_to_idx:
                row = flight_to_idx[fid]
                col = gate_to_idx[gid]
                if matrix[row][col] == 1:
                    add_conflict(
                        conflict_type="FORBIDDEN_ASSIGNMENT",
                        severity="ERROR",
                        flight_id=fid,
                        gate_id=gid,
                        message=f"Flight '{fid}' is assigned to forbidden Gate '{gid}' (matrix restriction at row {row}, col {col})."
                    )

        # Completeness & Missing/Unassigned Checks
        for f in expected_flights:
            if f not in seen_flights:
                missing_flights.append(f)
                add_conflict(
                    conflict_type="MISSING_FLIGHT",
                    severity="ERROR",
                    flight_id=f,
                    gate_id=None,
                    message=f"Expected flight '{f}' is missing from the allocation."
                )

        for g in expected_gates:
            if g not in seen_gates:
                unassigned_gates.append(g)
                add_conflict(
                    conflict_type="UNASSIGNED_GATE",
                    severity="ERROR",
                    flight_id=None,
                    gate_id=g,
                    message=f"Expected gate '{g}' is unassigned in the allocation."
                )

        # Incomplete allocation check (less than n assignments or missing flights/unassigned gates)
        if checked_assignments < n:
            add_conflict(
                conflict_type="INCOMPLETE_ALLOCATION",
                severity="ERROR",
                flight_id=None,
                gate_id=None,
                message=f"Allocation contains fewer than {n} assignments ({checked_assignments} provided)."
            )

        # Compute summary & overall validity
        total_conflicts = len(conflicts)
        is_valid = (
            total_conflicts == 0
            and len(missing_flights) == 0
            and len(unknown_flights) == 0
            and len(unknown_gates) == 0
            and len(unassigned_gates) == 0
            and checked_assignments == n
        )

        validation_summary = (
            "Allocation is valid and conflict-free."
            if is_valid
            else f"Allocation contains {total_conflicts} conflict(s)."
        )

        return {
            "is_valid": is_valid,
            "matrix_size": n,
            "total_conflicts": total_conflicts,
            "conflicts": conflicts,
            "missing_flights": missing_flights,
            "unknown_flights": unknown_flights,
            "unknown_gates": unknown_gates,
            "unassigned_gates": unassigned_gates,
            "checked_assignments": checked_assignments,
            "validation_summary": validation_summary
        }


class ConflictDetectionService:
    """Service providing independent conflict detection for flight-to-gate allocations."""

    @classmethod
    def create_detector(
        cls,
        matrix: List[List[int]],
        flight_ids: List[str],
        gate_ids: List[str]
    ) -> ConflictDetector:
        """Create a pre-validated ConflictDetector for repeated or batch auditing."""
        return ConflictDetector(
            matrix=matrix,
            flight_ids=flight_ids,
            gate_ids=gate_ids
        )

    @classmethod
    def detect_conflicts(
        cls,
        matrix: List[List[int]],
        flight_ids: List[str],
        gate_ids: List[str],
        allocation: Any
    ) -> Dict[str, Any]:
        """Independently inspect an allocation and identify assignment conflicts.

        Args:
            matrix: 2D binary restriction matrix (1 = forbidden, 0 = allowed).
            flight_ids: Expected ordered flight identifiers.
            gate_ids: Expected ordered gate identifiers.
            allocation: Allocation data (list of assignments, or dict with 'assignments' key).

        Returns:
            Dict containing validation results and conflict diagnostics.
        """
        detector = cls.create_detector(matrix=matrix, flight_ids=flight_ids, gate_ids=gate_ids)
        return detector.detect_conflicts(allocation)

    @classmethod
    def detect_conflicts_batch(
        cls,
        matrix: List[List[int]],
        flight_ids: List[str],
        gate_ids: List[str],
        allocations: List[Any]
    ) -> List[Dict[str, Any]]:
        """Validate a batch of allocations against the same restriction matrix and identifiers."""
        detector = cls.create_detector(matrix=matrix, flight_ids=flight_ids, gate_ids=gate_ids)
        return [detector.detect_conflicts(alloc) for alloc in allocations]


def detect_allocation_conflicts(
    matrix: List[List[int]],
    flight_ids: List[str],
    gate_ids: List[str],
    allocation: Any
) -> Dict[str, Any]:
    """Functional wrapper for ConflictDetectionService.detect_conflicts."""
    return ConflictDetectionService.detect_conflicts(
        matrix=matrix,
        flight_ids=flight_ids,
        gate_ids=gate_ids,
        allocation=allocation
    )
