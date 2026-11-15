"""
GateWise API v1 — Mathematics Explorer Router.
Ad-hoc combinatorial evaluations for the Interactive Mathematics Explorer (Phase 24).
Provides real-time rook polynomial, PIE calculation, and permutation exploration on arbitrary matrices.
"""

import math
import itertools
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Path, Query, status

from app.schemas.api_schemas import (
    AdHocMathRequest,
    AdHocMathResponse,
    PermutationExplorationResponse,
    InclusionExclusionTerm,
    RookCoefficientDetail
)
from app.services.rook_polynomial_service import (
    validate_restriction_matrix,
    InvalidMatrixError
)
from app.services.inclusion_exclusion_service import InclusionExclusionService
from app.services.allocation_generator_service import (
    AllocationGeneratorService,
    AllocationGeneratorError
)

router = APIRouter(prefix="/math", tags=["Mathematics Explorer"])


@router.post(
    "/evaluate",
    response_model=AdHocMathResponse,
    summary="Ad-hoc combinatorial evaluation of any restriction matrix"
)
def evaluate_custom_matrix(payload: AdHocMathRequest):
    """Evaluate rook polynomial and inclusion-exclusion steps on an arbitrary square binary matrix."""
    matrix = payload.matrix
    try:
        n = validate_restriction_matrix(matrix)
    except InvalidMatrixError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid restriction matrix: {str(e)}"
        )

    if n > 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Matrix dimension {n}x{n} exceeds the explorer limit of 8x8."
        )

    # 1. Exact Inclusion-Exclusion calculation
    pie_result = InclusionExclusionService.calculate(matrix)

    # 2. Derive detailed rook coefficient meanings
    rook_coeffs = pie_result["rook_coefficients"]
    total_cells = n * n
    forbidden_count = pie_result["forbidden_cell_count"]
    density = round((forbidden_count / total_cells) * 100, 2) if total_cells > 0 else 0.0

    rook_details: List[RookCoefficientDetail] = []
    for k, coeff in enumerate(rook_coeffs):
        if k == 0:
            meaning = "1 trivial way to place 0 rooks (unrestricted board baseline)"
        elif k == 1:
            meaning = f"{coeff} forbidden cells available for 1 rook placement"
        else:
            meaning = f"{coeff} ways to place {k} non-attacking rooks on forbidden cells"
        rook_details.append(RookCoefficientDetail(k=k, coefficient=coeff, meaning=meaning))

    # 3. Formulate PIE terms
    pie_terms: List[InclusionExclusionTerm] = [
        InclusionExclusionTerm(**t) for t in pie_result["inclusion_exclusion_terms"]
    ]

    # 4. Optional sample allocations using Backtracking generator
    sample_allocations = []
    if payload.include_sample_allocations and pie_result["valid_assignments"] > 0:
        flight_ids = [f"Flight {i+1}" for i in range(n)]
        gate_ids = [f"Gate {j+1}" for j in range(n)]
        try:
            gen_res = AllocationGeneratorService.generate(
                matrix=matrix,
                flight_ids=flight_ids,
                gate_ids=gate_ids,
                max_results=payload.max_sample_allocations
            )
            sample_allocations = [
                a["assignments"] for a in gen_res["allocations"]
            ]
        except AllocationGeneratorError:
            sample_allocations = []

    return AdHocMathResponse(
        matrix_size=n,
        forbidden_cell_count=forbidden_count,
        restriction_density=density,
        rook_coefficients=rook_coeffs,
        polynomial=pie_result["polynomial"],
        factorial_terms=pie_result["factorial_terms"],
        inclusion_exclusion_terms=pie_terms,
        total_possible_assignments=pie_result["total_possible_assignments"],
        valid_assignments=pie_result["valid_assignments"],
        invalid_assignments=pie_result["invalid_assignments"],
        feasibility_percentage=pie_result["feasibility_percentage"],
        calculation_steps=pie_result["calculation_steps"],
        rook_details=rook_details,
        sample_allocations=sample_allocations
    )


@router.get(
    "/permutations/{n}",
    response_model=PermutationExplorationResponse,
    summary="Explore permutation growth and combinatorial enumeration"
)
def explore_permutations(
    n: int = Path(..., ge=1, le=8, description="Dimension / number of elements (1 to 8)"),
    max_samples: int = Query(default=24, ge=1, le=120, description="Max sample permutations to return")
):
    """Return factorial value, growth table up to n=8, and sample permutations for dimension n."""
    fact_n = math.factorial(n)
    formula = f"{n}! = " + " × ".join(str(i) for i in range(n, 0, -1)) + f" = {fact_n:,}"

    # Build reference growth table from 1 to 8
    growth_table = []
    for k in range(1, 9):
        val = math.factorial(k)
        growth_table.append({
            "n": k,
            "factorial": val,
            "scientific": f"{val:.2e}" if val >= 10000 else str(val),
            "ratio_to_previous": k if k > 1 else 1
        })

    # Generate up to max_samples permutations of [0, 1, ..., n-1]
    elements = list(range(n))
    all_perms = itertools.islice(itertools.permutations(elements), max_samples)
    sample_perms = [list(p) for p in all_perms]

    return PermutationExplorationResponse(
        n=n,
        factorial=fact_n,
        formula=formula,
        growth_table=growth_table,
        sample_permutations=sample_perms
    )
