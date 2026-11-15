"""
GateWise — Main FastAPI Application.

Intelligent Airport Gate Allocation Using Discrete Mathematics.
Layered architecture: Core, Database, Models, Schemas, Services, Routes.
"""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import GateWiseException
from app.database.connection import init_db
from app.routes import health
from app.routes.api_v1 import api_v1_router


def create_app() -> FastAPI:
    """Create, configure, and return the FastAPI application instance."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=settings.APP_DESCRIPTION,
        debug=settings.DEBUG,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )

    # 1. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Global Exception Handlers
    @app.exception_handler(GateWiseException)
    async def gatewise_exception_handler(request: Request, exc: GateWiseException):
        logger.warning(f"Domain Exception on {request.url.path}: {exc.message}")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": exc.__class__.__name__,
                    "message": exc.message,
                    "details": exc.details
                }
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation Error on {request.url.path}: {exc.errors()}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": exc.errors()
                }
            }
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail
                }
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled Exception on {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected server error occurred."
                }
            }
        )

    # 3. Database Table Initialization
    init_db()

    # 4. Route Registration
    # Root Health Check endpoint (/api/health)
    app.include_router(health.router, prefix=settings.API_PREFIX)

    # Versioned API v1 Router (/api/v1/...)
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    logger.info(f"Initialized {settings.APP_NAME} v{settings.APP_VERSION} (API v1)")
    return app


app = create_app()
