from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user, get_current_admin
from app.schemas.technician import TechnicianCreate, TechnicianUpdate
from bson import ObjectId
from datetime import datetime, timezone
import math

router = APIRouter(prefix="/technicians", tags=["Technicians"])


def format_technician(tech: dict) -> dict:
    return {
        "id": str(tech["_id"]),
        "name": tech.get("name", ""),
        "phone": tech.get("phone", ""),
        "email": tech.get("email"),
        "address": tech.get("address"),
        "status": tech.get("status", "active"),
        "created_at": tech.get("created_at"),
    }


@router.post("/create", response_model=dict)
async def create_technician(
    technician: TechnicianCreate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    # Check for duplicate email
    if technician.email:
        existing = await db.technicians.find_one({"email": technician.email})
        if existing:
            raise HTTPException(
                status_code=400, detail="Technician with this email already exists"
            )

    doc = {
        "name": technician.name,
        "phone": technician.phone,
        "email": technician.email,
        "address": technician.address,
        "status": technician.status,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.technicians.insert_one(doc)
    return {
        "message": "Technician created successfully",
        "id": str(result.inserted_id),
    }


@router.get("/list", response_model=dict)
async def list_technicians(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    status: str = Query(None),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    query = {}

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    if status:
        query["status"] = status

    total = await db.technicians.count_documents(query)
    skip = (page - 1) * limit

    cursor = db.technicians.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for tech in cursor:
        formatted = format_technician(tech)
        # Count completed services
        completed = await db.services.count_documents(
            {"technician_id": str(tech["_id"]), "status": "completed"}
        )
        formatted["completed_services"] = completed

        # Count assigned services
        assigned = await db.services.count_documents(
            {
                "technician_id": str(tech["_id"]),
                "status": {"$in": ["assigned", "in_progress"]},
            }
        )
        formatted["active_services"] = assigned
        items.append(formatted)

    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0,
    }


@router.put("/update/{technician_id}", response_model=dict)
async def update_technician(
    technician_id: str,
    update_data: TechnicianUpdate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    if not ObjectId.is_valid(technician_id):
        raise HTTPException(status_code=400, detail="Invalid technician ID")

    update_dict = {
        k: v for k, v in update_data.model_dump().items() if v is not None
    }
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.technicians.update_one(
        {"_id": ObjectId(technician_id)}, {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Technician not found")

    return {"message": "Technician updated successfully"}


@router.delete("/delete/{technician_id}", response_model=dict)
async def delete_technician(
    technician_id: str,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    if not ObjectId.is_valid(technician_id):
        raise HTTPException(status_code=400, detail="Invalid technician ID")

    result = await db.technicians.delete_one({"_id": ObjectId(technician_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Technician not found")

    return {"message": "Technician deleted successfully"}


@router.get("/{technician_id}/services", response_model=dict)
async def get_technician_services(
    technician_id: str,
    status_filter: str = Query(None, alias="status"),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(technician_id):
        raise HTTPException(status_code=400, detail="Invalid technician ID")

    query = {"technician_id": technician_id}
    if status_filter:
        query["status"] = status_filter

    cursor = db.services.find(query).sort("service_date", -1)
    items = []
    async for service in cursor:
        service["id"] = str(service["_id"])
        # Get customer name
        if service.get("customer_id") and ObjectId.is_valid(service["customer_id"]):
            customer = await db.customers.find_one(
                {"_id": ObjectId(service["customer_id"])}, {"name": 1}
            )
            service["customer_name"] = customer["name"] if customer else "Unknown"
        del service["_id"]
        items.append(service)

    return {"data": items, "total": len(items)}
