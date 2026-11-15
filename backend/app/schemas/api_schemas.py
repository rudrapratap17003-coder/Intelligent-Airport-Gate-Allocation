"""
GateWise — Pydantic Schemas.
Request & response models for Flights, Gates, Simulations, and Restriction Matrices.
"""

from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ==================== FLIGHT SCHEMAS ====================

class FlightBase(BaseModel):
    flight_number: str = Field(..., min_length=2, max_length=20, description="Flight callsign (e.g. AI101)")
    airline: str = Field(..., min_length=1, max_length=100)
    aircraft_type: str = Field(..., min_length=1, max_length=100)
    arrival_time: str = Field(..., max_length=20)
    departure_time: str = Field(..., max_length=20)
    passenger_capacity: int = Field(..., gt=0, le=900)
    terminal: str = Field(default="T1", max_length=20)
    status: str = Field(default="Scheduled", max_length=50)


class FlightCreate(FlightBase):
    id: Optional[str] = Field(None, max_length=50)


class FlightUpdate(BaseModel):
    flight_number: Optional[str] = Field(None, min_length=2, max_length=20)
    airline: Optional[str] = Field(None, min_length=1, max_length=100)
    aircraft_type: Optional[str] = Field(None, min_length=1, max_length=100)
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    passenger_capacity: Optional[int] = Field(None, gt=0, le=900)
    terminal: Optional[str] = None
    status: Optional[str] = None


