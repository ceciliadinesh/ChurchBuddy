
import json
import hmac
import time
import base64
import hashlib
import binascii
from typing import Optional

from fastapi import (
    APIRouter,
    HTTPException,
    status,
    Header,
    Depends,
)
from pydantic import BaseModel

from app.database import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

ADMIN_USERNAME = settings.ADMIN_USERNAME
ADMIN_PASSWORD = settings.ADMIN_PASSWORD
ADMIN_SECRET_KEY = settings.ADMIN_SECRET_KEY


class AdminLoginRequest(BaseModel):
    username: str
    password: str


def encode_token(payload: dict) -> str:
    payload_bytes = json.dumps(
        payload,
        separators=(",", ":")
    ).encode()

    encoded_payload = base64.urlsafe_b64encode(
        payload_bytes
    ).decode().rstrip("=")

    signature = hmac.new(
        ADMIN_SECRET_KEY.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).digest()

    encoded_signature = base64.urlsafe_b64encode(
        signature
    ).decode().rstrip("=")

    return f"{encoded_payload}.{encoded_signature}"


def verify_token(token: str) -> Optional[dict]:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)

        expected_signature = hmac.new(
            ADMIN_SECRET_KEY.encode(),
            encoded_payload.encode(),
            hashlib.sha256,
        ).digest()

        supplied_signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )

        if not hmac.compare_digest(
            expected_signature,
            supplied_signature
        ):
            return None

        payload_bytes = base64.urlsafe_b64decode(
            encoded_payload + "=" * (-len(encoded_payload) % 4)
        )

        payload = json.loads(payload_bytes)

        if payload.get("exp", 0) < int(time.time()):
            return None

        if payload.get("role") != "admin":
            return None

        return payload

    except (
        ValueError,
        TypeError,
        json.JSONDecodeError,
        binascii.Error
    ):
        return None


# Reusable admin authentication dependency
def get_current_admin(
    authorization: Optional[str] = Header(default=None)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication token is missing.",
        )

    token = authorization.removeprefix("Bearer ")
    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token.",
        )

    return payload


@router.post("/admin/login")
def admin_login(data: AdminLoginRequest):

    username_valid = hmac.compare_digest(
        data.username,
        ADMIN_USERNAME
    )

    password_valid = hmac.compare_digest(
        data.password,
        ADMIN_PASSWORD
    )

    if not username_valid or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin ID or password.",
        )

    now = int(time.time())

    token = encode_token({
        "sub": ADMIN_USERNAME,
        "role": "admin",
        "iat": now,
        "exp": now + 8 * 60 * 60,
    })

    return {
        "message": "Admin login successful.",
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 28800,
    }


@router.get("/admin/verify")
def verify_admin(
    admin: dict = Depends(get_current_admin)
):
    return {
        "authenticated": True,
        "username": admin["sub"]
    }
