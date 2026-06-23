from pydantic import BaseModel, Field, model_validator
from typing import Optional


class ServiceTypeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    default_interval_days: int = Field(default=90, ge=1, le=1825)
    reminder_interval_months: Optional[int] = Field(default=None, ge=1, le=60)
    status: str = Field(default="active")

    @model_validator(mode="after")
    def sync_interval(self):
        """Ensure reminder_interval_months and default_interval_days are always set."""
        if self.reminder_interval_months and not self.default_interval_days:
            self.default_interval_days = self.reminder_interval_months * 30
        elif self.default_interval_days and not self.reminder_interval_months:
            self.reminder_interval_months = round(self.default_interval_days / 30)
        return self


class ServiceTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_interval_days: Optional[int] = None
    reminder_interval_months: Optional[int] = Field(default=None, ge=1, le=60)
    status: Optional[str] = None


class ServiceTypeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    default_interval_days: int
    reminder_interval_months: Optional[int] = None
    status: str
    created_at: Optional[str] = None
