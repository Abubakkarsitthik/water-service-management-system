from fastapi import APIRouter, Depends, HTTPException, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user, get_current_admin
from app.schemas.reminder import ReminderCreate, ReminderTemplateCreate
from bson import ObjectId
from datetime import datetime, timezone
from urllib.parse import quote
import math

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/list", response_model=dict)
async def list_reminders(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    total = await db.reminders.count_documents({})
    skip = (page - 1) * limit

    cursor = db.reminders.find().sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for reminder in cursor:
        item = {
            "id": str(reminder["_id"]),
            "customer_id": reminder.get("customer_id", ""),
            "message": reminder.get("message", ""),
            "reminder_type": reminder.get("reminder_type", ""),
            "channel": reminder.get("channel", ""),
            "status": reminder.get("status", ""),
            "created_at": reminder.get("created_at", ""),
        }
        # Get customer name
        if reminder.get("customer_id") and ObjectId.is_valid(reminder["customer_id"]):
            customer = await db.customers.find_one(
                {"_id": ObjectId(reminder["customer_id"])}, {"name": 1}
            )
            item["customer_name"] = customer["name"] if customer else "Unknown"
        items.append(item)

    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0,
    }


@router.post("/generate-whatsapp-link", response_model=dict)
async def generate_whatsapp_link(
    customer_id: str = Query(...),
    template_id: str = Query(None),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=400, detail="Invalid customer ID")

    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Get company settings
    settings = await db.settings.find_one({})
    company_name = settings.get("company_name", "ServiceIQ") if settings else "ServiceIQ"

    # Get service info
    service_type_name = ""
    due_date = ""
    if customer.get("installation") and customer["installation"].get("service_type"):
        service_type_name = customer["installation"]["service_type"]

    # Get next due service
    latest_service = await db.services.find_one(
        {
            "customer_id": str(customer["_id"]),
            "status": {"$nin": ["completed", "cancelled"]},
        },
        sort=[("service_date", 1)],
    )
    if latest_service:
        due_date = latest_service.get("service_date", "")
        if latest_service.get("service_type_id") and ObjectId.is_valid(
            latest_service["service_type_id"]
        ):
            stype = await db.service_types.find_one(
                {"_id": ObjectId(latest_service["service_type_id"])}, {"name": 1}
            )
            if stype:
                service_type_name = stype["name"]

    # Build message from template or default
    message = ""
    if template_id and ObjectId.is_valid(template_id):
        template = await db.reminder_templates.find_one(
            {"_id": ObjectId(template_id)}
        )
        if template:
            message = template["template"]
    
    if not message:
        message = (
            f"Dear {customer['name']},\n\n"
            f"This is a reminder from {company_name}.\n"
            f"Your {service_type_name} service is due"
        )
        if due_date:
            message += f" on {due_date}"
        message += (
            f".\n\nPlease contact us to schedule your service.\n\n"
            f"Thank you,\n{company_name}"
        )

    # Replace template variables
    message = message.replace("{{customer_name}}", customer["name"])
    message = message.replace("{{service_type}}", service_type_name)
    message = message.replace("{{due_date}}", due_date)
    message = message.replace("{{company_name}}", company_name)

    # Format phone number
    phone = customer["mobile"].replace("+", "").replace(" ", "").replace("-", "")
    if not phone.startswith("91") and len(phone) == 10:
        phone = "91" + phone

    # Generate WhatsApp deep link
    whatsapp_url = f"https://wa.me/{phone}?text={quote(message)}"

    # Log reminder
    reminder_doc = {
        "customer_id": str(customer["_id"]),
        "message": message,
        "reminder_type": "upcoming",
        "channel": "whatsapp",
        "status": "generated",
        "whatsapp_url": whatsapp_url,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reminders.insert_one(reminder_doc)

    return {
        "whatsapp_url": whatsapp_url,
        "message": message,
        "customer_name": customer["name"],
        "phone": phone,
    }


# --- Reminder Templates ---

@router.get("/templates", response_model=dict)
async def list_templates(
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    cursor = db.reminder_templates.find().sort("created_at", -1)
    items = []
    async for tmpl in cursor:
        items.append(
            {
                "id": str(tmpl["_id"]),
                "name": tmpl.get("name", ""),
                "template": tmpl.get("template", ""),
                "description": tmpl.get("description"),
                "created_at": tmpl.get("created_at"),
            }
        )
    return {"data": items, "total": len(items)}


@router.post("/templates/create", response_model=dict)
async def create_template(
    template: ReminderTemplateCreate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    doc = {
        "name": template.name,
        "template": template.template,
        "description": template.description,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.reminder_templates.insert_one(doc)
    return {
        "message": "Template created successfully",
        "id": str(result.inserted_id),
    }


@router.put("/templates/update/{template_id}", response_model=dict)
async def update_template(
    template_id: str,
    template: ReminderTemplateCreate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template ID")

    result = await db.reminder_templates.update_one(
        {"_id": ObjectId(template_id)},
        {
            "$set": {
                "name": template.name,
                "template": template.template,
                "description": template.description,
            }
        },
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")

    return {"message": "Template updated successfully"}


@router.delete("/templates/delete/{template_id}", response_model=dict)
async def delete_template(
    template_id: str,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template ID")

    result = await db.reminder_templates.delete_one({"_id": ObjectId(template_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")

    return {"message": "Template deleted successfully"}