class FlightResponse(FlightBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


# ==================== GATE SCHEMAS ====================

class GateBase(BaseModel):
    gate_number: str = Field(..., min_length=1, max_length=20, description="Gate code (e.g. G1, A01)")
    terminal: str = Field(default="T1", max_length=20)
    gate_type: str = Field(default="Domestic", max_length=50)
    supported_aircraft: str = Field(default="Narrow-Body Only", max_length=100)
    max_capacity: int = Field(..., gt=0, le=900)
    status: str = Field(default="Available", max_length=50)


class GateCreate(GateBase):
    id: Optional[str] = Field(None, max_length=50)


class GateUpdate(BaseModel):
    gate_number: Optional[str] = Field(None, min_length=1, max_length=20)
    terminal: Optional[str] = None
    gate_type: Optional[str] = None
    supported_aircraft: Optional[str] = None
    max_capacity: Optional[int] = Field(None, gt=0, le=900)
    status: Optional[str] = None


class GateResponse(GateBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


# ==================== SIMULATION SCHEMAS ====================

class SimulationCreate(BaseModel):
    id: Optional[str] = Field(None, max_length=50)
    name: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = None
    selected_flight_ids: List[str] = Field(default_factory=list)
    selected_gate_ids: List[str] = Field(default_factory=list)
    status: Optional[str] = Field(default="Draft")


class SimulationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=150)
    description: Optional[str] = None
    selected_flight_ids: Optional[List[str]] = None
    selected_gate_ids: Optional[List[str]] = None
    status: Optional[str] = None


class SimulationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    status: str
    selected_flight_ids: List[str]
    selected_gate_ids: List[str]

    model_config = ConfigDict(from_attributes=True)


# ==================== RESTRICTION SCHEMAS ====================

class RestrictionUpdate(BaseModel):
    matrix: List[List[int]] = Field(..., description="2D binary restriction matrix")


class RestrictionResponse(BaseModel):
    simulation_id: str
    rows_count: int
    cols_count: int
    matrix: List[List[int]]
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== MATHEMATICAL ENGINE SCHEMAS ====================

class RookPolynomialResponse(BaseModel):
    matrix_size: int = Field(..., description="Dimension n of the n x n square restriction board")
    forbidden_cell_count: int = Field(..., description="Total count of restricted (1) cells")
    coefficients: List[int] = Field(..., description="Coefficients [r0, r1, ..., r_k] of the Rook Polynomial")
    polynomial: str = Field(..., description="Formatted algebraic polynomial expression")
    maximum_rook_count: int = Field(..., description="Highest degree k with r_k > 0 (or 0 if empty board)")
    algorithm: str = Field(default="row_based_dynamic_programming", description="Combinatorial algorithm used")

    model_config = ConfigDict(from_attributes=True)


class InclusionExclusionTerm(BaseModel):
    k: int = Field(..., description="Index k (number of rooks)")
    rook_coefficient: int = Field(..., description="Rook coefficient r_k")
    factorial_value: int = Field(..., description="Factorial value (n-k)!")
    sign: int = Field(..., description="Alternating sign (-1)^k, either 1 or -1")
    contribution: int = Field(..., description="Signed term contribution: sign * r_k * (n-k)!")


class InclusionExclusionResponse(BaseModel):
    matrix_size: int = Field(..., description="Dimension n of the n x n square matrix")
    forbidden_cell_count: int = Field(..., description="Total count of restricted (1) cells")
    rook_coefficients: List[int] = Field(..., description="Rook polynomial coefficients [r0, ..., r_k]")
    polynomial: str = Field(..., description="Formatted Rook Polynomial string")
    factorial_terms: List[int] = Field(..., description="Factorial values [(n)!, (n-1)!, ..., 0!]")
    inclusion_exclusion_terms: List[InclusionExclusionTerm] = Field(..., description="Itemized PIE terms")
    total_possible_assignments: int = Field(..., description="Total unconstrained permutations n!")
    valid_assignments: int = Field(..., description="Exact conflict-free valid assignments N")
    invalid_assignments: int = Field(..., description="Number of invalid assignments (n! - N)")
    feasibility_percentage: float = Field(..., description="Percentage of valid assignments (N / n! * 100)")
    calculation_steps: List[str] = Field(..., description="Mathematical derivation steps")

    model_config = ConfigDict(from_attributes=True)


# ==================== CONFLICT DETECTOR SCHEMAS ====================

class AllocationConflictItem(BaseModel):
    conflict_type: str = Field(..., description="Category of conflict (e.g., DUPLICATE_GATE, FORBIDDEN_ASSIGNMENT)")
    severity: str = Field(default="ERROR", description="Severity level: ERROR or WARNING")
    flight_id: Optional[str] = Field(default=None, description="Involved flight identifier, if applicable")
    gate_id: Optional[str] = Field(default=None, description="Involved gate identifier, if applicable")
    message: str = Field(..., description="Human-readable diagnostic description of the conflict")


class ConflictDetectionResponse(BaseModel):
    is_valid: bool = Field(..., description="True if allocation satisfies all constraints without conflicts")
    matrix_size: int = Field(..., description="Dimension n of the square problem")
    total_conflicts: int = Field(..., description="Total count of unique conflicts detected")
    conflicts: List[AllocationConflictItem] = Field(..., description="Itemized list of detected conflicts")
    missing_flights: List[str] = Field(default_factory=list, description="Expected flights not present in allocation")
    unknown_flights: List[str] = Field(default_factory=list, description="Flights present that are not in expected list")
    unknown_gates: List[str] = Field(default_factory=list, description="Gates present that are not in expected list")
    unassigned_gates: List[str] = Field(default_factory=list, description="Expected gates not assigned to any flight")
    checked_assignments: int = Field(..., description="Total assignment records processed")
    validation_summary: str = Field(..., description="Summary statement of diagnostic outcome")

    model_config = ConfigDict(from_attributes=True)


class AllocationValidationRequest(BaseModel):
    matrix: List[List[int]] = Field(..., description="2D binary restriction matrix")
    flight_ids: List[str] = Field(..., description="Ordered expected flight identifiers")
    gate_ids: List[str] = Field(..., description="Ordered expected gate identifiers")
    allocation: Any = Field(..., description="Allocation to inspect (list of assignments or plan dict)")


# ==================== ALLOCATION GENERATOR SCHEMAS ====================

class FlightGateAssignment(BaseModel):
    flight_id: str = Field(..., description="Unique flight identifier")
    gate_id: str = Field(..., description="Allocated gate identifier")


class AllocationPlan(BaseModel):
    allocation_number: int = Field(..., description="1-based sequence index of the allocation")
    assignments: List[FlightGateAssignment] = Field(..., description="Flight-to-gate assignments")
    validation: Optional[ConflictDetectionResponse] = Field(default=None, description="Independent validation results")

    model_config = ConfigDict(from_attributes=True)


class AllocationGenerationResponse(BaseModel):
    matrix_size: int = Field(..., description="Dimension n of the assignment problem")
    total_possible_assignments: int = Field(..., description="Total unconstrained permutations n!")
    total_valid_assignments: int = Field(..., description="Exact total valid allocations from PIE")
    generated_count: int = Field(..., description="Number of allocations generated in this response")
    max_results: int = Field(..., description="Requested allocation limit")
    generation_complete: bool = Field(..., description="True if all valid allocations were generated")
    has_more: bool = Field(..., description="True if additional valid allocations exist")
    algorithm: str = Field(default="backtracking", description="Generation algorithm used")
    allocations: List[AllocationPlan] = Field(..., description="Generated allocation plans")

    model_config = ConfigDict(from_attributes=True)


# ==================== DASHBOARD SCHEMAS ====================

from typing import Dict


class FlightStats(BaseModel):
    total: int = Field(..., description="Total registered flights")
    by_status: Dict[str, int] = Field(default_factory=dict, description="Counts keyed by flight status")
    scheduled: int = Field(default=0, description="Scheduled flights count")
    boarding: int = Field(default=0, description="Boarding flights count")
    delayed: int = Field(default=0, description="Delayed flights count")
    arrived: int = Field(default=0, description="Arrived flights count")


class GateStats(BaseModel):
    total: int = Field(..., description="Total registered gates")
    by_status: Dict[str, int] = Field(default_factory=dict, description="Counts keyed by gate status")
    available: int = Field(default=0, description="Available gates count")
    occupied: int = Field(default=0, description="Occupied gates count")
    maintenance: int = Field(default=0, description="Maintenance or unavailable gates count")


class SimulationOverviewItem(BaseModel):
    id: str = Field(..., description="Simulation scenario identifier")
    name: str = Field(..., description="Scenario display name")
    description: Optional[str] = Field(default=None, description="Scenario description")
    flight_count: int = Field(..., description="Number of selected flights")
    gate_count: int = Field(..., description="Number of selected gates")
    matrix_status: str = Field(..., description="Status summary of the restriction matrix")
    is_valid: bool = Field(..., description="Whether configuration is mathematically balanced and complete")
    validation_message: str = Field(..., description="Diagnostic validation explanation")
    created_at: datetime
    updated_at: datetime


class SimulationStats(BaseModel):
    total: int = Field(..., description="Total simulation scenarios")
    valid_count: int = Field(..., description="Count of valid balanced scenarios")
    invalid_count: int = Field(..., description="Count of incomplete or unbalanced scenarios")
    most_recent_id: Optional[str] = Field(default=None, description="Identifier of most recently updated scenario")
    most_recent_name: Optional[str] = Field(default=None, description="Name of most recently updated scenario")
    most_recent_updated_at: Optional[datetime] = Field(default=None, description="Last update timestamp of most recent scenario")
    simulations: List[SimulationOverviewItem] = Field(default_factory=list, description="Overview list of all simulations")


class MathematicalSummary(BaseModel):
    simulation_id: str
    simulation_name: str
    matrix_size: int
    total_possible_assignments: int
    exact_valid_assignments: int
    forbidden_assignment_count: int
    restriction_density: float
    feasibility_percentage: float
    rook_polynomial: str
    rook_coefficients: List[int]


class ActivityLogItem(BaseModel):
    id: int
    action_type: str
    entity_type: str
    entity_id: Optional[str] = None
    title: str
    detail: str
    timestamp: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class DashboardSummaryResponse(BaseModel):
    flights: FlightStats
    gates: GateStats
    simulations: SimulationStats
    mathematical_summary: Optional[MathematicalSummary] = None
    recent_activities: List[ActivityLogItem]


# ==================== ANALYTICS SCHEMAS (PHASE 22) ====================

class SimulationAnalyticsItem(BaseModel):
    id: str = Field(..., description="Simulation ID")
    name: str = Field(..., description="Simulation display name")
    matrix_size: Optional[int] = Field(None, description="Matrix dimension n if balanced")
    flight_count: int = Field(..., description="Number of selected flights")
    gate_count: int = Field(..., description="Number of selected gates")
    is_valid_config: bool = Field(..., description="True if balanced square configuration")
    validation_message: str = Field(..., description="Validation summary or error reason")
    forbidden_count: int = Field(default=0, description="Count of forbidden assignments")
    allowed_count: int = Field(default=0, description="Count of allowed assignments")
    restriction_density: float = Field(default=0.0, description="Percentage of cells forbidden (0-100%)")
    total_possible_assignments: int = Field(default=0, description="Unrestricted permutations n!")
    exact_valid_assignments: int = Field(default=0, description="Exact valid assignments N via PIE")
    invalid_assignments: int = Field(default=0, description="Invalid assignments (n! - N)")
    feasibility_percentage: float = Field(default=0.0, description="Percentage of valid assignments (N / n! * 100)")
    is_feasible: bool = Field(default=False, description="True if at least one valid allocation exists (N > 0)")
    rook_polynomial: Optional[str] = Field(None, description="Formatted Rook Polynomial")
    rook_coefficients: List[int] = Field(default_factory=list, description="Rook coefficients r0..rn")
    polynomial_degree: int = Field(default=0, description="Highest degree with r_k > 0")


class FeasibilityExtremum(BaseModel):
    simulation_id: str
    simulation_name: str
    matrix_size: int
    feasibility_percentage: float
    exact_valid_assignments: int
    total_possible_assignments: int


class AnalyticsOverviewResponse(BaseModel):
    total_simulations: int = Field(..., description="Total simulations in database")
    valid_simulations_count: int = Field(..., description="Count of valid balanced simulations")
    incompatible_simulations_count: int = Field(..., description="Count of unbalanced / incomplete simulations")
    total_flights: int = Field(..., description="Total registered flights in database")
    total_gates: int = Field(..., description="Total registered gates in database")
    average_restriction_density: float = Field(..., description="Average restriction density across valid simulations")
    feasible_simulations_count: int = Field(..., description="Valid simulations with N > 0")
    infeasible_simulations_count: int = Field(..., description="Valid simulations with N = 0")
    highest_feasibility: Optional[FeasibilityExtremum] = None
    lowest_feasibility: Optional[FeasibilityExtremum] = None
    simulations: List[SimulationAnalyticsItem] = Field(default_factory=list, description="All simulation analytics items")


class RookCoefficientDetail(BaseModel):
    k: int = Field(..., description="Degree / rook count k")
    coefficient: int = Field(..., description="Value of r_k")
    meaning: str = Field(..., description="Mathematical interpretation of r_k")


class PieTermDetail(BaseModel):
    k: int = Field(..., description="Term index k")
    rook_coefficient: int = Field(..., description="Rook coefficient r_k")
    factorial_value: int = Field(..., description="Factorial value (n-k)!")
    sign: int = Field(..., description="Alternating sign (+1 or -1)")
    contribution: int = Field(..., description="Signed term value sign * r_k * (n-k)!")
    is_positive: bool = Field(..., description="True if sign is +1")


class AllocationAnalyticsSummary(BaseModel):
    generated_count: int = Field(..., description="Number of materialized allocations in sample")
    max_requested: int = Field(..., description="Sample limit requested")
    independently_validated: int = Field(..., description="Number verified by conflict detection engine")
    valid_count: int = Field(..., description="Number of conflict-free allocations")
    invalid_count: int = Field(..., description="Number with conflicts")
    generation_complete: bool = Field(..., description="True if all possible allocations were materialized")
    algorithm: str = Field(default="backtracking", description="Generation algorithm")


class SimulationDetailedAnalyticsResponse(BaseModel):
    simulation_id: str
    simulation_name: str
    matrix_size: int
    flight_count: int
    gate_count: int
    forbidden_count: int
    allowed_count: int
    restriction_density: float
    total_possible_assignments: int
    exact_valid_assignments: int
    invalid_assignments: int
    feasibility_percentage: float
    is_feasible: bool
    rook_polynomial: str
    polynomial_degree: int
    coefficients_detail: List[RookCoefficientDetail]
    pie_terms_detail: List[PieTermDetail]
    positive_contributions_sum: int
    negative_contributions_sum: int
    allocation_analytics: Optional[AllocationAnalyticsSummary] = None


# ==================== SCENARIO COMPARISON SCHEMAS (PHASE 23) ====================

class ScenarioComparisonItem(BaseModel):
    id: str
    name: str
    flight_count: int
    gate_count: int
    matrix_size: Optional[int] = None
    is_valid_config: bool
    validation_message: str
    forbidden_count: int = 0
    allowed_count: int = 0
    restriction_density: float = 0.0
    total_possible_assignments: int = 0
    exact_valid_assignments: int = 0
    invalid_assignments: int = 0
    feasibility_percentage: float = 0.0
    is_feasible: bool = False
    rook_polynomial: Optional[str] = None
    rook_coefficients: List[int] = Field(default_factory=list)
    polynomial_degree: int = 0
    positive_sum: int = 0
    negative_sum: int = 0
    matrix: Optional[List[List[int]]] = None


class ComparisonInsight(BaseModel):
    type: str  # "FEASIBILITY", "DENSITY", "STRUCTURE", "POLYNOMIAL"
    severity: str  # "info", "warning", "success"
    title: str
    message: str


class MatrixComparisonResult(BaseModel):
    is_compatible: bool
    dimension: Optional[int] = None
    identical_cells_count: int = 0
    different_cells_count: int = 0
    difference_matrix: Optional[List[List[int]]] = None
    explanation: str


class ScenarioComparisonRequest(BaseModel):
    simulation_ids: List[str] = Field(..., min_length=2, description="List of at least 2 simulation IDs to compare")


class ScenarioComparisonResponse(BaseModel):
    scenarios: List[ScenarioComparisonItem]
    are_dimensions_compatible: bool
    matrix_comparison: Optional[MatrixComparisonResult] = None
    insights: List[ComparisonInsight]


# =============================================================================
# PHASE 24 SCHEMAS: INTERACTIVE MATHEMATICS EXPLORER
# =============================================================================

class AdHocMathRequest(BaseModel):
    matrix: List[List[int]] = Field(..., description="Square binary matrix where 1 = forbidden, 0 = allowed")
    include_sample_allocations: bool = Field(default=False, description="Whether to compute sample valid allocations")
    max_sample_allocations: int = Field(default=5, ge=1, le=50, description="Max allocations to return")


class AdHocMathResponse(BaseModel):
    matrix_size: int
    forbidden_cell_count: int
    restriction_density: float
    rook_coefficients: List[int]
    polynomial: str
    factorial_terms: List[int]
    inclusion_exclusion_terms: List[InclusionExclusionTerm]
    total_possible_assignments: int
    valid_assignments: int
    invalid_assignments: int
    feasibility_percentage: float
    calculation_steps: List[str]
    rook_details: List[RookCoefficientDetail]
    sample_allocations: List[List[Dict[str, str]]] = Field(default_factory=list)


class PermutationExplorationResponse(BaseModel):
    n: int
    factorial: int
    formula: str
    growth_table: List[Dict[str, Any]]
    sample_permutations: List[List[int]]






