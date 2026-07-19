"""
Scans router — list scans and launch new ones.
"""

import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from firebase_admin import firestore

from auth import get_current_user
from scanner.engine import run_scan

router = APIRouter(prefix="/scans", tags=["scans"])


class ScanLaunch(BaseModel):
    target_id: str


@router.get("")
async def list_scans(user: dict = Depends(get_current_user)):
    """List all scans for the authenticated user, newest first."""
    db = firestore.client()
    uid = user["uid"]
    docs = db.collection("users").document(uid).collection("scans") \
        .order_by("started_at", direction=firestore.Query.DESCENDING) \
        .stream()

    scans = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        for ts_field in ("started_at", "completed_at"):
            if d.get(ts_field):
                d[ts_field] = d[ts_field].isoformat()
        scans.append(d)

    return {"scans": scans}


@router.post("", status_code=201)
async def launch_scan(
    body: ScanLaunch,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Create a scan document and kick off the scan engine in the background."""
    db = firestore.client()
    uid = user["uid"]

    # Verify the target exists
    target_ref = db.collection("users").document(uid).collection("targets").document(body.target_id)
    target_doc = target_ref.get()
    if not target_doc.exists:
        raise HTTPException(status_code=404, detail="Target not found")

    target = target_doc.to_dict()
    root_domain = target["root_domain"]

    # Create the scan document
    scan_ref = db.collection("users").document(uid).collection("scans").document()
    scan_ref.set({
        "target_id": body.target_id,
        "root_domain": root_domain,
        "status": "queued",
        "started_at": firestore.SERVER_TIMESTAMP,
        "completed_at": None,
        "assets_found": 0,
        "findings_found": 0,
    })

    # Launch the scan in the background
    background_tasks.add_task(run_scan, uid, scan_ref.id, root_domain)

    return {"scan_id": scan_ref.id, "status": "queued"}
