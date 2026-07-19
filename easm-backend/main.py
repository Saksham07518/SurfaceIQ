"""
FastAPI application — SurfaceIQ EASM Backend
"""

from contextlib import asynccontextmanager
import os
import json
from dotenv import load_dotenv

# Load .env file into environment variables
load_dotenv()

from fastapi import FastAPI, Request
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
        cred = None
        # Try loading from JSON string (Vercel/Production environment)
        service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if service_account_json:
            try:
                cred_dict = json.loads(service_account_json)
                cred = credentials.Certificate(cred_dict)
            except Exception as e:
                print(f"Error loading credentials from JSON string: {e}")
        
        # Fallback to Application Default Credentials (Local development)
        if not cred:
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


@app.middleware("http")
async def strip_api_prefix(request: Request, call_next):
    path = request.scope.get("path", "")
    if path.startswith("/api"):
        new_path = path.removeprefix("/api")
        if not new_path:
            new_path = "/"
        request.scope["path"] = new_path
    response = await call_next(request)
    return response

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
