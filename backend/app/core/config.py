"""
GateWise Backend — Core configuration.
Centralized environment variables using Pydantic Settings.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    APP_NAME: str = "GateWise"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = (
        "Intelligent Airport Gate Allocation Using Discrete Mathematics"
    )
    DEBUG: bool = False

    # Database: Default to dedicated ./data directory
    DATABASE_URL: str = "sqlite:///./data/gatewise.db"

    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # API Routing
    API_PREFIX: str = "/api"
    API_V1_PREFIX: str = "/api/v1"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
