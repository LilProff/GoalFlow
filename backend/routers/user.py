import httpx
from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from config import settings
from deps import get_current_user, get_supabase, safe_single
from models import UserStatsResponse, UserStatsUpdate

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        profile_resp = safe_single(sb.table("user_profiles").select("*").eq("id", user_id))
        stats_resp   = safe_single(sb.table("user_stats").select("*").eq("user_id", user_id))
        profile = profile_resp.data or {}
        stats   = stats_resp.data   or {"xp": 0, "level": 1, "streak_current": 0, "streak_longest": 0}
        return {**profile, "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=UserStatsResponse)
async def get_stats(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        resp = safe_single(sb.table("user_stats").select("*").eq("user_id", user_id))
        if not resp or not resp.data:
            init = {"user_id": user_id, "xp": 0, "level": 1, "streak_current": 0, "streak_longest": 0}
            created = sb.table("user_stats").insert(init).execute()
            return created.data[0] if created.data else init
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/stats", response_model=UserStatsResponse)
async def update_stats(data: UserStatsUpdate, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        update_data = {k: v for k, v in data.model_dump(exclude_none=True).items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        resp = sb.table("user_stats").update(update_data).eq("user_id", user_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Stats not found")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/profile")
async def update_profile(data: dict, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    """Update user profile fields (name, timezone, occupation, coach_style, etc.)."""
    allowed = {"name", "timezone", "occupation", "weekly_hours", "coach_style",
               "has_9_to_5", "work_start_time", "work_end_time", "avatar_url"}
    update_data = {k: v for k, v in data.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    try:
        resp = sb.table("user_profiles").update(update_data).eq("id", user_id).execute()
        return resp.data[0] if resp.data else {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/account")
async def delete_account(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    """
    Permanently delete this account and everything belonging to it.

    Deletes the user_profiles row first — every other table references it with
    `on delete cascade`, so goals, tasks, time blocks, logs, stats, badges,
    memories and conversations go with it. Then removes the Clerk user so the
    same email can sign up fresh; without that step the account would come back
    as an empty profile on next sign-in.
    """
    try:
        sb.table("user_profiles").delete().eq("id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account data: {e}")

    clerk_deleted = False
    if settings.clerk_secret_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.delete(
                    f"https://api.clerk.com/v1/users/{user_id}",
                    headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
                )
            clerk_deleted = resp.status_code in (200, 204, 404)
        except Exception:
            clerk_deleted = False

    # The data is gone either way; report whether the identity was removed too
    # so the caller can tell the user if a manual cleanup is still needed.
    return {
        "ok": True,
        "data_deleted": True,
        "identity_deleted": clerk_deleted,
        "message": "Account deleted." if clerk_deleted else
                   "Account data deleted. The sign-in identity could not be removed automatically.",
    }
