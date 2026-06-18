from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
_db_available = False


async def connect_to_mongo():
    global client, _db_available
    try:
        logger.info("🔄 Connecting to MongoDB...")
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
        # Verify connection works
        await client.admin.command("ping")
        db = client[settings.DB_NAME]

        # Create indexes (wrapped individually to avoid cascade failures)
        try:
            await db.users.create_index("email", unique=True)
        except Exception as e:
            logger.warning(f"Index creation warning (users.email): {e}")
        try:
            await db.customers.create_index("mobile")
            await db.customers.create_index("city")
        except Exception as e:
            logger.warning(f"Index creation warning (customers): {e}")
        try:
            await db.service_types.create_index("name", unique=True)
        except Exception as e:
            logger.warning(f"Index creation warning (service_types.name): {e}")
        try:
            await db.services.create_index("status")
            await db.services.create_index("service_date")
            await db.services.create_index("customer_id")
        except Exception as e:
            logger.warning(f"Index creation warning (services): {e}")
        try:
            await db.technicians.create_index("email", unique=True)
        except Exception as e:
            logger.warning(f"Index creation warning (technicians.email): {e}")

        # Mark DB as available BEFORE seeding (seed failure must not affect availability)
        _db_available = True
        logger.info("✅ Connected to MongoDB successfully")

    except Exception as e:
        _db_available = False
        logger.error(f"⚠️  MongoDB connection failed: {e}")
        logger.warning("⚠️  Application will start without database. Some features will be unavailable.")
        return  # Don't attempt seeding if connection failed

    # Seed default admin account — runs only when connection is successful
    # Wrapped in its own try/except so any seed error doesn't affect server startup
    try:
        await seed_default_admin(client[settings.DB_NAME])
    except Exception as e:
        logger.warning(f"⚠️  Default admin seeding failed (non-fatal): {e}")


async def seed_default_admin(db):
    """
    Creates the default admin account on first startup.
    If admin@serviceiq.com already exists, this is a no-op.

    Default credentials:
      Email:    admin@serviceiq.com
      Password: Admin@123
    """
    from app.core.security import hash_password
    from datetime import datetime, timezone

    ADMIN_EMAIL = "admin@serviceiq.com"
    ADMIN_PASSWORD = "Admin@123"

    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing:
        logger.info(f"ℹ️  Default admin already exists ({ADMIN_EMAIL}) — skipping seed.")
        return

    hashed = hash_password(ADMIN_PASSWORD)

    admin_doc = {
        "full_name": "Admin",
        "email": ADMIN_EMAIL,
        "mobile": "0000000000",
        "password": hashed,
        "role": "admin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.users.insert_one(admin_doc)
    logger.info(f"✅ Default admin created — Email: {ADMIN_EMAIL}  Password: {ADMIN_PASSWORD}")


async def close_mongo_connection():
    global client, _db_available
    if client:
        client.close()
        _db_available = False
        logger.info("🔌 Disconnected from MongoDB")


def is_db_available() -> bool:
    return _db_available


async def get_database():
    if client is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Database is unavailable. Please check MongoDB connection."
        )
    return client[settings.DB_NAME]
