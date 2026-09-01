import json
import re
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client

from deps import get_current_user, get_supabase, safe_single
from models import GoalCreate, GoalUpdate, GoalResponse, GoalReplanResponse, MilestoneCreate, MilestoneUpdate, MessageResponse
from services.openrouter import call_ai
from services.goal_timeline import estimate_target_date, compute_pace, propose_replan

router = APIRouter(prefix="/goals", tags=["goals"])


def _attach_milestones(goal: dict, milestones: list[dict]) -> dict:
    """Merge milestone list into a goal dict."""
    return {**goal, "milestones": milestones}


def _attach_pace(goal: dict) -> dict:
    """
    Compute today's pace (ahead/on_track/behind) against the goal's current
    target date. Read-only — never written back to the DB, so it's always
    fresh rather than a stale snapshot from whenever it was last saved.
    """
    try:
        created_raw = goal.get("created_at")
        created_at = (
            datetime.fromisoformat(created_raw.replace("Z", "+00:00")).date()
            if isinstance(created_raw, str) else date.today()
        )
        target = goal.get("target_date")
        target_date = date.fromisoformat(target) if isinstance(target, str) else target
        if not target_date:
            return goal
        pace = compute_pace(goal.get("progress", 0), created_at, target_date)
    except Exception:
        # Pace is a nice-to-have readout, not core data — never let a bad
        # timestamp take the whole goals list down.
        return goal
    return {**goal, "pace": pace}


