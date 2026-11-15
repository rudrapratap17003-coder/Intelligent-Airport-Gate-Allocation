"""
GateWise — Health check endpoint.
"""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
def health_check():
    """Return the health status of the API."""
    return {
        "status": "healthy",
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
    }
