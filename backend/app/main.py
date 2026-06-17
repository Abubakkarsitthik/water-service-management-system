from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.routes import auth, customers, service_types, services, technicians, dashboard, reminders, reports, settings as settings_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="ServiceIQ API",
    description="AI-Powered Multi-Service Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
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
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
