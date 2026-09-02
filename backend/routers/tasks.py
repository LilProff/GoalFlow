import json
from datetime import date
from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from deps import get_current_user, get_supabase, safe_single
from models import TaskCreate, TaskUpdate, TaskResponse, MessageResponse
from services.openrouter import call_ai_json

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ── Get Today's Tasks ──────────────────────────────────────────────────────────
@router.get("/today", response_model=list[TaskResponse])
async def get_today_tasks(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    today = date.today().isoformat()
    try:
        resp = sb.table("tasks").select("*").eq("user_id", user_id).eq("date_key", today).order("created_at").execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── AI Task Generation ─────────────────────────────────────────────────────────
@router.get("/generate", response_model=list[TaskResponse])
async def generate_tasks(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    """Ryna generates today's task list from the user's active goals."""
    today = date.today().isoformat()
    goals_resp   = sb.table("goals").select("pillar_id,title").eq("user_id", user_id).eq("status", "active").execute()
    profile_resp = safe_single(sb.table("user_profiles").select("name,coach_style").eq("id", user_id))
    goals   = goals_resp.data   or []
    profile = profile_resp.data or {}
    name    = profile.get("name", "the user")
    coach   = profile.get("coach_style", "strategist")
    goals_text = "\n".join(f"- {g['pillar_id']}: {g['title']}" for g in goals) or "No goals set — generate broad tasks."

    prompt = f"""Generate a focused daily task list for {name} (coach: {coach}).
Active goals:\n{goals_text}

Create 6-8 tasks across active pillars. Start at 09:00, 90-min deep-work blocks.
Return ONLY a JSON array:
[{{"pillar_id":"BUILD","title":"...","description":"...","estimated_minutes":90,"start_time":"09:00","end_time":"10:30","is_ai_generated":true}}]"""

    tasks_to_insert: list[dict] = []
    try:
        raw    = await call_ai_json(prompt, max_tokens=700, smart=True)
        clean  = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        parsed = json.loads(clean)
        if isinstance(parsed, list):
            for t in parsed:
                tasks_to_insert.append({
                    "user_id": user_id, "date_key": today,
                    "pillar_id": t.get("pillar_id", "BUILD"),
                    "title": t.get("title", "AI Task"),
                    "description": t.get("description", ""),
                    "estimated_minutes": t.get("estimated_minutes", 60),
                    "start_time": t.get("start_time"), "end_time": t.get("end_time"),
                    "status": "pending", "is_ai_generated": True,
                })
    except Exception:
        # Fallback — one task per pillar
        times = [("09:00","10:30"),("10:45","12:15"),("13:00","14:30"),("15:00","16:00")]
        for i, g in enumerate(goals[:4]):
            st, et = times[i] if i < len(times) else ("17:00","18:00")
            tasks_to_insert.append({
                "user_id": user_id, "date_key": today,
                "pillar_id": g["pillar_id"], "title": f"Work on: {g['title'][:60]}",
                "description": "From your active goal",
                "estimated_minutes": 90, "start_time": st, "end_time": et,
                "status": "pending", "is_ai_generated": True,
            })

    if not tasks_to_insert:
        return []
    try:
        resp = sb.table("tasks").insert(tasks_to_insert).execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Spread Goals into Today ────────────────────────────────────────────────────
@router.post("/spread-goals", response_model=list[TaskResponse])
async def spread_goal_tasks(user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    """Break active goals into concrete daily actions."""
    today = date.today().isoformat()
    goals_resp = sb.table("goals").select("pillar_id,title,progress").eq("user_id", user_id).eq("status", "active").execute()
    goals = goals_resp.data or []
    if not goals:
        raise HTTPException(status_code=400, detail="No active goals to spread from")

    goals_text = "\n".join(f"- {g['pillar_id']}: {g['title']} ({g.get('progress',0)}% done)" for g in goals)
    prompt = f"""Break these active goals into today's tasks.
Goals:\n{goals_text}

1-2 tasks per goal. Return ONLY a JSON array:
[{{"pillar_id":"BUILD","title":"...","description":"...","estimated_minutes":60,"start_time":"09:00","end_time":"10:00","is_ai_generated":true}}]"""

    tasks_to_insert: list[dict] = []
    try:
        raw    = await call_ai_json(prompt, max_tokens=700, smart=True)
        clean  = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        parsed = json.loads(clean)
        if isinstance(parsed, list):
            for t in parsed:
                tasks_to_insert.append({
                    "user_id": user_id, "date_key": today,
                    "pillar_id": t.get("pillar_id", "BUILD"),
                    "title": t.get("title", "Goal task"),
                    "description": t.get("description", ""),
                    "estimated_minutes": t.get("estimated_minutes", 60),
                    "start_time": t.get("start_time"), "end_time": t.get("end_time"),
                    "status": "pending", "is_ai_generated": True, "ai_context": "Spread from active goal",
                })
    except Exception:
        for g in goals[:6]:
            tasks_to_insert.append({
                "user_id": user_id, "date_key": today, "pillar_id": g["pillar_id"],
                "title": f"Progress: {g['title'][:60]}", "description": "Move the needle on your goal",
                "estimated_minutes": 60, "status": "pending", "is_ai_generated": True,
                "ai_context": "Spread from active goal",
            })

    if not tasks_to_insert:
        return []
    try:
        resp = sb.table("tasks").insert(tasks_to_insert).execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Create Task ────────────────────────────────────────────────────────────────
@router.post("/create", response_model=TaskResponse, status_code=201)
async def create_task(data: TaskCreate, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    today = date.today().isoformat()
    try:
        payload = {
            "user_id": user_id,
            "date_key": str(data.date_key) if data.date_key else today,
            "pillar_id": data.pillar_id, "title": data.title,
            "description": data.description,
            "estimated_minutes": data.estimated_minutes or 30,
            "start_time": data.start_time, "end_time": data.end_time,
            "status": "pending", "is_ai_generated": data.is_ai_generated,
        }
        resp = sb.table("tasks").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create task")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Update Task ────────────────────────────────────────────────────────────────
@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, data: TaskUpdate, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        existing = sb.table("tasks").select("user_id").eq("id", task_id).single().execute()
        if not existing.data or existing.data["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="Task not found")
        update_data = {k: v for k, v in data.model_dump(exclude_none=True).items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        resp = sb.table("tasks").update(update_data).eq("id", task_id).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to update task")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Delete Task ────────────────────────────────────────────────────────────────
@router.delete("/{task_id}", response_model=MessageResponse)
async def delete_task(task_id: str, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        existing = sb.table("tasks").select("user_id").eq("id", task_id).single().execute()
        if not existing.data or existing.data["user_id"] != user_id:
            raise HTTPException(status_code=404, detail="Task not found")
        sb.table("tasks").delete().eq("id", task_id).execute()
        return MessageResponse(message="Task deleted", success=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Get Tasks by Date ──────────────────────────────────────────────────────────
@router.get("/date/{date_key}", response_model=list[TaskResponse])
async def get_tasks_by_date(date_key: str, user_id: str = Depends(get_current_user), sb: Client = Depends(get_supabase)):
    try:
        resp = sb.table("tasks").select("*").eq("user_id", user_id).eq("date_key", date_key).order("created_at").execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
