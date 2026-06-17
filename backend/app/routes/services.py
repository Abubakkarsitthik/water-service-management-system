from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user, get_current_admin
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceComplete
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import math

router = APIRouter(prefix="/services", tags=["Services"])


async def enrich_service(db, service: dict) -> dict:
    """Enrich service document with customer, service type, and technician names."""
    result = {
        "id": str(service["_id"]),
        "service_id": service.get("service_id", ""),
        "customer_id": service.get("customer_id", ""),
        "service_type_id": service.get("service_type_id", ""),
        "technician_id": service.get("technician_id"),
        "service_date": service.get("service_date", ""),
        "next_due_date": service.get("next_due_date"),
        "status": service.get("status", "pending"),
        "notes": service.get("notes"),
        "completed_at": service.get("completed_at"),
        "created_at": service.get("created_at"),
    }

    # Enrich with names
    if service.get("customer_id") and ObjectId.is_valid(service["customer_id"]):
        customer = await db.customers.find_one(
            {"_id": ObjectId(service["customer_id"])}, {"name": 1}
        )
        result["customer_name"] = customer["name"] if customer else "Unknown"

    if service.get("service_type_id") and ObjectId.is_valid(service["service_type_id"]):
        stype = await db.service_types.find_one(
            {"_id": ObjectId(service["service_type_id"])}, {"name": 1}
        )
        result["service_type_name"] = stype["name"] if stype else "Unknown"

    if service.get("technician_id") and ObjectId.is_valid(service["technician_id"]):
        tech = await db.technicians.find_one(
            {"_id": ObjectId(service["technician_id"])}, {"name": 1}
        )
        result["technician_name"] = tech["name"] if tech else "Unassigned"

    return result


@router.post("/create", response_model=dict)
async def create_service(
    service: ServiceCreate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    # Validate customer exists
    if not ObjectId.is_valid(service.customer_id):
        raise HTTPException(status_code=400, detail="Invalid customer ID")
    customer = await db.customers.find_one({"_id": ObjectId(service.customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Validate service type exists
    if not ObjectId.is_valid(service.service_type_id):
        raise HTTPException(status_code=400, detail="Invalid service type ID")
    service_type = await db.service_types.find_one(
        {"_id": ObjectId(service.service_type_id)}
    )
    if not service_type:
        raise HTTPException(status_code=404, detail="Service type not found")

    # Calculate next due date if not provided
    next_due_date = service.next_due_date
    if not next_due_date:
        try:
            svc_date = datetime.strptime(service.service_date, "%Y-%m-%d")
            interval = service_type.get("default_interval_days", 90)
            next_due = svc_date + timedelta(days=interval)
            next_due_date = next_due.strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Generate service ID
    count = await db.services.count_documents({})
    service_id = f"SVC-{count + 1:05d}"

    # Set status based on technician assignment
    svc_status = service.status
    if service.technician_id and svc_status == "pending":
        svc_status = "assigned"

    service_doc = {
        "service_id": service_id,
        "customer_id": service.customer_id,
        "service_type_id": service.service_type_id,
        "technician_id": service.technician_id,
        "service_date": service.service_date,
        "next_due_date": next_due_date,
        "status": svc_status,
        "notes": service.notes,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.services.insert_one(service_doc)

    return {
        "message": "Service created successfully",
        "service_id": service_id,
        "id": str(result.inserted_id),
    }


@router.get("/list", response_model=dict)
async def list_services(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    status_filter: str = Query(None, alias="status"),
    technician_id: str = Query(None),
    customer_id: str = Query(None),
    service_type_id: str = Query(None),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    query = {}

    # Technician role: only see assigned services
    if current_user.get("role") == "technician":
        # Find technician record by email
        tech = await db.technicians.find_one({"email": current_user["email"]})
        if tech:
            query["technician_id"] = str(tech["_id"])

    if search:
        query["$or"] = [
            {"service_id": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}},
        ]

    if status_filter:
        query["status"] = status_filter

    if technician_id:
        query["technician_id"] = technician_id

    if customer_id:
        query["customer_id"] = customer_id

    if service_type_id:
        query["service_type_id"] = service_type_id

    total = await db.services.count_documents(query)
    skip = (page - 1) * limit

    cursor = db.services.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for service in cursor:
        enriched = await enrich_service(db, service)
        items.append(enriched)

    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0,
    }


@router.put("/update/{service_id}", response_model=dict)
async def update_service(
    service_id: str,
    update_data: ServiceUpdate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=400, detail="Invalid service ID")

    update_dict = {
        k: v for k, v in update_data.model_dump().items() if v is not None
    }

    # If assigning technician and status is pending, set to assigned
    if "technician_id" in update_dict:
        existing = await db.services.find_one({"_id": ObjectId(service_id)})
        if existing and existing.get("status") == "pending":
            update_dict["status"] = "assigned"

    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.services.update_one(
        {"_id": ObjectId(service_id)}, {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")

    return {"message": "Service updated successfully"}


@router.patch("/complete/{service_id}", response_model=dict)
async def complete_service(
    service_id: str,
    complete_data: ServiceComplete,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(service_id):
        raise HTTPException(status_code=400, detail="Invalid service ID")

    service = await db.services.find_one({"_id": ObjectId(service_id)})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    completed_date = complete_data.completed_date or datetime.now(timezone.utc).strftime(
        "%Y-%m-%d"
    )

    # Update service status
    await db.services.update_one(
        {"_id": ObjectId(service_id)},
        {
            "$set": {
                "status": "completed",
                "completed_at": completed_date,
                "notes": complete_data.notes or service.get("notes"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    # Create service history record
    history_doc = {
        "service_id": str(service["_id"]),
        "customer_id": service["customer_id"],
        "service_type_id": service["service_type_id"],
        "technician_id": service.get("technician_id"),
        "service_date": service["service_date"],
        "completed_date": completed_date,
        "notes": complete_data.notes or service.get("notes"),
        "status": "completed",
        "next_due_date": service.get("next_due_date"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.service_history.insert_one(history_doc)

    # Auto-calculate next due date and create next service
    if service.get("service_type_id") and ObjectId.is_valid(service["service_type_id"]):
        stype = await db.service_types.find_one(
            {"_id": ObjectId(service["service_type_id"])}
        )
        if stype:
            interval = stype.get("default_interval_days", 90)
            try:
                comp_date = datetime.strptime(completed_date, "%Y-%m-%d")
                next_due = comp_date + timedelta(days=interval)
                next_due_str = next_due.strftime("%Y-%m-%d")

                # Update next due date on the completed service
                await db.services.update_one(
                    {"_id": ObjectId(service_id)},
                    {"$set": {"next_due_date": next_due_str}},
                )
            except ValueError:
                pass

    return {"message": "Service completed successfully"}


@router.get("/history/{customer_id}", response_model=dict)
async def get_service_history(
    customer_id: str,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    query = {"customer_id": customer_id}

    cursor = db.service_history.find(query).sort("completed_date", -1)
    items = []
    async for record in cursor:
        record["id"] = str(record["_id"])
        del record["_id"]
        items.append(record)

    return {"data": items, "total": len(items)}
