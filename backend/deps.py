"""
Shared FastAPI dependencies — used by all routers.

Auth strategy: verify the Clerk-issued session JWT's RS256 signature against
Clerk's published JWKS, then trust its `sub` as the user id.

This used to decode with `verify_signature=False`, on the reasoning that
"Clerk's frontend SDK already validates tokens". That reasoning is wrong: the
frontend is not a trust boundary. Anyone can send this API a handcrafted
Bearer token with an arbitrary `sub` and, since every router scopes its
queries by that `sub` against a service-role Supabase client (which bypasses
RLS), read and write any user's data. Signature verification is the only
thing standing between the database and the open internet.
"""
import base64
from functools import lru_cache
from typing import Any, Optional

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import jwt
from jwt import PyJWKClient

from config import settings

security = HTTPBearer()


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Singleton Supabase service-role client. Bypasses RLS for server use."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


@lru_cache(maxsize=1)
def clerk_issuer() -> str:
    """
    The Clerk instance's issuer URL, derived from the publishable key.

    A publishable key is `pk_(test|live)_<base64>`, where the decoded payload
    is the instance's Frontend API host with a trailing "$" — e.g.
    "quiet-hound-42.clerk.accounts.dev$". That host, over https, is both the
    `iss` claim on its tokens and where its JWKS lives, so the one key we
    already configure gives us everything needed to verify.
    """
    pk = (settings.clerk_publishable_key or "").strip()
    if not pk:
        raise RuntimeError(
            "CLERK_PUBLISHABLE_KEY is not set. The API cannot verify session "
            "tokens without it — add it to the root .env file."
        )
    parts = pk.split("_", 2)
    if len(parts) != 3 or not parts[2]:
        raise RuntimeError(f"Malformed CLERK_PUBLISHABLE_KEY (expected pk_test_… / pk_live_…): {pk[:16]}…")
    encoded = parts[2]
    encoded += "=" * (-len(encoded) % 4)  # restore stripped base64 padding
    try:
        host = base64.b64decode(encoded).decode("utf-8").rstrip("$")
    except Exception as e:
        raise RuntimeError(f"Could not decode CLERK_PUBLISHABLE_KEY: {e}")
    if not host:
        raise RuntimeError("CLERK_PUBLISHABLE_KEY decoded to an empty host")
    return f"https://{host}"


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient:
    """Clerk's public signing keys. PyJWKClient caches them in-process and
    refetches on an unknown key id, so key rotation is handled for us."""
    return PyJWKClient(f"{clerk_issuer()}/.well-known/jwks.json", cache_keys=True)


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
    Clerk sync, today's not-yet-created daily log, etc.).

    Use `.limit(1)` instead, which has no such bug, and shape the result the
    same way `.maybe_single()` would have, so existing call sites (`resp.data`)
    don't need to change.
    """
    resp = query.limit(1).execute()
    rows = resp.data or []
    return _SingleRow(rows[0] if rows else None)


def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Verify the Clerk session JWT and return its `sub` (the Clerk user id).

    Verification is real: RS256 signature checked against Clerk's JWKS, issuer
    pinned to our own Clerk instance, and `exp`/`sub` required. A forged or
    expired token is rejected with 401 rather than silently trusted.
    """
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token.credentials)
        payload = jwt.decode(
            token.credentials,
            signing_key.key,
            algorithms=["RS256"],
            issuer=clerk_issuer(),
            # Clerk session tokens carry `azp`, not `aud`, so audience checking
            # is off; the issuer pin is what scopes tokens to our instance.
            options={"require": ["exp", "sub"], "verify_aud": False},
            leeway=10,  # tolerate minor clock skew between us and Clerk
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — please sign in again.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    except HTTPException:
        raise
    except Exception as e:
        # JWKS fetch failures land here — surface as 401 rather than a 500 so
        # the client treats it as an auth problem and re-authenticates.
        raise HTTPException(status_code=401, detail=f"Could not verify token: {e}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
    return user_id
