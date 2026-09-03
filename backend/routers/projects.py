"""
Projects (ongoing, cadenced work) + the weekly Routine container they get
scheduled into, plus the planning engine's two live endpoints: "what should
I do right now" and "plan my week". See services/planning.py for the
allocation logic — this file is I/O (load, call the pure planner, persist).
"""
from datetime import date, datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client

from deps import get_current_user, get_supabase
from models import (
    ProjectCreate, ProjectUpdate as ProjectUpdatePatch, ProjectResponse,
    RoutineBlockCreate, RoutineBlockUpdate, RoutineBlockResponse,
    ProjectUpdateLogCreate, ProjectUpdateLogResponse,
    NextActionResponse, WeekPlanRequest, WeekPlanResponse, WeekPlanDay,
    TimeBlockResponse,
)
from services import planning

router = APIRouter(prefix="/projects", tags=["projects"])
routine_router = APIRouter(prefix="/routine", tags=["routine"])
planning_router = APIRouter(prefix="/planning", tags=["planning"])


def _minute_to_time(m: int) -> str:
    m = m % 1440
    return f"{m // 60:02d}:{m % 60:02d}:00"


# ── Projects CRUD ────────────────────────────────────────────────────────────
@router.get("/", response_model=list[ProjectResponse])
async def list_projects(
    status: str | None = Query(default=None),
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[ProjectResponse]:
    try:
        q = sb.table("projects").select("*").eq("user_id", user_id)
        if status:
            q = q.eq("status", status)
        resp = q.order("is_main_quest", desc=True).order("priority").execute()
        projects = resp.data or []
        week_start = planning.week_start_for(date.today())
        logged = planning.sessions_logged_this_week(sb, user_id, week_start)
        return [planning.attach_cadence(p, logged.get(p["id"], 0)) for p in projects]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> ProjectResponse:
    try:
        payload = {**data.model_dump(), "user_id": user_id}
        resp = sb.table("projects").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create project")
        return planning.attach_cadence(resp.data[0], 0)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdatePatch,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> ProjectResponse:
    try:
        update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        if not update:
            raise HTTPException(status_code=400, detail="No fields to update")
        resp = sb.table("projects").update(update).eq("id", project_id).eq("user_id", user_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Project not found")
        week_start = planning.week_start_for(date.today())
        logged = planning.sessions_logged_this_week(sb, user_id, week_start)
        return planning.attach_cadence(resp.data[0], logged.get(project_id, 0))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    try:
        sb.table("projects").delete().eq("id", project_id).eq("user_id", user_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Project updates (the running log) ───────────────────────────────────────
@router.get("/{project_id}/updates", response_model=list[ProjectUpdateLogResponse])
async def list_project_updates(
    project_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[ProjectUpdateLogResponse]:
    try:
        resp = (
            sb.table("project_updates").select("*")
            .eq("user_id", user_id).eq("project_id", project_id)
            .order("date_key", desc=True).limit(50).execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/updates", response_model=ProjectUpdateLogResponse, status_code=201)
async def log_project_update(
    project_id: str,
    data: ProjectUpdateLogCreate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> ProjectUpdateLogResponse:
    try:
        payload = {
            "user_id": user_id,
            "project_id": project_id,
            "date_key": (data.date_key or date.today()).isoformat(),
            "note": data.note,
            "minutes_spent": data.minutes_spent,
            "counts_as_session": data.counts_as_session,
            "blocker": data.blocker,
        }
        resp = sb.table("project_updates").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to log update")
        sb.table("projects").update({"last_worked_on": payload["date_key"]}).eq("id", project_id).eq("user_id", user_id).execute()
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Routine blocks CRUD ──────────────────────────────────────────────────────
@routine_router.get("/", response_model=list[RoutineBlockResponse])
async def list_routine(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[RoutineBlockResponse]:
    try:
        resp = sb.table("routine_blocks").select("*").eq("user_id", user_id).order("start_minute").execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@routine_router.post("/", response_model=RoutineBlockResponse, status_code=201)
async def create_routine_block(
    data: RoutineBlockCreate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> RoutineBlockResponse:
    try:
        if data.end_minute <= data.start_minute:
            raise HTTPException(status_code=400, detail="End time must be after start time.")
        payload = {**data.model_dump(), "user_id": user_id}
        resp = sb.table("routine_blocks").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create routine block")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@routine_router.patch("/{block_id}", response_model=RoutineBlockResponse)
async def update_routine_block(
    block_id: str,
    data: RoutineBlockUpdate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> RoutineBlockResponse:
    try:
        update = {k: v for k, v in data.model_dump(exclude_none=True).items()}
        if not update:
            raise HTTPException(status_code=400, detail="No fields to update")
        resp = sb.table("routine_blocks").update(update).eq("id", block_id).eq("user_id", user_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Routine block not found")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@routine_router.delete("/{block_id}")
async def delete_routine_block(
    block_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    try:
        sb.table("routine_blocks").delete().eq("id", block_id).eq("user_id", user_id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Planning engine ──────────────────────────────────────────────────────────
@planning_router.get("/next-action", response_model=NextActionResponse)
async def next_action(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> NextActionResponse:
    try:
        now = datetime.now()
        today = now.date().isoformat()
        routine = planning.load_routine(sb, user_id)
        projects = planning.load_projects(sb, user_id)
        week_start = planning.week_start_for(now.date())
        logged = planning.sessions_logged_this_week(sb, user_id, week_start)
        today_blocks = (
            sb.table("time_blocks").select("*").eq("user_id", user_id).eq("date_key", today).execute()
        ).data or []

        result = planning.recommend_next_action(
            routine, projects, logged, today_blocks,
            weekday=now.weekday(), now_minute=now.hour * 60 + now.minute,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@planning_router.post("/week-plan", response_model=WeekPlanResponse)
async def plan_week(
    req: WeekPlanRequest,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> WeekPlanResponse:
    """Materialises the routine container + fills schedulable windows with
    project sessions by cadence debt, for the whole week. Mirrors
    /planner/reshuffle's convention of writing directly rather than a
    review-first draft: this only ever touches flexible/AI-managed blocks
    and the routine layer, never a block you've hand-edited or marked fixed."""
    try:
        week_start = req.week_start or planning.week_start_for(date.today())
        routine = planning.load_routine(sb, user_id)
        projects = planning.load_projects(sb, user_id)
        logged = planning.sessions_logged_this_week(sb, user_id, week_start)

        day_blocks, at_risk = planning.build_week_plan(routine, projects, logged)

        main_quest = next((p["name"] for p in projects if p.get("is_main_quest")), None)
        result_days: list[WeekPlanDay] = []

        for offset in range(7):
            d = week_start + timedelta(days=offset)
            date_key = d.isoformat()

            # Never touch a block the user fixed/hand-edited — only clear
            # what a previous week-plan or reshuffle put there.
            existing = (
                sb.table("time_blocks").select("id,flexible,notes")
                .eq("user_id", user_id).eq("date_key", date_key).execute()
            ).data or []
            for b in existing:
                if b.get("flexible", True) and (b.get("notes") or "").startswith(("Routine", "Weekly plan")):
                    sb.table("time_blocks").delete().eq("id", b["id"]).execute()

            new_rows = [
                {**block, "user_id": user_id, "date_key": date_key}
                for block in day_blocks.get(offset, [])
            ]
            if new_rows:
                sb.table("time_blocks").insert(new_rows).execute()

            # Keep the Today/Dashboard checklist in sync with what Planner
            # now shows — without this, "today's tasks" stayed whatever was
            # there before (often stale/manually generated) while Planner
            # moved on to the real, cadence-driven schedule.
            existing_tasks = (
                sb.table("tasks").select("id,ai_context")
                .eq("user_id", user_id).eq("date_key", date_key).execute()
            ).data or []
            for t in existing_tasks:
                if (t.get("ai_context") or "").startswith("Weekly plan"):
                    sb.table("tasks").delete().eq("id", t["id"]).execute()

            new_tasks = [
                {
                    "user_id": user_id, "date_key": date_key,
                    "pillar_id": block.get("pillar_id") or "BUILD",
                    "title": block["label"],
                    "estimated_minutes": block["duration_minutes"],
                    "start_time": _minute_to_time(block["start_minute"]),
                    "end_time": _minute_to_time(block["start_minute"] + block["duration_minutes"]),
                    "status": "pending", "is_ai_generated": True,
                    "ai_context": f"Weekly plan — {block.get('notes', 'project session')}",
                    "project_id": block.get("project_id"),
                }
                for block in day_blocks.get(offset, [])
                if block.get("project_id")  # skip the fixed routine layer (sleep/transit/etc.)
            ]
            if new_tasks:
                sb.table("tasks").insert(new_tasks).execute()

            # Return the day's full picture (untouched fixed blocks + what
            # was just placed), sorted for a sane Planner render.
            full = (
                sb.table("time_blocks").select("*")
                .eq("user_id", user_id).eq("date_key", date_key)
                .order("start_minute").execute()
            ).data or []
            result_days.append(WeekPlanDay(date_key=d, day_of_week=offset, blocks=full))

        return WeekPlanResponse(
            week_start=week_start, days=result_days,
            protected_main_quest=main_quest, at_risk_projects=at_risk,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
