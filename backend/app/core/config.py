from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "serviceiq"

    # JWT
    JWT_SECRET: str = "serviceiq-dev-secret-key-2024-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440  # 24 hours

    # App
    COMPANY_NAME: str = "ServiceIQ"
    API_V1_PREFIX: str = "/api/v1"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
