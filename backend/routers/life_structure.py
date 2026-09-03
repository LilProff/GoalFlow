"""
Turns a free-form "here's my life" document — daily routine + the cadenced
work that fills it — into structured Routine blocks and Projects. Same
review-before-commit shape as onboarding's AI-import (routers/onboarding.py):
extract to a draft, let the user edit it, only persist on explicit confirm.

Deliberately a separate pipeline from AI-import rather than extending it:
AI-import extracts *goals* (a target-dated outcome); this extracts a
*routine container* and *cadenced projects* (recurring work with no target
date) — different shapes, different destination tables.
"""
import json
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from supabase import Client

from deps import get_current_user, get_supabase
from models import LifeStructureDraft, LifeStructureConfirmRequest
from services.openrouter import call_ai_json
from services.doc_parser import extract_text, UnsupportedImportFile

router = APIRouter(prefix="/life-structure", tags=["life-structure"])


EXTRACTION_PROMPT = """The user wrote the following document describing their daily routine and the ongoing work/projects that fill it — NOT one-off goals with deadlines, but recurring commitments with a cadence ("daily", "2x/week", "Fridays only").

DOCUMENT:
\"\"\"
{text}
\"\"\"

Extract two things:

1. ROUTINE BLOCKS — the fixed daily container (sleep, prayer/exercise, transit, meals, deep-work windows, open/flexible windows, study blocks). Convert every time to minutes since midnight (e.g. 6:45am = 405, 1:00pm = 780). If a day differs from the rest (e.g. "Friday: no transit", "weekends: 2-6pm only"), emit SEPARATE routine block entries with the differing days_of_week rather than forcing one block to cover every day incorrectly.
   - slot_type: one of "sleep","routine","transit","deep_work","open","evening_build","night_study","buffer" — pick whichever best matches what the block is for.
   - is_schedulable: true only for blocks work can actually be placed into (deep_work, open, evening_build, night_study). false for sleep/routine/transit/buffer — those are the container, not workable time.
   - category: one of "sleep","spiritual","exercise","transit","deepwork","meals","admin","show","earn","buffer","personal","learning","social","health","work" — for how it renders on the timeline.
   - days_of_week: array using 0=Monday .. 6=Sunday.

2. PROJECTS — every ongoing body of work with a cadence. Map each to:
   - pillar_id: BUILD (deep work/craft), SHOW (visibility/distribution), EARN (revenue/monetization), or SYSTEMIZE (automation/leverage) — whichever fits best.
   - kind: "work" (a job/employer), "startup" (cofounding/founding), "personal_build" (own tools/products), "learning" (courses/certs/study), "content" (publishing/audience), "outreach" (sales/applications/cold contact), "health", "relationships", or "other".
   - cadence_type + the matching field: "daily" (every day), "weekly" (set sessions_per_week), "fixed_day" (set cadence_days, 0=Mon..6=Sun), or "flexible" (no obligation, fill spare room only).
   - slot_types: which routine slot_types (from part 1) this fits into — e.g. a day-job goes in "deep_work", nightly study in "night_study". Empty array if it could go anywhere schedulable.
   - session_minutes: a reasonable single-session length given how the document describes it.
   - is_main_quest: true for AT MOST ONE project — the single thing that should be protected first if the document names one (e.g. "pick a main quest among X, Y, Z" implies none is chosen yet — leave all false and raise it in open_questions instead).
   - needs_clarification: fill this in on any project the document itself flags as uncertain (status unconfirmed, no cadence given, dormant vs active, no target date) — otherwise leave it null. Do not invent a cadence the document doesn't support.
   - Do not turn a single-mention placeholder with no cadence/detail into a project — put it in open_questions instead.

Assign every entry a draft_id like "r1","r2"... for routine blocks and "p1","p2"... for projects.

Return ONLY valid JSON matching this exact shape (no markdown fences, no commentary):
{{
  "summary": "one short sentence describing the overall picture",
  "routine_blocks": [
    {{"draft_id":"r1","label":"Sleep","start_minute":0,"end_minute":360,"days_of_week":[0,1,2,3,4,5,6],"slot_type":"sleep","is_schedulable":false,"category":"sleep"}}
  ],
  "projects": [
    {{"draft_id":"p1","name":"...","description":"...","kind":"work","pillar_id":"BUILD","cadence_type":"daily","sessions_per_week":7,"cadence_days":[],"slot_types":["deep_work"],"session_minutes":120,"is_main_quest":false,"priority":2,"needs_clarification":null}}
  ],
  "open_questions": ["..."]
}}"""


def _extract_json_object(raw: str) -> dict:
    clean = re.sub(r"```(?:json)?|```", "", raw).strip()
    start, end = clean.find("{"), clean.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("No JSON object found in the model's response.")
    return json.loads(clean[start:end + 1])


@router.post("/import", response_model=LifeStructureDraft)
async def import_life_structure(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
) -> LifeStructureDraft:
    content = await file.read()
    try:
        text = extract_text(file.filename or "", content)
    except UnsupportedImportFile as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not text.strip():
        raise HTTPException(status_code=400, detail="That file looks empty.")

    prompt = EXTRACTION_PROMPT.format(text=text[:10000])

    last_error: Optional[Exception] = None
    draft: Optional[LifeStructureDraft] = None
    for attempt in range(2):
        try:
            raw = await call_ai_json(prompt, max_tokens=4500, temperature=0.35, smart=True)
            draft = LifeStructureDraft(**_extract_json_object(raw))
            break
        except Exception as e:
            last_error = e
            continue

    if draft is None:
        raise HTTPException(status_code=502, detail=f"Couldn't extract a routine/project structure from that file: {last_error}")

    return draft


@router.post("/import/confirm")
async def confirm_life_structure(
    data: LifeStructureConfirmRequest,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    try:
        routine_created = 0
        for r in data.routine_blocks:
            resp = sb.table("routine_blocks").insert({
                "user_id":       user_id,
                "label":         r.label,
                "start_minute":  r.start_minute,
                "end_minute":    r.end_minute,
                "days_of_week":  r.days_of_week,
                "slot_type":     r.slot_type,
                "is_schedulable": r.is_schedulable,
                "category":      r.category,
            }).execute()
            if resp.data:
                routine_created += 1

        projects_created = 0
        for p in data.projects:
            resp = sb.table("projects").insert({
                "user_id":            user_id,
                "name":               p.name,
                "description":        p.description,
                "pillar_id":          p.pillar_id,
                "kind":               p.kind,
                "status":             "active",
                "cadence_type":       p.cadence_type,
                "sessions_per_week":  p.sessions_per_week,
                "cadence_days":       p.cadence_days,
                "slot_types":         p.slot_types,
                "session_minutes":    p.session_minutes,
                "is_main_quest":      p.is_main_quest,
                "priority":           p.priority,
            }).execute()
            if resp.data:
                projects_created += 1

        return {"ok": True, "routine_blocks_created": routine_created, "projects_created": projects_created}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
