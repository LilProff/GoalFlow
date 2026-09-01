"""
Shared FastAPI dependencies — used by all routers.

Auth strategy: self-issued JWT (replaces Clerk). We hash passwords ourselves
(bcrypt) and sign our own access/refresh tokens with JWT_SECRET (HS256).
Verification here is a pure signature + claims check against that shared
secret — no external network call, no third-party identity provider.
"""
from functools import lru_cache
from typing import Any, Optional

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import jwt

from config import settings

security = HTTPBearer()


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Singleton Supabase service-role client. Bypasses RLS for server use —
    this backend is the only thing that talks to Postgres; access control is
    enforced here (every query scoped by the verified token's user id), not
    by RLS. Identity is ours now (not Supabase Auth's), so auth.uid()-based
    policies are inert; Supabase here is purely the Postgres host."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


class _SingleRow:
    """Shaped like the response `.maybe_single().execute()` should return —
    just a `.data` attribute holding a dict or None. Lets call sites written
    against `.maybe_single()` keep working unchanged."""
    __slots__ = ("data",)

    def __init__(self, data: Optional[dict]) -> None:
        self.data = data


def safe_single(query: Any) -> _SingleRow:
    """
    Drop-in replacement for `<query>.maybe_single().execute()`.

    The installed postgrest-py (1.0.2, pulled in by supabase==2.15.1) has a
    bug where `.maybe_single()` raises `APIError({"message": "Missing
    response", ...})` instead of returning `data=None` when a query
    legitimately matches zero rows — e.g. looking up a brand-new user's
    profile before it exists. That breaks any first-time lookup (new-user
    signup, today's not-yet-created daily log, etc.).

    Use `.limit(1)` instead, which has no such bug, and shape the result the
    same way `.maybe_single()` would have, so existing call sites (`resp.data`)
    don't need to change.
    """
    resp = query.limit(1).execute()
    rows = resp.data or []
    return _SingleRow(rows[0] if rows else None)


def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Verify our own access token and return its `sub` (the user id).

    Signature checked against JWT_SECRET, `exp` required, and the token must
    carry `type: "access"` — a refresh token presented here (same secret,
    different purpose) is rejected rather than silently accepted as a
    session token.
    """
    try:
        payload = jwt.decode(
            token.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — please sign in again.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
    return user_id
