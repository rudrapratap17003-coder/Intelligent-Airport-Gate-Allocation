"""
GateWise — Domain & API Exceptions.
"""

from typing import Any, Optional


class GateWiseException(Exception):
    """Base domain exception for GateWise."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.details = details


class EntityNotFoundException(GateWiseException):
    """Raised when an entity is not found in database/registry."""
    pass


class InvalidMatrixException(GateWiseException):
    """Raised when restriction matrix dimensions or values violate mathematical rules."""
    pass


class DuplicateEntityException(GateWiseException):
    """Raised when attempting to create a flight or gate with an existing identifier."""
    pass
