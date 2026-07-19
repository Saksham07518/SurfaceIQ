"""
Findings router — list security findings.
"""

from fastapi import APIRouter, Depends, Query
from firebase_admin import firestore

from auth import get_current_user

router = APIRouter(prefix="/findings", tags=["findings"])


@router.get("")
async def list_findings(
    severity: str | None = Query(None, description="Filter by severity: critical, high, medium, low, info"),
    user: dict = Depends(get_current_user),
):
    """List all findings for the authenticated user, optionally filtered by severity."""
    db = firestore.client()
    uid = user["uid"]

    q = db.collection("users").document(uid).collection("findings") \
        .order_by("detected_at", direction=firestore.Query.DESCENDING)

    if severity:
        from google.cloud.firestore_v1 import FieldFilter
        q = q.where(filter=FieldFilter("severity", "==", severity.lower()))

    docs = q.stream()

    findings = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        if d.get("detected_at"):
            d["detected_at"] = d["detected_at"].isoformat()
        findings.append(d)

    return {"findings": findings, "total": len(findings)}
