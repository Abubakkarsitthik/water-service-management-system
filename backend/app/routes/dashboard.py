from fastapi import APIRouter, Depends, Query
from app.database.mongodb import get_database
from app.core.security import get_current_user
from datetime import datetime, timezone, timedelta
import calendar

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=dict)
async def get_dashboard_stats(
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_end = (datetime.now(timezone.utc) + timedelta(days=6)).strftime("%Y-%m-%d")

    # Current calendar month end
    now = datetime.now(timezone.utc)
    last_day = calendar.monthrange(now.year, now.month)[1]
    month_end = now.replace(day=last_day).strftime("%Y-%m-%d")

    # Total customers
    total_customers = await db.customers.count_documents({})

    # Due today — next_reminder_date == today
    due_today = await db.customers.count_documents(
        {"next_reminder_date": today}
    )

    # Due this week — next_reminder_date from today to today+6
    due_this_week = await db.customers.count_documents(
        {"next_reminder_date": {"$gte": today, "$lte": week_end}}
    )

    # Due this month — next_reminder_date within this calendar month
    due_this_month = await db.customers.count_documents(
        {"next_reminder_date": {"$gte": today, "$lte": month_end}}
    )

    # Reminders sent (all logged reminders)
    reminders_sent = await db.reminders.count_documents({})

    # Recent 5 customers
    recent_customers = []
    cursor = db.customers.find().sort("created_at", -1).limit(5)
    async for c in cursor:
        recent_customers.append({
            "id": str(c["_id"]),
            "name": c.get("name", ""),
            "phone": c.get("phone", c.get("mobile", "")),
            "service_type": c.get("service_type", c.get("installation", {}).get("service_type", "") if c.get("installation") else ""),
            "next_reminder_date": c.get("next_reminder_date"),
            "created_at": c.get("created_at", ""),
        })

    return {
        "total_customers": total_customers,
        "due_today": due_today,
        "due_this_week": due_this_week,
        "due_this_month": due_this_month,
        "reminders_sent": reminders_sent,
        "recent_customers": recent_customers,
    }
