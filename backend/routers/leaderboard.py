from fastapi import APIRouter, Depends, Query
from supabase import Client

from deps import get_current_user, get_supabase

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("/")
async def get_leaderboard(
    limit: int = Query(50, ge=1, le=200),
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[dict]:
    """
    Ranked list of onboarded users, backed by the `public.leaderboard` view
    (schema.sql) — sorted by XP descending. Auth is required to view it (like
    every other list endpoint here) but it isn't scoped to the caller; the
    frontend re-sorts by weekly score / streak / XP for its tabs and computes
    rank client-side, so we just return the raw rows.
    """
    resp = sb.table("leaderboard").select("*").limit(limit).execute()
    rows = resp.data or []
    return [
        {
            "user_id": r.get("user_id"),
            "name": r.get("name") or "Anonymous",
            "avatar_initial": r.get("avatar_initial") or "?",
            "level": r.get("level") or 1,
            "xp": r.get("xp") or 0,
            "streak_current": r.get("streak_current") or 0,
            "weekly_score": float(r.get("weekly_score") or 0),
            "occupation": r.get("occupation"),
            "pillars": [p.strip() for p in (r.get("pillars") or "").split(",") if p.strip()],
            "badge": r.get("badge"),
        }
        for r in rows
    ]
