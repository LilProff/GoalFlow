from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from config import settings
from deps import get_supabase, get_current_user, safe_single
from models import (
    AuthSignup, AuthLogin, AuthResponse, RefreshTokenRequest,
    ClerkSyncRequest, UserProfileResponse, MessageResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Helpers ────────────────────────────────────────────────────────────────────
def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _build_user_profile_response(
    user_id: str, profile_data: dict, fallback_email: str, fallback_name: str = ""
) -> UserProfileResponse:
    return UserProfileResponse(
        id=user_id,
        name=profile_data.get("name", fallback_name),
        email=profile_data.get("email", fallback_email),
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


def _error_message(exc: Exception, fallback: str) -> str:
    text = str(exc).strip()
    if not text:
        return fallback
    lowered = text.lower()
    if "email not confirmed" in lowered:
        return "Email not confirmed. Please verify your email before logging in."
    if "invalid login credentials" in lowered:
        return "Invalid email or password."
    return text


def _init_user_records(sb: Client, user_id: str, email: str, name: str) -> dict:
    """Bootstrap stats + pillars + notification prefs for a new user."""
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
    return {
        "id": user_id, "name": name or email.split("@")[0], "email": email,
        "timezone": "Africa/Lagos", "onboarding_complete": False, "coach_style": "strategist",
    }


# ── Sign Up ────────────────────────────────────────────────────────────────────
@router.post("/signup", response_model=AuthResponse)
async def signup(data: AuthSignup, sb: Client = Depends(get_supabase)):
    try:
        auth_resp = sb.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {"data": {"full_name": data.name}},
        })
        if auth_resp.user is None:
            raise HTTPException(status_code=400, detail="Signup failed")

        user_id = auth_resp.user.id
        access_token  = auth_resp.session.access_token  if auth_resp.session else ""
        refresh_token = auth_resp.session.refresh_token if auth_resp.session else ""

        if not access_token:
            try:
                sign_in = sb.auth.sign_in_with_password({"email": data.email, "password": data.password})
                if sign_in and sign_in.session:
                    access_token  = sign_in.session.access_token
                    refresh_token = sign_in.session.refresh_token
            except Exception:
                pass

        if not access_token:
            raise HTTPException(status_code=400, detail="Account created — please verify your email then sign in.")

        profile_data = _init_user_records(sb, user_id, data.email, data.name)
        return AuthResponse(
            user=_build_user_profile_response(user_id, profile_data, data.email, data.name),
            access_token=access_token,
            refresh_token=refresh_token,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Login ──────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=AuthResponse)
async def login(data: AuthLogin, sb: Client = Depends(get_supabase)):
    try:
        auth_resp = sb.auth.sign_in_with_password({"email": data.email, "password": data.password})
        if not auth_resp.user or not auth_resp.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id = auth_resp.user.id
        profile_data: dict = {}

        try:
            resp = safe_single(sb.table("user_profiles").select("*").eq("id", user_id))
            if not resp or not resp.data:
                fallback_name = (auth_resp.user.user_metadata or {}).get("full_name", "")
                profile_data = _init_user_records(sb, user_id, data.email, fallback_name)
                try:
                    created = sb.table("user_profiles").insert(profile_data).execute()
                    if created.data:
                        profile_data = created.data[0]
                except Exception:
                    pass
            else:
                profile_data = resp.data
        except Exception:
            profile_data = {}

        return AuthResponse(
            user=_build_user_profile_response(user_id, profile_data, data.email),
            access_token=auth_resp.session.access_token,
            refresh_token=auth_resp.session.refresh_token,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=_error_message(e, "Invalid credentials"))


# ── Refresh Token ──────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(data: RefreshTokenRequest, sb: Client = Depends(get_supabase)):
    try:
        resp = sb.auth.refresh_session(data.refresh_token)
        if not resp.user or not resp.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id = resp.user.id
        profile_resp = safe_single(sb.table("user_profiles").select("*").eq("id", user_id))
        profile_data = profile_resp.data if (profile_resp and profile_resp.data) else {}
        return AuthResponse(
            user=_build_user_profile_response(user_id, profile_data, resp.user.email or ""),
            access_token=resp.session.access_token,
            refresh_token=resp.session.refresh_token,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ── Verify Token ───────────────────────────────────────────────────────────────
@router.get("/verify")
async def verify_token(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    resp = safe_single(sb.table("user_profiles").select("*").eq("id", user_id))
    if not resp or not resp.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    d = resp.data
    return _build_user_profile_response(user_id, d, d.get("email", ""))


# ── Logout ─────────────────────────────────────────────────────────────────────
@router.post("/logout")
async def logout(user_id: str = Depends(get_current_user)):
    return {"ok": True, "message": "Logged out"}


# ── Clerk Sync ─────────────────────────────────────────────────────────────────
@router.post("/clerk-sync", response_model=AuthResponse)
async def clerk_sync(
    data: ClerkSyncRequest,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    """Called after Clerk sign-in — creates/syncs user record in Supabase."""
    try:
        resp = safe_single(sb.table("user_profiles").select("*").eq("id", user_id))
        profile_data: dict = {}

        if not resp or not resp.data:
            name = data.name or (data.email or "").split("@")[0]
            profile_data = {
                "id": user_id, "email": data.email or "", "name": name,
                "timezone": "Africa/Lagos", "onboarding_complete": False,
                "coach_style": "strategist", "created_at": _now_utc().isoformat(),
            }
            try:
                created = sb.table("user_profiles").insert(profile_data).execute()
                if created.data:
                    profile_data = created.data[0]
            except Exception:
                pass
            _init_user_records(sb, user_id, data.email or "", name)
        else:
            profile_data = resp.data

        return AuthResponse(
            user=_build_user_profile_response(user_id, profile_data, data.email or ""),
            access_token="clerk-managed",
            refresh_token="clerk-managed",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
