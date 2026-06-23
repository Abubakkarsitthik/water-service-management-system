from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    service_type: Optional[str] = None
    installation_date: Optional[str] = None
    next_reminder_date: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r"[^\d+]", "", v)
        if len(cleaned) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return cleaned


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    service_type: Optional[str] = None
    installation_date: Optional[str] = None
    next_reminder_date: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(BaseModel):
    id: str
    customer_id: str
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    service_type: Optional[str] = None
    installation_date: Optional[str] = None
    next_reminder_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
