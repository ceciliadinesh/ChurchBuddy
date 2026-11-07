
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    lectors,
    availability,
    monthly_forms,
    frozen_dates,
    mass_slots,
    assignments,
    auth,
    google_forms,
)
app = FastAPI(
    title="Church Lector Management System",
    description="API for managing lectors, monthly availability and Mass schedules.",
    version="1.0.0"
)

# CORS middleware - allows the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Church Lector Management System API is running."}


# Register API routers
app.include_router(lectors.router)
app.include_router(availability.router)
app.include_router(monthly_forms.router)
app.include_router(frozen_dates.router)
app.include_router(mass_slots.router)
app.include_router(assignments.router)
app.include_router(auth.router)
app.include_router(google_forms.router)