import json
import re
from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from supabase import Client

from deps import get_current_user, get_supabase
from models import OnboardingStep, GoalImportDraft, GoalImportConfirmRequest
from services.openrouter import call_ai_json
from services.goal_timeline import estimate_target_date
from services.doc_parser import extract_text, UnsupportedImportFile

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
                    goal_type = goal_types.get(pillar_id) or "project"
                    # The form wizard collects one goal per pillar with no
                    # explicit long/short-term choice — treat these as
                    # short-term by default (a flexible, goal_type-aware
                    # window) rather than forcing everyone into the same
                    # fixed 90-day date.
                    sb.table("goals").insert({
                        "user_id": user_id, "pillar_id": pillar_id,
                        "title": goal_text.strip(),
                        "target_date": estimate_target_date("short-term", goal_type).isoformat(),
                        "status": "active", "progress": 0,
                        "goal_type": goal_type,
                        "timeline_type": "short-term",
                        "origin": "manual",
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


# ── AI-import onboarding ────────────────────────────────────────────────
# Third onboarding path alongside the form wizard and in-app chat: the user
# takes a hand-off prompt to their own AI assistant, refines the result
# there, and uploads it here. /import parses it into a draft the user
# reviews and edits in the UI; nothing is persisted until /import/confirm —
# same "AI output always lands as an editable draft" rule the rest of the
# app already follows for generated daily tasks.
IMPORT_EXTRACTION_PROMPT = """The user wrote the following document (with help from their own AI assistant) describing what they want to achieve across their life. Turn it into a structured goal plan.

DOCUMENT:
\"\"\"
{text}
\"\"\"

Rules:
- Map every goal to exactly one pillar: BUILD (deep work/craft), SHOW (visibility/distribution), EARN (revenue/monetization), or SYSTEMIZE (automation/leverage) — pick whichever fits best even if the document doesn't use these words.
- Classify each goal as "long-term" (a multi-month vision-level goal) or "short-term" (a concrete step reachable in weeks). A short-term goal that clearly serves one specific long-term goal should reference it via parent_draft_id.
- Give each goal a goal_type: one of "project", "outcome", "learning", "certification", "habit".
- For each goal, propose 2-4 starter daily tasks that would move it forward, each with estimated_minutes and up to 3 short subtask checklist items.
- Assign each goal a draft_id like "g1", "g2", ... and use those same ids for parent_draft_id references.
- Do not invent goals the document doesn't support — if a life area has nothing concrete in it, leave it out rather than padding the list.

Return ONLY valid JSON matching this exact shape (no markdown fences, no commentary):
{{
  "life_areas_summary": "one short sentence describing the overall picture",
  "goals": [
    {{
      "draft_id": "g1",
      "pillar_id": "BUILD",
      "title": "...",
      "description": "...",
      "timeline_type": "long-term",
      "goal_type": "project",
      "parent_draft_id": null,
      "tasks": [
        {{"title": "...", "description": "...", "estimated_minutes": 45, "subtasks": ["...", "..."]}}
      ]
    }}
  ]
}}"""


def _extract_json_object(raw: str) -> dict:
    """
    Free-tier models occasionally wrap JSON in commentary or fences despite
    instructions not to — strip fences, then take the outermost {...} span
    rather than trusting the whole response is clean JSON.
    """
    clean = re.sub(r"```(?:json)?|```", "", raw).strip()
    start, end = clean.find("{"), clean.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No JSON object found in the model's response.")
    return json.loads(clean[start:end + 1])


@router.post("/import", response_model=GoalImportDraft)
async def import_goals_draft(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
) -> GoalImportDraft:
    content = await file.read()
    try:
        text = extract_text(file.filename or "", content)
    except UnsupportedImportFile as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not text.strip():
        raise HTTPException(status_code=400, detail="That file looks empty.")

    prompt = IMPORT_EXTRACTION_PROMPT.format(text=text[:8000])

    # Free-tier models occasionally return malformed JSON on a nested schema
    # like this one (goals -> tasks -> subtasks) even when the first attempt
    # is otherwise fine — one retry resolves the large majority of these
    # without the user having to re-upload.
    last_error: Exception | None = None
    draft: Optional[GoalImportDraft] = None
    for attempt in range(2):
        try:
            raw = await call_ai_json(prompt, max_tokens=2800, temperature=0.4, smart=True)
            draft = GoalImportDraft(**_extract_json_object(raw))
            break
        except Exception as e:
            last_error = e
            continue

    if draft is None:
        raise HTTPException(status_code=502, detail=f"Couldn't extract goals from that file: {last_error}")

    # Don't trust the model's date arithmetic — propose each target date
    # server-side so the review screen shows a real, consistent date.
    for g in draft.goals:
        if not g.target_date:
            g.target_date = estimate_target_date(g.timeline_type, g.goal_type)

    return draft


@router.post("/import/confirm")
async def confirm_goals_import(
    data: GoalImportConfirmRequest,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    """Persist the (possibly user-edited) draft: long-term goals first, then
    short-term ones resolving parent_draft_id against the real ids just
    created, then each goal's starter tasks."""
    id_map: dict[str, str] = {}
    created_goal_ids: list[str] = []
    today = date.today().isoformat()

    try:
        # Goals with no parent first, so parented ones can resolve a real
        # parent_goal_id afterward (False sorts before True).
        ordered = sorted(data.goals, key=lambda g: g.parent_draft_id is not None)
        for g in ordered:
            target_date = g.target_date or estimate_target_date(g.timeline_type, g.goal_type)
            parent_id = id_map.get(g.parent_draft_id) if g.parent_draft_id else None
            resp = sb.table("goals").insert({
                "user_id":        user_id,
                "pillar_id":      g.pillar_id,
                "title":          g.title,
                "description":    g.description,
                "target_date":    target_date.isoformat(),
                "status":         "active",
                "progress":       0,
                "goal_type":      g.goal_type,
                "timeline_type":  g.timeline_type,
                "origin":         "ai_import",
                "parent_goal_id": parent_id,
            }).execute()
            if not resp.data:
                continue
            new_goal = resp.data[0]
            id_map[g.draft_id] = new_goal["id"]
            created_goal_ids.append(new_goal["id"])

            for t in g.tasks:
                sb.table("tasks").insert({
                    "user_id":           user_id,
                    "date_key":          today,
                    "pillar_id":         g.pillar_id,
                    "title":             t.title,
                    "description":       t.description or "",
                    "estimated_minutes": t.estimated_minutes,
                    "status":            "pending",
                    "is_ai_generated":   True,
                    "ai_context":        f"From goal import: {g.title}",
                    "subtasks":          [{"id": f"st{i}", "title": s, "completed": False} for i, s in enumerate(t.subtasks)],
                }).execute()

        return {"ok": True, "goals_created": len(created_goal_ids)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
