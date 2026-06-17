from fastapi import APIRouter, Depends, HTTPException
from app.database.mongodb import get_database
from app.core.security import get_current_user, get_current_admin
from app.schemas.settings import SettingsUpdate
from datetime import datetime, timezone

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/", response_model=dict)
async def get_settings(
    db=Depends(get_database),
    current_user: dict = Depends(get_current_user),
):
    settings = await db.settings.find_one({})
    if not settings:
        # Create default settings
        default = {
            "company_name": "ServiceIQ",
            "contact_number": "",
            "email": "",
            "address": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.settings.insert_one(default)
        default["id"] = str(result.inserted_id)
        return default

    settings["id"] = str(settings["_id"])
    del settings["_id"]
    return settings


@router.put("/update", response_model=dict)
async def update_settings(
    update_data: SettingsUpdate,
    db=Depends(get_database),
    current_user: dict = Depends(get_current_admin),
):
    update_dict = {
        k: v for k, v in update_data.model_dump().items() if v is not None
    }
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    settings = await db.settings.find_one({})
    if not settings:
        update_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.settings.insert_one(update_dict)
    else:
        await db.settings.update_one({"_id": settings["_id"]}, {"$set": update_dict})

    return {"message": "Settings updated successfully"}
