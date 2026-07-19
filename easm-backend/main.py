"""
FastAPI application — SurfaceIQ EASM Backend
"""

from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load .env file into environment variables
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials

from config import get_settings
from routers import targets, scans, findings, assets


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise Firebase Admin SDK on startup."""
    settings = get_settings()
    if not firebase_admin._apps:
        # Uses GOOGLE_APPLICATION_CREDENTIALS env var if set,
        # otherwise Application Default Credentials
        try:
            cred = credentials.ApplicationDefault()
        except Exception:
            cred = None
        firebase_admin.initialize_app(
            cred,
            {"projectId": settings.firebase_project_id},
        )
    yield


app = FastAPI(
    title="SurfaceIQ API",
    description="External Attack Surface Management backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(targets.router)
app.include_router(scans.router)
app.include_router(findings.router)
app.include_router(assets.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SurfaceIQ API"}
