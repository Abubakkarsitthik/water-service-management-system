from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user
from app.schemas.service_type import (
    ServiceTypeCreate,
    ServiceTypeUpdate,
    ServiceTypeResponse,
)
from bson import ObjectId
from datetime import datetime, timezone
import math

router = APIRouter(prefix="/service-types", tags=["Service Types"])


def format_service_type(st: dict) -> dict:
    interval_days = st.get("default_interval_days", 90)
    interval_months = st.get("reminder_interval_months", round(interval_days / 30))
    return {
        "id": str(st["_id"]),
        "name": st.get("name", ""),
        "description": st.get("description"),
        "default_interval_days": interval_days,
        "reminder_interval_months": interval_months,
        "status": st.get("status", "active"),
        "created_at": st.get("created_at"),
    }


@router.post("/create", response_model=dict)
async def create_service_type(
    service_type: ServiceTypeCreate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    # Check for duplicate name
    existing = await db.service_types.find_one(
        {"name": {"$regex": f"^{service_type.name}$", "$options": "i"}}
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Service type with this name already exists"
        )

    # Derive reminder_interval_months from default_interval_days
    reminder_months = service_type.reminder_interval_months or round(service_type.default_interval_days / 30)
    doc = {
        "name": service_type.name,
        "description": service_type.description,
        "default_interval_days": service_type.default_interval_days,
        "reminder_interval_months": reminder_months,
        "status": service_type.status,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.service_types.insert_one(doc)
    return {
        "message": "Service type created successfully",
        "id": str(result.inserted_id),
    }


@router.get("/list", response_model=dict)
async def list_service_types(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: str = Query(None),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    query = {}
    if status:
        query["status"] = status

    total = await db.service_types.count_documents(query)
    skip = (page - 1) * limit

    cursor = db.service_types.find(query).sort("name", 1).skip(skip).limit(limit)
    items = []
    async for item in cursor:
        items.append(format_service_type(item))

    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0,
    }


@router.put("/update/{service_type_id}", response_model=dict)
async def update_service_type(
    service_type_id: str,
    update_data: ServiceTypeUpdate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(service_type_id):
        raise HTTPException(status_code=400, detail="Invalid service type ID")

    update_dict = {
        k: v for k, v in update_data.model_dump().items() if v is not None
    }

    # Keep reminder_interval_months and default_interval_days in sync
    if "reminder_interval_months" in update_dict and "default_interval_days" not in update_dict:
        update_dict["default_interval_days"] = update_dict["reminder_interval_months"] * 30
    elif "default_interval_days" in update_dict and "reminder_interval_months" not in update_dict:
        update_dict["reminder_interval_months"] = round(update_dict["default_interval_days"] / 30)

    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.service_types.update_one(
        {"_id": ObjectId(service_type_id)}, {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service type not found")

    return {"message": "Service type updated successfully"}


@router.delete("/delete/{service_type_id}", response_model=dict)
async def delete_service_type(
    service_type_id: str,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(service_type_id):
        raise HTTPException(status_code=400, detail="Invalid service type ID")

    result = await db.service_types.delete_one({"_id": ObjectId(service_type_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service type not found")

    return {"message": "Service type deleted successfully"}
