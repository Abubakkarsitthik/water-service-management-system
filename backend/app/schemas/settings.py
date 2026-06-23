from pydantic import BaseModel, Field
from typing import Optional


class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None


class SettingsResponse(BaseModel):
    id: str
    company_name: str
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
