from fastapi import APIRouter, Depends, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user
from datetime import datetime, timezone, timedelta
from bson import ObjectId

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=dict)
async def get_dashboard_stats(
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_end = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")

    # Total customers
    total_customers = await db.customers.count_documents({})

    # Active customers (have at least one non-completed service)
    active_pipeline = [
        {"$match": {"status": {"$in": ["pending", "assigned", "in_progress"]}}},
        {"$group": {"_id": "$customer_id"}},
        {"$count": "total"},
    ]
    active_result = await db.services.aggregate(active_pipeline).to_list(1)
    active_customers = active_result[0]["total"] if active_result else 0

    # Services due today
    due_today = await db.services.count_documents(
        {
            "service_date": today,
            "status": {"$nin": ["completed", "cancelled"]},
        }
    )

    # Services due this week
    due_this_week = await db.services.count_documents(
        {
            "service_date": {"$gte": today, "$lte": week_end},
            "status": {"$nin": ["completed", "cancelled"]},
        }
    )

    # Completed services
    completed_services = await db.services.count_documents({"status": "completed"})

    # Total technicians
    total_technicians = await db.technicians.count_documents({"status": "active"})

    # Pending services
    pending_services = await db.services.count_documents({"status": "pending"})

    # Overdue services (service_date < today and not completed)
    overdue_services = await db.services.count_documents(
        {
            "service_date": {"$lt": today},
            "status": {"$nin": ["completed", "cancelled"]},
        }
    )

    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "due_today": due_today,
        "due_this_week": due_this_week,
        "completed_services": completed_services,
        "total_technicians": total_technicians,
        "pending_services": pending_services,
        "overdue_services": overdue_services,
    }


@router.get("/charts", response_model=dict)
async def get_dashboard_charts(
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    # Monthly services trend (last 12 months)
    monthly_pipeline = [
        {
            "$addFields": {
                "month": {"$substr": ["$created_at", 0, 7]},
            }
        },
        {"$group": {"_id": "$month", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 12},
    ]
    monthly_data = await db.services.aggregate(monthly_pipeline).to_list(12)

    # Service type distribution
    type_pipeline = [
        {"$group": {"_id": "$service_type_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    type_data = await db.services.aggregate(type_pipeline).to_list(20)

    # Enrich service type names
    for item in type_data:
        if item["_id"] and ObjectId.is_valid(item["_id"]):
            stype = await db.service_types.find_one(
                {"_id": ObjectId(item["_id"])}, {"name": 1}
            )
            item["name"] = stype["name"] if stype else "Unknown"
        else:
            item["name"] = "Unknown"

    # Customer growth (last 12 months)
    customer_pipeline = [
        {
            "$addFields": {
                "month": {"$substr": ["$created_at", 0, 7]},
            }
        },
        {"$group": {"_id": "$month", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 12},
    ]
    customer_data = await db.customers.aggregate(customer_pipeline).to_list(12)

    # Completed vs Pending
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_data = await db.services.aggregate(status_pipeline).to_list(10)

    # Recent customers
    recent_customers = []
    cursor = db.customers.find().sort("created_at", -1).limit(5)
    async for c in cursor:
        recent_customers.append(
            {
                "id": str(c["_id"]),
                "name": c.get("name", ""),
                "mobile": c.get("mobile", ""),
                "city": c.get("city", ""),
                "created_at": c.get("created_at", ""),
            }
        )

    # Recent services
    recent_services = []
    cursor = db.services.find().sort("created_at", -1).limit(5)
    async for s in cursor:
        svc = {
            "id": str(s["_id"]),
            "service_id": s.get("service_id", ""),
            "status": s.get("status", ""),
            "service_date": s.get("service_date", ""),
        }
        if s.get("customer_id") and ObjectId.is_valid(s["customer_id"]):
            cust = await db.customers.find_one(
                {"_id": ObjectId(s["customer_id"])}, {"name": 1}
            )
            svc["customer_name"] = cust["name"] if cust else "Unknown"
        recent_services.append(svc)

    # Upcoming services
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming_services = []
    cursor = (
        db.services.find(
            {
                "service_date": {"$gte": today},
                "status": {"$nin": ["completed", "cancelled"]},
            }
        )
        .sort("service_date", 1)
        .limit(5)
    )
    async for s in cursor:
        svc = {
            "id": str(s["_id"]),
            "service_id": s.get("service_id", ""),
            "status": s.get("status", ""),
            "service_date": s.get("service_date", ""),
        }
        if s.get("customer_id") and ObjectId.is_valid(s["customer_id"]):
            cust = await db.customers.find_one(
                {"_id": ObjectId(s["customer_id"])}, {"name": 1}
            )
            svc["customer_name"] = cust["name"] if cust else "Unknown"
        upcoming_services.append(svc)

    return {
        "monthly_services": monthly_data,
        "service_type_distribution": type_data,
        "customer_growth": customer_data,
        "status_distribution": status_data,
        "recent_customers": recent_customers,
        "recent_services": recent_services,
        "upcoming_services": upcoming_services,
    }
