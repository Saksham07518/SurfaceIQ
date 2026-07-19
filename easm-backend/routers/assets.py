"""
Assets router — list and manage discovered assets/subdomains.
"""

from fastapi import APIRouter, Depends, Query
from firebase_admin import firestore
from google.cloud.firestore_v1 import FieldFilter

from auth import get_current_user

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("")
async def list_assets(
    root_domain: str | None = Query(None, description="Filter assets by target root domain"),
    status: str | None = Query(None, description="Filter by status: live, dead"),
    user: dict = Depends(get_current_user),
):
    """List all discovered assets for the authenticated user."""
    db = firestore.client()
    uid = user["uid"]

    q = db.collection("users").document(uid).collection("assets") \
        .order_by("discovered_at", direction=firestore.Query.DESCENDING)

    if root_domain:
        q = q.where(filter=FieldFilter("root_domain", "==", root_domain.strip().lower()))
    if status:
        q = q.where(filter=FieldFilter("status", "==", status.strip().lower()))

    docs = q.stream()

    assets = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        if d.get("discovered_at"):
            d["discovered_at"] = d["discovered_at"].isoformat()
        assets.append(d)

    return {"assets": assets, "total": len(assets)}
