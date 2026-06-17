from pydantic import BaseModel, Field
from typing import Optional


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class SettingsResponse(BaseModel):
    id: str
    company_name: str
    contact_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