# ── List goals (with milestones via PostgREST join) ───────────────────────────
@router.get("/", response_model=list[GoalResponse])
async def list_goals(
    status: str = Query(default=None),
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[GoalResponse]:
    try:
        q = sb.table("goals").select("*, milestones(*)").eq("user_id", user_id)
        if status:
            q = q.eq("status", status)
        resp = q.order("created_at", desc=True).execute()
        return [_attach_pace(g) for g in (resp.data or [])]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Get single goal ───────────────────────────────────────────────────────────
@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> GoalResponse:
    try:
        resp = (
            sb.table("goals")
            .select("*, milestones(*)")
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Goal not found")
        return _attach_pace(resp.data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Create goal ───────────────────────────────────────────────────────────────
@router.post("/", response_model=GoalResponse, status_code=201)
async def create_goal(
    data: GoalCreate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> GoalResponse:
    try:
        # Manual creation (Goals.tsx) sends a target_date the user picked;
        # callers that don't have one yet (the AI-import confirm step) get
        # one proposed instead of falling back to a hardcoded window.
        target_date = data.target_date or estimate_target_date(data.timeline_type, data.goal_type)
        payload = {
            "user_id":          user_id,
            "pillar_id":        data.pillar_id,
            "title":            data.title,
            "description":      data.description,
            "target_date":      target_date.isoformat(),
            "status":           data.status,
            "progress":         data.progress,
            "goal_type":        data.goal_type,
            "weekly_kpis":      data.weekly_kpis or [],
            "weekly_plan":      data.weekly_plan,
            "strategy":         data.strategy,
            "parent_goal_id":   data.parent_goal_id,
            "timeline_type":    data.timeline_type,
            "origin":           data.origin,
        }
        resp = sb.table("goals").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create goal")
        goal = resp.data[0]
        goal_id = goal["id"]

        # Insert milestones separately into the milestones table
        milestones: list[dict] = []
        if data.milestones:
            ms_rows = [
                {
                    "goal_id":   goal_id,
                    "title":     m.title,
                    "due_date":  m.due_date.isoformat(),
                    "completed": m.completed,
                }
                for m in data.milestones
            ]
            ms_resp = sb.table("milestones").insert(ms_rows).execute()
            milestones = ms_resp.data or []

        return _attach_pace(_attach_milestones(goal, milestones))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Update goal ───────────────────────────────────────────────────────────────
@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> GoalResponse:
    try:
        update = {k: v for k, v in data.model_dump(exclude_none=True).items() if v is not None}
        if "target_date" in update and isinstance(update["target_date"], date):
            update["target_date"] = update["target_date"].isoformat()
        if not update:
            raise HTTPException(status_code=400, detail="No fields to update")
        resp = (
            sb.table("goals")
            .update(update)
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Goal not found")
        goal = resp.data[0]

        # Fetch milestones
        ms_resp = sb.table("milestones").select("*").eq("goal_id", goal_id).execute()
        return _attach_pace(_attach_milestones(goal, ms_resp.data or []))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Delete goal ───────────────────────────────────────────────────────────────
@router.delete("/{goal_id}", response_model=MessageResponse)
async def delete_goal(
    goal_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> MessageResponse:
    try:
        sb.table("goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()
        return MessageResponse(message="Goal deleted", success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Milestones ────────────────────────────────────────────────────────────────
@router.get("/{goal_id}/milestones")
async def get_milestones(
    goal_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[dict]:
    try:
        # Verify ownership via goal
        check = safe_single(sb.table("goals").select("id").eq("id", goal_id).eq("user_id", user_id))
        if not check.data:
            raise HTTPException(status_code=404, detail="Goal not found")
        resp = sb.table("milestones").select("*").eq("goal_id", goal_id).order("due_date").execute()
        return resp.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{goal_id}/milestones", status_code=201)
async def add_milestone(
    goal_id: str,
    data: MilestoneCreate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    try:
        check = safe_single(sb.table("goals").select("id").eq("id", goal_id).eq("user_id", user_id))
        if not check.data:
            raise HTTPException(status_code=404, detail="Goal not found")
        resp = sb.table("milestones").insert({
            "goal_id":   goal_id,
            "title":     data.title,
            "due_date":  data.due_date.isoformat(),
            "completed": data.completed,
        }).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create milestone")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{goal_id}/milestones/{milestone_id}")
async def update_milestone(
    goal_id: str,
    milestone_id: str,
    data: MilestoneUpdate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    try:
        # Verify ownership
        check = safe_single(sb.table("goals").select("id").eq("id", goal_id).eq("user_id", user_id))
        if not check.data:
            raise HTTPException(status_code=404, detail="Goal not found")

        patch = {k: v for k, v in data.model_dump(exclude_none=True).items() if v is not None}
        if "due_date" in patch and isinstance(patch["due_date"], date):
            patch["due_date"] = patch["due_date"].isoformat()
        if not patch:
            raise HTTPException(status_code=400, detail="No fields to update")

        resp = sb.table("milestones").update(patch).eq("id", milestone_id).eq("goal_id", goal_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Milestone not found")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{goal_id}/milestones/{milestone_id}", response_model=MessageResponse)
async def delete_milestone(
    goal_id: str,
    milestone_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> MessageResponse:
    try:
        check = safe_single(sb.table("goals").select("id").eq("id", goal_id).eq("user_id", user_id))
        if not check.data:
            raise HTTPException(status_code=404, detail="Goal not found")
        sb.table("milestones").delete().eq("id", milestone_id).eq("goal_id", goal_id).execute()
        return MessageResponse(message="Milestone deleted", success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Progress update ───────────────────────────────────────────────────────────
@router.patch("/{goal_id}/progress")
async def update_progress(
    goal_id: str,
    progress: int = Query(..., ge=0, le=100),
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    """Update goal progress (0-100). Auto-completes goal at 100."""
    try:
        update: dict = {"progress": progress}
        if progress >= 100:
            update["status"] = "completed"
        resp = (
            sb.table("goals")
            .update(update)
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Goal not found")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── AI weekly plan ────────────────────────────────────────────────────────────
@router.post("/{goal_id}/plan")
async def generate_weekly_plan(
    goal_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    """Generate an AI weekly action plan for a specific goal."""
    try:
        goal_resp = (
            sb.table("goals")
            .select("*")
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not goal_resp.data:
            raise HTTPException(status_code=404, detail="Goal not found")
        goal = goal_resp.data

        ms_resp = sb.table("milestones").select("*").eq("goal_id", goal_id).execute()
        milestones = ms_resp.data or []

        profile_resp = safe_single(sb.table("user_profiles").select("name,coach_style,has_9_to_5").eq("id", user_id))
        profile = profile_resp.data or {}

        milestones_text = "\n".join(
            f"  {'✓' if m.get('completed') else '○'} {m.get('title', '')} (due {m.get('due_date', '')})"
            for m in milestones
        ) or "  None defined yet"

        prompt = f"""Create a focused 7-day action plan for this goal.

Goal: {goal['title']} [{goal['pillar_id']}]
Description: {goal.get('description', 'N/A')}
Target date: {goal.get('target_date')}
Progress: {goal.get('progress', 0)}%
Coach style: {profile.get('coach_style', 'strategist')}
Has 9-5 job: {profile.get('has_9_to_5', False)}

Milestones:
{milestones_text}

Return ONLY valid JSON (no fences):
{{
  "week_theme": "one-line theme for this week",
  "daily_actions": [
    {{"day": "Mon", "action": "...", "duration_min": 60}},
    {{"day": "Tue", "action": "...", "duration_min": 60}},
    {{"day": "Wed", "action": "...", "duration_min": 60}},
    {{"day": "Thu", "action": "...", "duration_min": 60}},
    {{"day": "Fri", "action": "...", "duration_min": 60}},
    {{"day": "Sat", "action": "...", "duration_min": 90}},
    {{"day": "Sun", "action": "...", "duration_min": 30}}
  ],
  "success_metric": "how to know this week was a win",
  "obstacles": ["potential obstacle 1", "potential obstacle 2"],
  "coach_note": "one sentence from Ryna"
}}"""

        raw   = await call_ai(prompt, max_tokens=600, temperature=0.35, smart=True)
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        plan  = json.loads(clean)

        # Persist plan text to goal record
        sb.table("goals").update({"weekly_plan": json.dumps(plan)}).eq("id", goal_id).eq("user_id", user_id).execute()

        return plan
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Adjust timeline (adaptive replan) ──────────────────────────────────────────
@router.post("/{goal_id}/replan", response_model=GoalReplanResponse)
async def replan_goal(
    goal_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> GoalReplanResponse:
    """
    Explicit, user/Ryna-triggered timeline adjustment — never runs on its
    own in the background (there's no scheduler in this backend). Recomputes
    pace, proposes a new target date if the goal is meaningfully ahead or
    behind, and records why in timeline_history rather than silently moving
    the deadline.
    """
    try:
        goal_resp = (
            sb.table("goals")
            .select("*")
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if not goal_resp.data:
            raise HTTPException(status_code=404, detail="Goal not found")
        goal = goal_resp.data

        created_at = datetime.fromisoformat(str(goal["created_at"]).replace("Z", "+00:00")).date()
        current_target = date.fromisoformat(str(goal["target_date"]))
        pace = compute_pace(goal.get("progress", 0), created_at, current_target)
        new_target = propose_replan(pace, current_target)

        coach_note: Optional[str] = None
        if new_target != current_target:
            history = list(goal.get("timeline_history") or [])
            history.append({
                "from_date": current_target.isoformat(),
                "to_date":   new_target.isoformat(),
                "reason":    f"{pace['status']} pace ({pace['expected_progress']}% expected vs {goal.get('progress', 0)}% actual)",
                "adjusted_at": datetime.utcnow().isoformat(),
            })
            update_resp = (
                sb.table("goals")
                .update({"target_date": new_target.isoformat(), "timeline_history": history})
                .eq("id", goal_id)
                .eq("user_id", user_id)
                .execute()
            )
            goal = update_resp.data[0] if update_resp.data else {**goal, "target_date": new_target.isoformat(), "timeline_history": history}

            try:
                coach_note = await call_ai(
                    f"""In one short, encouraging sentence, tell the user their goal timeline for
"{goal['title']}" was just adjusted because they're running {pace['status']} of pace
(expected {pace['expected_progress']}% progress, actually at {goal.get('progress', 0)}%).
The new target date is {new_target.isoformat()}. Don't lecture — be matter-of-fact and forward-looking.""",
                    max_tokens=80, temperature=0.6,
                )
            except Exception:
                coach_note = None

        ms_resp = sb.table("milestones").select("*").eq("goal_id", goal_id).execute()
        return GoalReplanResponse(
            goal=_attach_pace(_attach_milestones(goal, ms_resp.data or [])),
            coach_note=coach_note,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
