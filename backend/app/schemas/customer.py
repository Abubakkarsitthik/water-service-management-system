from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import date
import re


class InstallationDetails(BaseModel):
    service_type: str
    installation_date: Optional[str] = None
    warranty_expiry: Optional[str] = None
    purchase_notes: Optional[str] = None


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    mobile: str = Field(..., min_length=10, max_length=15)
    alternate_mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    street: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    installation: Optional[InstallationDetails] = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v):
        cleaned = re.sub(r"[^\d+]", "", v)
        if len(cleaned) < 10:
            raise ValueError("Mobile number must have at least 10 digits")
        return cleaned


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    alternate_mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    street: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    installation: Optional[InstallationDetails] = None


class CustomerResponse(BaseModel):
    id: str
    customer_id: str
    name: str
    mobile: str
    alternate_mobile: Optional[str] = None
    email: Optional[str] = None
    street: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    installation: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
