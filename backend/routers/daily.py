from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client

from deps import get_current_user, get_supabase, safe_single
from models import DailyLogResponse, HistoryEntry, MessageResponse

router = APIRouter(prefix="/daily", tags=["daily"])


def calculate_score(tasks: list[dict]) -> float:
    if not tasks:
        return 0.0
    done = [t for t in tasks if t.get("status") == "completed"]
    return round((len(done) / len(tasks)) * 10, 1)


def calculate_xp(tasks: list[dict], build_hours: float) -> int:
    xp = 0
    for t in tasks:
        if t.get("status") == "completed":
            xp += 30 if t.get("pillar_id") == "BUILD" else 20
    if build_hours >= 4:
        xp += 10
    return xp


@router.get("/today", response_model=DailyLogResponse)
async def get_today(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    today = date.today().isoformat()
    try:
        log_resp   = safe_single(sb.table("daily_logs").select("*").eq("user_id", user_id).eq("date_key", today))
        tasks_resp = sb.table("tasks").select("*").eq("user_id", user_id).eq("date_key", today).execute()
        tasks = tasks_resp.data or []

        if not log_resp or not log_resp.data:
            return DailyLogResponse(
                id="", user_id=user_id, date_key=today,
                build_hours=0.0, score=0.0,
                reflection={"accomplished": "", "blocked": "", "grateful": "", "tomorrow_focus": ""},
                pillar_completion={},
                tasks=tasks,
                updated_at=today,
            )
        log = log_resp.data
        return DailyLogResponse(
            id=log["id"], user_id=user_id, date_key=today,
            build_hours=log.get("build_hours", 0.0),
            score=log.get("score", 0.0),
            reflection=log.get("reflection", {"accomplished": "", "blocked": "", "grateful": "", "tomorrow_focus": ""}),
            pillar_completion=log.get("pillar_completion", {}),
            tasks=tasks,
            updated_at=log.get("updated_at", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/log", response_model=MessageResponse)
async def log_day(data: dict, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    today = date.today().isoformat()
    try:
        tasks_resp = sb.table("tasks").select("*").eq("user_id", user_id).eq("date_key", today).execute()
        tasks = tasks_resp.data or []
        score = calculate_score(tasks)
        reflection = data.get("reflection", {})
        payload = {
            "user_id": user_id, "date_key": today,
            "build_hours": data.get("build_hours", 0.0),
            "score": score,
            "reflection": reflection,
            "pillar_completion": data.get("pillar_completion", {}),
            "updated_at": today,
        }
        sb.table("daily_logs").upsert(payload, on_conflict="user_id,date_key").execute()

        # XP update
        xp_earned = calculate_xp(tasks, payload["build_hours"])
        if xp_earned > 0:
            stats_resp = safe_single(sb.table("user_stats").select("xp").eq("user_id", user_id))
            current_xp = stats_resp.data.get("xp", 0) if (stats_resp and stats_resp.data) else 0
            sb.table("user_stats").update({"xp": current_xp + xp_earned, "last_log_date": today}).eq("user_id", user_id).execute()

        return MessageResponse(message="Day logged successfully", success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=list[HistoryEntry])
async def get_history(
    days: int = Query(default=7, ge=1, le=90),
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
):
    try:
        start = (date.today() - timedelta(days=days)).isoformat()
        resp = sb.table("daily_logs").select("*").eq("user_id", user_id).gte("date_key", start).lte("date_key", date.today().isoformat()).order("date_key", desc=True).execute()
        result = []
        for log in (resp.data or []):
            tasks_resp = sb.table("tasks").select("status").eq("user_id", user_id).eq("date_key", log["date_key"]).execute()
            t_data = tasks_resp.data or []
            done  = len([t for t in t_data if t.get("status") == "completed"])
            total = len(t_data)
            result.append(HistoryEntry(
                date_key=log["date_key"], score=log.get("score", 0.0),
                build_hours=log.get("build_hours", 0.0),
                tasks_completed=done, tasks_total=total,
                discipline_score=round(log.get("score", 0.0) * 10),
            ))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/streak")
async def get_streak(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        resp = sb.table("user_stats").select("streak_current,streak_longest,last_log_date").eq("user_id", user_id).single().execute()
        return resp.data or {"streak_current": 0, "streak_longest": 0, "last_log_date": ""}
    except Exception:
        return {"streak_current": 0, "streak_longest": 0, "last_log_date": ""}
