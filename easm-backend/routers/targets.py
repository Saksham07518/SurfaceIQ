"""
Targets router — CRUD for monitored domains.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from firebase_admin import firestore
from google.cloud.firestore_v1 import FieldFilter
import re
from datetime import datetime, timezone

from auth import get_current_user

router = APIRouter(prefix="/targets", tags=["targets"])


class TargetCreate(BaseModel):
    root_domain: str
    label: str = ""

    @field_validator("root_domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        v = v.strip().lower()
        pattern = r"^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$"
        if not re.match(pattern, v):
            raise ValueError("Invalid domain format")
        return v


@router.get("")
async def list_targets(user: dict = Depends(get_current_user)):
    """List all targets for the authenticated user."""
    db = firestore.client()
    uid = user["uid"]
    docs = db.collection("users").document(uid).collection("targets") \
        .order_by("created_at", direction=firestore.Query.DESCENDING) \
        .stream()

    targets = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        # Convert Firestore timestamps to ISO strings
        if d.get("created_at"):
            d["created_at"] = d["created_at"].isoformat()
        targets.append(d)

    return {"targets": targets}


@router.post("", status_code=201)
async def create_target(body: TargetCreate, user: dict = Depends(get_current_user)):
    """Add a new target domain."""
    db = firestore.client()
    uid = user["uid"]

    # Check for duplicate
    existing = db.collection("users").document(uid).collection("targets") \
        .where(filter=FieldFilter("root_domain", "==", body.root_domain)) \
        .limit(1).stream()

    if any(True for _ in existing):
        raise HTTPException(status_code=409, detail="Target already exists")

    doc_ref = db.collection("users").document(uid).collection("targets").document()
    doc_ref.set({
        "root_domain": body.root_domain,
        "label": body.label or body.root_domain,
        "status": "inactive",
        "created_at": firestore.SERVER_TIMESTAMP,
    })

    return {"id": doc_ref.id, "root_domain": body.root_domain}


@router.delete("/{target_id}")
async def delete_target(target_id: str, user: dict = Depends(get_current_user)):
    """Remove a target."""
    db = firestore.client()
    uid = user["uid"]
    ref = db.collection("users").document(uid).collection("targets").document(target_id)

    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Target not found")

    ref.delete()
    return {"deleted": target_id}
