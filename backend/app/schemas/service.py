from pydantic import BaseModel, Field
from typing import Optional


class ServiceCreate(BaseModel):
    customer_id: str = Field(...)
    service_type_id: str = Field(...)
    technician_id: Optional[str] = None
    service_date: str = Field(...)
    next_due_date: Optional[str] = None
    status: str = Field(default="pending")
    notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "60d5f484f1a2c8b1f8e4e1a1",
                "service_type_id": "60d5f484f1a2c8b1f8e4e1a2",
                "service_date": "2024-03-15",
                "status": "pending",
            }
        }


class ServiceUpdate(BaseModel):
    technician_id: Optional[str] = None
    service_date: Optional[str] = None
    next_due_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ServiceComplete(BaseModel):
    notes: Optional[str] = None
    completed_date: Optional[str] = None


class ServiceResponse(BaseModel):
    id: str
    service_id: str
    customer_id: str
    customer_name: Optional[str] = None
    service_type_id: str
    service_type_name: Optional[str] = None
    technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    service_date: str
    next_due_date: Optional[str] = None
    status: str
    notes: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None
