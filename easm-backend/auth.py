"""
Firebase Auth dependency — verifies the ID token from the
Authorization: Bearer <token> header on every protected request.
"""

from fastapi import Depends, HTTPException, Request
from firebase_admin import auth as firebase_auth


async def get_current_user(request: Request) -> dict:
    """Extract and verify Firebase ID token from the Authorization header."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = header.removeprefix("Bearer ").strip()
    try:
        decoded = firebase_auth.verify_id_token(token)
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired ID token")
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(status_code=401, detail=f"Could not verify credentials: {e}")

    return decoded  # contains uid, email, etc.
