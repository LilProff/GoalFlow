import uuid
from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from auth_tokens import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, verify_refresh_token,
)
from deps import get_supabase, get_current_user, safe_single
from models import (
    AuthSignup, AuthLogin, AuthResponse, RefreshTokenRequest, ChangePasswordRequest,
    UserProfileResponse, MessageResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Helpers ────────────────────────────────────────────────────────────────────
def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _build_user_profile_response(user_id: str, profile_data: dict) -> UserProfileResponse:
    return UserProfileResponse(
        id=user_id,
        name=profile_data.get("name", ""),
        email=profile_data.get("email", ""),
        timezone=profile_data.get("timezone", "Africa/Lagos"),
        occupation=profile_data.get("occupation"),
        weekly_hours=profile_data.get("weekly_hours", 40),
        avatar_url=profile_data.get("avatar_url"),
        level=profile_data.get("level", 1),
        xp=profile_data.get("xp", 0),
        streak=profile_data.get("streak", 0),
        longest_streak=profile_data.get("longest_streak", 0),
        onboarding_complete=profile_data.get("onboarding_complete", False),
        onboarding_mode=profile_data.get("onboarding_mode", "form"),
        coach_style=profile_data.get("coach_style", "strategist"),
        has_9_to_5=profile_data.get("has_9_to_5", False),
        work_start_time=profile_data.get("work_start_time"),
        work_end_time=profile_data.get("work_end_time"),
        total_tasks_completed=profile_data.get("total_tasks_completed", 0),
        weekly_score=profile_data.get("weekly_score", 0.0),
        created_at=profile_data.get("created_at", _now_utc()),
    )


def _init_user_records(sb: Client, user_id: str) -> None:
    """Bootstrap stats + default pillars + notification prefs for a new user."""
    try:
        sb.table("user_stats").insert({"user_id": user_id}).execute()
    except Exception:
        pass
    try:
        default_pillars = [
            {"user_id": user_id, "pillar_id": "BUILD",     "label": "Build",      "color": "#ff6b35", "icon": "◈", "enabled": True},
            {"user_id": user_id, "pillar_id": "SHOW",      "label": "Show",       "color": "#00d4b4", "icon": "◎", "enabled": True},
            {"user_id": user_id, "pillar_id": "EARN",      "label": "Earn",       "color": "#f5c842", "icon": "◆", "enabled": True},
            {"user_id": user_id, "pillar_id": "SYSTEMIZE", "label": "Systemize",  "color": "#7b8fa8", "icon": "◉", "enabled": True},
        ]
        sb.table("pillars").insert(default_pillars).execute()
    except Exception:
        pass
    try:
        sb.table("notification_prefs").insert({"user_id": user_id}).execute()
    except Exception:
        pass


# ── Sign Up ────────────────────────────────────────────────────────────────────
@router.post("/signup", response_model=AuthResponse)
async def signup(data: AuthSignup, sb: Client = Depends(get_supabase)):
    email = data.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    existing = safe_single(sb.table("user_profiles").select("id").eq("email", email))
    if existing.data:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user_id = str(uuid.uuid4())
    profile = {
        "id": user_id,
        "name": data.name.strip() or email.split("@")[0],
        "email": email,
        "password_hash": hash_password(data.password),
        "timezone": "Africa/Lagos",
        "onboarding_complete": False,
        "coach_style": "strategist",
        "created_at": _now_utc().isoformat(),
    }
    try:
        created = sb.table("user_profiles").insert(profile).execute()
    except Exception as e:
        # Race with the existence check above, or a genuine DB error either way.
        raise HTTPException(status_code=400, detail=f"Could not create account: {e}")

    profile_data = created.data[0] if created.data else profile
    _init_user_records(sb, user_id)

    return AuthResponse(
        user=_build_user_profile_response(user_id, profile_data),
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


# ── Login ──────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(data: AuthLogin, sb: Client = Depends(get_supabase)):
    email = data.email.strip().lower()
    resp = safe_single(sb.table("user_profiles").select("*").eq("email", email))
    profile_data = resp.data

    if not profile_data or not verify_password(data.password, profile_data.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_id = profile_data["id"]
    return AuthResponse(
        user=_build_user_profile_response(user_id, profile_data),
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


# ── Refresh Token ──────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(data: RefreshTokenRequest, sb: Client = Depends(get_supabase)):
    try:
        user_id = verify_refresh_token(data.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    resp = safe_single(sb.table("user_profiles").select("*").eq("id", user_id))
    if not resp.data:
        raise HTTPException(status_code=401, detail="Account no longer exists")

    return AuthResponse(
        user=_build_user_profile_response(user_id, resp.data),
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),  # rotate
    )


# ── Verify Token ───────────────────────────────────────────────────────────────
@router.get("/verify", response_model=UserProfileResponse)
async def verify_token(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    resp = safe_single(sb.table("user_profiles").select("*").eq("id", user_id))
    if not resp.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    return _build_user_profile_response(user_id, resp.data)


# ── Logout ─────────────────────────────────────────────────────────────────────
@router.post("/logout", response_model=MessageResponse)
async def logout(user_id: str = Depends(get_current_user)):
    # Tokens are stateless (no server-side session store), so there is nothing
    # to invalidate server-side — the client discarding them is what signs the
    # user out. This endpoint exists for symmetry and future extension (e.g.
    # a refresh-token blocklist) rather than doing real work today.
    return MessageResponse(message="Logged out")


# ── Change Password ─────────────────────────────────────────────────────────
@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    resp = safe_single(sb.table("user_profiles").select("password_hash").eq("id", user_id))
    if not resp.data or not verify_password(data.current_password, resp.data.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    sb.table("user_profiles").update({"password_hash": hash_password(data.new_password)}).eq("id", user_id).execute()
    return MessageResponse(message="Password updated.")
