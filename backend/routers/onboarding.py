from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from deps import get_current_user, get_supabase
from models import OnboardingStep

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/save-step")
async def save_step(data: dict, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    """Persist a single onboarding step's data to Supabase."""
    step    = data.get("step", 1)
    payload = data.get("data", {})
    try:
        update = {}
        for field, col in [
            ("name", "name"), ("timezone", "timezone"), ("occupation", "occupation"),
            ("has9to5", "has_9_to_5"), ("workStartTime", "work_start_time"),
            ("workEndTime", "work_end_time"), ("coachStyle", "coach_style"),
        ]:
            if field in payload:
                update[col] = payload[field]

        if update:
            sb.table("user_profiles").update(update).eq("id", user_id).execute()

        if "pillars" in payload:
            sb.table("pillars").delete().eq("user_id", user_id).execute()
            rows = []
            for p in payload["pillars"]:
                rows.append({
                    "user_id": user_id, "pillar_id": p.get("id", ""), "label": p.get("label", ""),
                    "color": p.get("color", ""), "icon": p.get("icon", ""),
                    "enabled": p.get("enabled", True),
                    "categories": p.get("categories", []), "weekly_kpis": p.get("weeklyKPIs", []),
                })
            if rows:
                sb.table("pillars").insert(rows).execute()

        if "categories" in payload:
            sb.table("categories").delete().eq("user_id", user_id).execute()
            rows = []
            for c in payload["categories"]:
                rows.append({
                    "user_id": user_id, "category_id": c.get("id", ""), "label": c.get("label", ""),
                    "description": c.get("description", ""), "icon": c.get("icon", ""),
                    "color": c.get("color", ""), "enabled": c.get("enabled", True),
                    "pillar_id": c.get("pillarId", ""),
                })
            if rows:
                sb.table("categories").insert(rows).execute()

        if "goals" in payload:
            goal_types = payload.get("goalTypes", {})
            for pillar_id, goal_text in payload["goals"].items():
                if goal_text and goal_text.strip():
                    sb.table("goals").insert({
                        "user_id": user_id, "pillar_id": pillar_id,
                        "title": goal_text.strip(),
                        "target_date": (date.today() + timedelta(days=90)).isoformat(),
                        "status": "active", "progress": 0,
                        "goal_type": goal_types.get(pillar_id) or "project",
                    }).execute()

        return {"ok": True, "step": step}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete")
async def complete_onboarding(data: dict, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    """Mark onboarding complete and trigger first-week plan generation."""
    try:
        sb.table("user_profiles").update({
            "onboarding_complete": True,
            "onboarding_mode": data.get("mode", "form"),
        }).eq("id", user_id).execute()
        return {"ok": True, "message": "Onboarding complete — welcome to GoalFlow!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        resp = sb.table("user_profiles").select("onboarding_complete,onboarding_mode").eq("id", user_id).single().execute()
        return {
            "complete": resp.data.get("onboarding_complete", False) if resp.data else False,
            "mode": resp.data.get("onboarding_mode", "form") if resp.data else "form",
        }
    except Exception:
        return {"complete": False, "mode": "form"}
