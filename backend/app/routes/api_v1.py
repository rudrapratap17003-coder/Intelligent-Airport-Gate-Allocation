"""
GateWise API v1 Router Registration.
Consolidates all versioned endpoints under /api/v1.
"""

from fastapi import APIRouter
from app.routes import flights, gates, simulations, restrictions, allocations, dashboard, analytics, comparison, math_routes, export, blr

api_v1_router = APIRouter()

api_v1_router.include_router(flights.router)
api_v1_router.include_router(gates.router)
api_v1_router.include_router(simulations.router)
api_v1_router.include_router(restrictions.router)
api_v1_router.include_router(allocations.router)
api_v1_router.include_router(dashboard.router)
api_v1_router.include_router(analytics.router)
api_v1_router.include_router(comparison.router)
api_v1_router.include_router(math_routes.router)
api_v1_router.include_router(export.router)
api_v1_router.include_router(blr.router)
