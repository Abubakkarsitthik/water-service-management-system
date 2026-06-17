from pydantic import BaseModel, Field
from typing import Optional


class ReminderCreate(BaseModel):
    customer_id: str
    service_id: Optional[str] = None
    message: str
    reminder_type: str = "upcoming"  # upcoming, overdue
    channel: str = "whatsapp"


class ReminderResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    service_id: Optional[str] = None
    message: str
    reminder_type: str
    channel: str
    status: str
    created_at: Optional[str] = None


class ReminderTemplateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    template: str = Field(...)
    description: Optional[str] = None


class ReminderTemplateResponse(BaseModel):
    id: str
    name: str
    template: str
    description: Optional[str] = None
    created_at: Optional[str] = None
