"""
Services package initializer.
"""

from app.services.rook_polynomial_service import (
    RookPolynomialService,
    calculate_rook_polynomial,
    RookPolynomialError,
    InvalidMatrixError,
    validate_restriction_matrix,
    format_polynomial
)
from app.services.inclusion_exclusion_service import (
    InclusionExclusionService,
    calculate_valid_allocations
)
from app.services.allocation_generator_service import (
    AllocationGeneratorService,
    generate_allocations,
    AllocationGeneratorError
)
from app.services.conflict_detection_service import (
    ConflictDetectionService,
    detect_allocation_conflicts,
    ConflictDetectionError
)

__all__ = [
    "RookPolynomialService",
    "calculate_rook_polynomial",
    "RookPolynomialError",
    "InvalidMatrixError",
    "validate_restriction_matrix",
    "format_polynomial",
    "InclusionExclusionService",
    "calculate_valid_allocations",
    "AllocationGeneratorService",
    "generate_allocations",
    "AllocationGeneratorError",
    "ConflictDetectionService",
    "detect_allocation_conflicts",
    "ConflictDetectionError"
]
