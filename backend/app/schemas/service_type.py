from pydantic import BaseModel, Field
from typing import Optional


class ServiceTypeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    default_interval_days: int = Field(default=90, ge=1, le=365)
    status: str = Field(default="active")


class ServiceTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_interval_days: Optional[int] = None
    status: Optional[str] = None


class ServiceTypeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    default_interval_days: int
    status: str
    created_at: Optional[str] = None
