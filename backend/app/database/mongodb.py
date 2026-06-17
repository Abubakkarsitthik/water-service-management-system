from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None


async def connect_to_mongo():
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.customers.create_index("mobile")
    await db.customers.create_index("city")
    await db.service_types.create_index("name", unique=True)
    await db.services.create_index("status")
    await db.services.create_index("service_date")
    await db.services.create_index("customer_id")
    await db.technicians.create_index("email", unique=True)

    print("✅ Connected to MongoDB")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("❌ Disconnected from MongoDB")


async def get_database():
    return client[settings.DB_NAME]
