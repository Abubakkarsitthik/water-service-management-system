from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user, get_current_admin
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from bson import ObjectId
from datetime import datetime, timezone
import math

router = APIRouter(prefix="/customers", tags=["Customers"])


def format_customer(customer: dict) -> dict:
    return {
        "id": str(customer["_id"]),
        "customer_id": customer.get("customer_id", ""),
        "name": customer.get("name", ""),
        "mobile": customer.get("mobile", ""),
        "alternate_mobile": customer.get("alternate_mobile"),
        "email": customer.get("email"),
        "street": customer.get("street"),
        "area": customer.get("area"),
        "city": customer.get("city"),
        "state": customer.get("state"),
        "pincode": customer.get("pincode"),
        "installation": customer.get("installation"),
        "created_at": customer.get("created_at"),
        "updated_at": customer.get("updated_at"),
    }


@router.post("/create", response_model=dict)
async def create_customer(
    customer: CustomerCreate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    # Generate customer ID
    count = await db.customers.count_documents({})
    customer_id = f"CUS-{count + 1:05d}"

    customer_doc = {
        "customer_id": customer_id,
        "name": customer.name,
        "mobile": customer.mobile,
        "alternate_mobile": customer.alternate_mobile,
        "email": customer.email,
        "street": customer.street,
        "area": customer.area,
        "city": customer.city,
        "state": customer.state,
        "pincode": customer.pincode,
        "installation": customer.installation.model_dump() if customer.installation else None,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db.customers.insert_one(customer_doc)

    return {
        "message": "Customer created successfully",
        "customer_id": customer_id,
        "id": str(result.inserted_id),
    }


@router.get("/list", response_model=dict)
async def list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    service_type: str = Query(None),
    city: str = Query(None),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    query = {}

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"mobile": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"customer_id": {"$regex": search, "$options": "i"}},
        ]

    if service_type:
        query["installation.service_type"] = service_type

    if city:
        query["city"] = {"$regex": city, "$options": "i"}

    total = await db.customers.count_documents(query)
    skip = (page - 1) * limit

    customers_cursor = db.customers.find(query).sort("created_at", -1).skip(skip).limit(limit)
    customers = []
    async for customer in customers_cursor:
        customers.append(format_customer(customer))

    return {
        "data": customers,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0,
    }


@router.get("/details/{customer_id}", response_model=dict)
async def get_customer(
    customer_id: str,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    customer = None
    if ObjectId.is_valid(customer_id):
        customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        customer = await db.customers.find_one({"customer_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Get service history
    services = []
    services_cursor = db.services.find(
        {"customer_id": str(customer["_id"])}
    ).sort("service_date", -1).limit(20)
    async for service in services_cursor:
        service["id"] = str(service["_id"])
        service["_id"] = str(service["_id"])
        services.append(service)

    result = format_customer(customer)
    result["services"] = services
    return result


@router.put("/update/{customer_id}", response_model=dict)
async def update_customer(
    customer_id: str,
    update_data: CustomerUpdate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=400, detail="Invalid customer ID")

    update_dict = {
        k: v for k, v in update_data.model_dump().items() if v is not None
    }

    if "installation" in update_dict and update_dict["installation"]:
        update_dict["installation"] = update_data.installation.model_dump()

    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.customers.update_one(
        {"_id": ObjectId(customer_id)}, {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")

    return {"message": "Customer updated successfully"}


@router.delete("/delete/{customer_id}", response_model=dict)
async def delete_customer(
    customer_id: str,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=400, detail="Invalid customer ID")

    result = await db.customers.delete_one({"_id": ObjectId(customer_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")

    return {"message": "Customer deleted successfully"}
