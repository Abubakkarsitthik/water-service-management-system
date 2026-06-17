from pydantic import BaseModel, Field
from typing import Optional, Any
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, _info=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _schema, handler):
        return {"type": "string"}


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)
    search: Optional[str] = None
    sort_by: Optional[str] = "created_at"
    sort_order: Optional[int] = -1


class PaginatedResponse(BaseModel):
    data: list[Any] = []
    total: int = 0
    page: int = 1
    limit: int = 10
    total_pages: int = 0


class MessageResponse(BaseModel):
    message: str
    success: bool = True
