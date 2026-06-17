from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from app.database.mongodb import get_database
from app.core.security import get_current_user, get_current_admin
from bson import ObjectId
from datetime import datetime, timezone
import csv
import io

router = APIRouter(prefix="/reports", tags=["Reports"])


async def get_customers_data(db, filters: dict = None):
    query = filters or {}
    cursor = db.customers.find(query).sort("created_at", -1)
    data = []
    async for c in cursor:
        data.append({
            "Customer ID": c.get("customer_id", ""),
            "Name": c.get("name", ""),
            "Mobile": c.get("mobile", ""),
            "Email": c.get("email", ""),
            "City": c.get("city", ""),
            "State": c.get("state", ""),
            "Service Type": c.get("installation", {}).get("service_type", "") if c.get("installation") else "",
            "Installation Date": c.get("installation", {}).get("installation_date", "") if c.get("installation") else "",
            "Created At": c.get("created_at", ""),
        })
    return data


async def get_services_data(db, filters: dict = None):
    query = filters or {}
    cursor = db.services.find(query).sort("created_at", -1)
    data = []
    async for s in cursor:
        customer_name = ""
        if s.get("customer_id") and ObjectId.is_valid(s["customer_id"]):
            cust = await db.customers.find_one(
                {"_id": ObjectId(s["customer_id"])}, {"name": 1}
            )
            customer_name = cust["name"] if cust else ""

        service_type_name = ""
        if s.get("service_type_id") and ObjectId.is_valid(s["service_type_id"]):
            stype = await db.service_types.find_one(
                {"_id": ObjectId(s["service_type_id"])}, {"name": 1}
            )
            service_type_name = stype["name"] if stype else ""

        technician_name = ""
        if s.get("technician_id") and ObjectId.is_valid(s["technician_id"]):
            tech = await db.technicians.find_one(
                {"_id": ObjectId(s["technician_id"])}, {"name": 1}
            )
            technician_name = tech["name"] if tech else ""

        data.append({
            "Service ID": s.get("service_id", ""),
            "Customer": customer_name,
            "Service Type": service_type_name,
            "Technician": technician_name,
            "Service Date": s.get("service_date", ""),
            "Next Due": s.get("next_due_date", ""),
            "Status": s.get("status", ""),
            "Notes": s.get("notes", ""),
            "Created At": s.get("created_at", ""),
        })
    return data


async def get_technicians_data(db):
    cursor = db.technicians.find().sort("created_at", -1)
    data = []
    async for t in cursor:
        completed = await db.services.count_documents(
            {"technician_id": str(t["_id"]), "status": "completed"}
        )
        assigned = await db.services.count_documents(
            {"technician_id": str(t["_id"]), "status": {"$in": ["assigned", "in_progress"]}}
        )
        data.append({
            "Name": t.get("name", ""),
            "Phone": t.get("phone", ""),
            "Email": t.get("email", ""),
            "Status": t.get("status", ""),
            "Completed Services": completed,
            "Active Services": assigned,
            "Created At": t.get("created_at", ""),
        })
    return data


def generate_csv(data: list[dict]) -> io.StringIO:
    if not data:
        output = io.StringIO()
        output.write("No data available")
        output.seek(0)
        return output

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    output.seek(0)
    return output


@router.get("/customers")
async def customer_report(
    format: str = Query("json", regex="^(json|csv)$"),
    service_type: str = Query(None),
    city: str = Query(None),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    filters = {}
    if service_type:
        filters["installation.service_type"] = service_type
    if city:
        filters["city"] = {"$regex": city, "$options": "i"}

    data = await get_customers_data(db, filters)

    if format == "csv":
        csv_data = generate_csv(data)
        return StreamingResponse(
            iter([csv_data.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=customers_report_{datetime.now().strftime('%Y%m%d')}.csv"
            },
        )

    return {"data": data, "total": len(data)}


@router.get("/services")
async def service_report(
    format: str = Query("json", regex="^(json|csv)$"),
    status_filter: str = Query(None, alias="status"),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    filters = {}
    if status_filter:
        filters["status"] = status_filter

    data = await get_services_data(db, filters)

    if format == "csv":
        csv_data = generate_csv(data)
        return StreamingResponse(
            iter([csv_data.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=services_report_{datetime.now().strftime('%Y%m%d')}.csv"
            },
        )

    return {"data": data, "total": len(data)}


@router.get("/technicians")
async def technician_report(
    format: str = Query("json", regex="^(json|csv)$"),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    data = await get_technicians_data(db)

    if format == "csv":
        csv_data = generate_csv(data)
        return StreamingResponse(
            iter([csv_data.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=technicians_report_{datetime.now().strftime('%Y%m%d')}.csv"
            },
        )

    return {"data": data, "total": len(data)}


@router.get("/due-services")
async def due_service_report(
    format: str = Query("json", regex="^(json|csv)$"),
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filters = {
        "status": {"$nin": ["completed", "cancelled"]},
    }

    data = await get_services_data(db, filters)

    if format == "csv":
        csv_data = generate_csv(data)
        return StreamingResponse(
            iter([csv_data.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=due_services_report_{datetime.now().strftime('%Y%m%d')}.csv"
            },
        )

    return {"data": data, "total": len(data)}
