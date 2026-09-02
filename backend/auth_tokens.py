"""
Password hashing and JWT issuance for self-issued auth.

Kept separate from deps.py (which only *verifies* access tokens) so routers
that issue tokens — currently just auth.py — import this, while every other
router only needs deps.get_current_user.
"""
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from config import settings

ACCESS_TOKEN_TTL = timedelta(hours=12)
REFRESH_TOKEN_TTL = timedelta(days=30)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed hash (e.g. a stray legacy value) — treat as no match
        # rather than raising, so this can never turn into a 500 on login.
        return False


def _issue(user_id: str, token_type: str, ttl: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "type": token_type, "iat": now, "exp": now + ttl}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_access_token(user_id: str) -> str:
    return _issue(user_id, "access", ACCESS_TOKEN_TTL)


def create_refresh_token(user_id: str) -> str:
    return _issue(user_id, "refresh", REFRESH_TOKEN_TTL)


def verify_refresh_token(token: str) -> str:
    """Returns the user id, or raises jwt.InvalidTokenError / jwt.ExpiredSignatureError."""
    payload = jwt.decode(
        token, settings.jwt_secret, algorithms=["HS256"], options={"require": ["exp", "sub"]}
    )
    if payload.get("type") != "refresh":
        raise jwt.InvalidTokenError("Not a refresh token")
    return payload["sub"]
