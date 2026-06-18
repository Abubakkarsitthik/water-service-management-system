from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection, is_db_available
from app.routes import auth, customers, service_types, services, technicians, dashboard, reminders, reports, settings as settings_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting ServiceIQ API...")
    logger.info(f"   API Prefix: {settings.API_V1_PREFIX}")
    logger.info(f"   MongoDB URL: {settings.MONGODB_URL}")
    logger.info(f"   DB Name: {settings.DB_NAME}")
    await connect_to_mongo()
    if is_db_available():
        logger.info("✅ All systems ready.")
    else:
        logger.warning("⚠️  Started in degraded mode — MongoDB not available.")
    yield
    # Shutdown
    await close_mongo_connection()
    logger.info("👋 ServiceIQ API shut down.")


app = FastAPI(
    title="ServiceIQ API",
    description="AI-Powered Multi-Service Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
prefix = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=prefix)
app.include_router(customers.router, prefix=prefix)
app.include_router(service_types.router, prefix=prefix)
app.include_router(services.router, prefix=prefix)
app.include_router(technicians.router, prefix=prefix)
app.include_router(dashboard.router, prefix=prefix)
app.include_router(reminders.router, prefix=prefix)
app.include_router(reports.router, prefix=prefix)
app.include_router(settings_routes.router, prefix=prefix)


@app.get("/")
async def root():
    return {
        "message": "ServiceIQ API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint — always returns ok, reports DB status separately."""
    return {
        "status": "ok",
        "database": "connected" if is_db_available() else "unavailable",
    }
