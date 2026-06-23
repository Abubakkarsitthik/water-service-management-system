from fastapi import APIRouter, Depends, HTTPException, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user, get_current_admin
from app.schemas.reminder import ReminderTemplateCreate
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
import math

router = APIRouter(prefix="/reminders", tags=["Reminders"])


def format_phone(phone: str) -> str:
    """Normalize phone number for WhatsApp (add country code 91 for Indian numbers)."""
    phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    if not phone.startswith("91") and len(phone) == 10:
        phone = "91" + phone
    return phone


@router.get("/due", response_model=dict)
async def get_due_customers(
    filter: str = Query("all", regex="^(all|today|week|month)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    """Return customers due for a reminder based on next_reminder_date."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_end = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    month_end = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")

    if filter == "today":
        query = {"next_reminder_date": today}
    elif filter == "week":
        query = {"next_reminder_date": {"$gte": today, "$lte": week_end}}
    elif filter == "month":
        query = {"next_reminder_date": {"$gte": today, "$lte": month_end}}
    else:
        # All — overdue + upcoming 30 days
        query = {"next_reminder_date": {"$lte": month_end}}

    total = await db.customers.count_documents(query)
    skip = (page - 1) * limit

    cursor = db.customers.find(query).sort("next_reminder_date", 1).skip(skip).limit(limit)
    customers = []
    async for c in cursor:
        customers.append({
            "id": str(c["_id"]),
            "customer_id": c.get("customer_id", ""),
            "name": c.get("name", ""),
            "phone": c.get("phone", c.get("mobile", "")),
            "service_type": c.get("service_type", c.get("installation", {}).get("service_type", "") if c.get("installation") else ""),
            "next_reminder_date": c.get("next_reminder_date"),
            "address": c.get("address"),
        })

    return {
        "data": customers,
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

    # Company settings
    settings_doc = await db.settings.find_one({})
    company_name = settings_doc.get("company_name", "ServiceIQ") if settings_doc else "ServiceIQ"

    # Customer fields (support both old and new schema)
    customer_name = customer.get("name", "")
    service_type_name = customer.get("service_type", "")
    if not service_type_name and customer.get("installation"):
        service_type_name = customer["installation"].get("service_type", "")
    next_reminder_date = customer.get("next_reminder_date", "")

    # Build message
    if template_id and ObjectId.is_valid(template_id):
        template_doc = await db.reminder_templates.find_one({"_id": ObjectId(template_id)})
        if template_doc:
            message = template_doc["template"]
        else:
            message = ""
    else:
        message = ""

    if not message:
        message = (
            f"Dear {customer_name},\n\n"
            f"Your {service_type_name} service is due"
        )
        if next_reminder_date:
            message += f" on {next_reminder_date}"
        message += (
            f".\n\nPlease contact us to schedule your maintenance.\n\n"
            f"Thank you,\n{company_name}"
        )

    # Replace template variables
    message = message.replace("{{customer_name}}", customer_name)
    message = message.replace("{{service_type}}", service_type_name)
    message = message.replace("{{due_date}}", next_reminder_date)
    message = message.replace("{{company_name}}", company_name)

    # Phone
    phone_raw = customer.get("phone", customer.get("mobile", ""))
    phone = format_phone(phone_raw)

    whatsapp_url = f"https://wa.me/{phone}?text={quote(message)}"

    # Log reminder
    reminder_doc = {
        "customer_id": str(customer["_id"]),
        "customer_name": customer_name,
        "message": message,
        "reminder_type": "upcoming",
        "channel": "whatsapp",
        "status": "sent",
        "whatsapp_url": whatsapp_url,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reminders.insert_one(reminder_doc)

    return {
        "whatsapp_url": whatsapp_url,
        "message": message,
        "customer_name": customer_name,
        "phone": phone,
    }


@router.get("/history", response_model=dict)
async def list_reminder_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    total = await db.reminders.count_documents({})
    skip = (page - 1) * limit

    cursor = db.reminders.find().sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for r in cursor:
        items.append({
            "id": str(r["_id"]),
            "customer_id": r.get("customer_id", ""),
            "customer_name": r.get("customer_name", ""),
            "message": r.get("message", ""),
            "channel": r.get("channel", "whatsapp"),
            "status": r.get("status", ""),
            "created_at": r.get("created_at", ""),
        })

    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0,
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
        items.append({
            "id": str(tmpl["_id"]),
            "name": tmpl.get("name", ""),
            "template": tmpl.get("template", ""),
            "description": tmpl.get("description"),
            "created_at": tmpl.get("created_at"),
        })
    return {"data": items, "total": len(items)}


@router.post("/templates/create", response_model=dict)
async def create_template(
    template: ReminderTemplateCreate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    doc = {
        "name": template.name,
        "template": template.template,
        "description": template.description,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.reminder_templates.insert_one(doc)
    return {"message": "Template created successfully", "id": str(result.inserted_id)}


@router.put("/templates/update/{template_id}", response_model=dict)
async def update_template(
    template_id: str,
    template: ReminderTemplateCreate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template ID")

    result = await db.reminder_templates.update_one(
        {"_id": ObjectId(template_id)},
        {"$set": {"name": template.name, "template": template.template, "description": template.description}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template updated successfully"}


@router.delete("/templates/delete/{template_id}", response_model=dict)
async def delete_template(
    template_id: str,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    if not ObjectId.is_valid(template_id):
        raise HTTPException(status_code=400, detail="Invalid template ID")

    result = await db.reminder_templates.delete_one({"_id": ObjectId(template_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}
