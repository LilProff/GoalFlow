import json
import re
from datetime import date
from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client

from deps import get_current_user, get_supabase, safe_single
from models import (
    TimeBlockCreate, TimeBlockUpdate, TimeBlockResponse,
    PlannerReshuffleRequest, MessageResponse,
)
from services.openrouter import call_ai_json

router = APIRouter(prefix="/planner", tags=["planner"])


# ── Get blocks for a date ─────────────────────────────────────────────────────
@router.get("/", response_model=list[TimeBlockResponse])
async def get_blocks(
    date_key: str = Query(default=None),
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[TimeBlockResponse]:
    target = date_key or date.today().isoformat()
    try:
        resp = (
            sb.table("time_blocks")
            .select("*")
            .eq("user_id", user_id)
            .eq("date_key", target)
            .order("start_minute")
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Create block ──────────────────────────────────────────────────────────────
@router.post("/", response_model=TimeBlockResponse, status_code=201)
async def create_block(
    data: TimeBlockCreate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> TimeBlockResponse:
    try:
        payload = {
            "user_id":          user_id,
            "date_key":         data.date_key.isoformat(),
            "label":            data.label,
            "category":         data.category,
            "start_minute":     data.start_minute,
            "duration_minutes": data.duration_minutes,
            "pillar_id":        data.pillar_id,
            "priority":         data.priority,
            "flexible":         data.flexible,
            "user_editable":    data.user_editable,
            "notes":            data.notes,
        }
        resp = sb.table("time_blocks").insert(payload).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Failed to create block")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Update block ──────────────────────────────────────────────────────────────
@router.patch("/{block_id}", response_model=TimeBlockResponse)
async def update_block(
    block_id: str,
    data: TimeBlockUpdate,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> TimeBlockResponse:
    try:
        update = {k: v for k, v in data.model_dump(exclude_none=True).items() if v is not None}
        if not update:
            raise HTTPException(status_code=400, detail="No fields to update")
        resp = (
            sb.table("time_blocks")
            .update(update)
            .eq("id", block_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Block not found")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Delete block ──────────────────────────────────────────────────────────────
@router.delete("/{block_id}", response_model=MessageResponse)
async def delete_block(
    block_id: str,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> MessageResponse:
    try:
        sb.table("time_blocks").delete().eq("id", block_id).eq("user_id", user_id).execute()
        return MessageResponse(message="Block deleted", success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Bulk save (replace entire day) ────────────────────────────────────────────
@router.put("/bulk", response_model=list[TimeBlockResponse])
async def bulk_save(
    blocks: list[TimeBlockCreate],
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[TimeBlockResponse]:
    """Replace all blocks for the given date with a new set."""
    if not blocks:
        raise HTTPException(status_code=400, detail="No blocks provided")
    target_date = blocks[0].date_key.isoformat()
    try:
        # Delete existing
        sb.table("time_blocks").delete().eq("user_id", user_id).eq("date_key", target_date).execute()
        # Insert new
        rows = [
            {
                "user_id":          user_id,
                "date_key":         b.date_key.isoformat(),
                "label":            b.label,
                "category":         b.category,
                "start_minute":     b.start_minute,
                "duration_minutes": b.duration_minutes,
                "pillar_id":        b.pillar_id,
                "priority":         b.priority,
                "flexible":         b.flexible,
                "user_editable":    b.user_editable,
                "notes":            b.notes,
            }
            for b in blocks
        ]
        resp = sb.table("time_blocks").insert(rows).execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── AI reshuffle ──────────────────────────────────────────────────────────────
@router.post("/reshuffle", response_model=list[TimeBlockResponse])
async def reshuffle_day(
    req: PlannerReshuffleRequest,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[TimeBlockResponse]:
    """Ask Ryna to intelligently reschedule today's remaining blocks."""
    target = (req.date_key or date.today()).isoformat()

    try:
        # Load existing blocks
        blocks_resp = (
            sb.table("time_blocks")
            .select("*")
            .eq("user_id", user_id)
            .eq("date_key", target)
            .order("start_minute")
            .execute()
        )
        blocks = blocks_resp.data or []

        # Load pending tasks for today
        tasks_resp = (
            sb.table("tasks")
            .select("pillar_id,title,estimated_minutes,status,start_time")
            .eq("user_id", user_id)
            .eq("date_key", target)
            .execute()
        )
        tasks = [t for t in (tasks_resp.data or []) if t.get("status") != "completed"]

        # Load profile
        profile_resp = safe_single(sb.table("user_profiles").select("has_9_to_5,work_start_time,work_end_time,coach_style").eq("id", user_id))
        profile = profile_resp.data or {}

        # Separate fixed vs flexible
        fixed_blocks    = [b for b in blocks if not b.get("flexible", True)]
        flexible_blocks = [b for b in blocks if b.get("flexible", True) and not b.get("completed", False)]

        fixed_desc = "\n".join(
            f"  {b['label']} at minute {b['start_minute']} ({b['duration_minutes']}min) [FIXED]"
            for b in fixed_blocks
        ) or "  None"

        flex_desc = "\n".join(
            f"  {b['label']} ({b['duration_minutes']}min, pillar: {b.get('pillar_id', 'N/A')})"
            for b in flexible_blocks
        ) or "  None"

        tasks_desc = "\n".join(
            f"  {t['pillar_id']}: {t['title']} (~{t.get('estimated_minutes', 30)}min)"
            for t in tasks[:8]
        ) or "  None"

        reason = req.reason or "User requested a reshuffle"
        now_minute = __import__("datetime").datetime.now().hour * 60 + __import__("datetime").datetime.now().minute

        prompt = f"""Reshuffle this person's remaining day. Start from minute {now_minute} (current time).

Reason: {reason}
Has 9-5 job: {profile.get('has_9_to_5', False)} ({profile.get('work_start_time', '09:00')}–{profile.get('work_end_time', '17:00')})

Fixed blocks (do NOT move these):
{fixed_desc}

Flexible blocks to reschedule:
{flex_desc}

Pending tasks to fit in (if space):
{tasks_desc}

Rules:
- Never overlap with fixed blocks
- 10-min gaps between blocks
- Group same-pillar work together when possible
- No blocks after 23:00 (minute 1380)
- Return ALL blocks (fixed + reshuffled flexible), not just the moved ones

Return ONLY a JSON array:
[{{"label":"...","category":"work","start_minute":540,"duration_minutes":90,"pillar_id":"BUILD","priority":"high","flexible":false,"user_editable":true,"notes":"..."}}]"""

        raw    = await call_ai_json(prompt, max_tokens=900, temperature=0.3, smart=True)
        clean  = re.sub(r"```(?:json)?|```", "", raw).strip()
        parsed = json.loads(clean)

        if not isinstance(parsed, list):
            raise ValueError("AI did not return a list")

        # Delete existing flexible blocks and insert reshuffled ones
        flex_ids = [b["id"] for b in flexible_blocks if "id" in b]
        if flex_ids:
            for fid in flex_ids:
                sb.table("time_blocks").delete().eq("id", fid).execute()

        new_rows = []
        for block in parsed:
            # Keep fixed blocks as-is (already in DB), only insert new flexible ones
            is_fixed_existing = any(
                f.get("label") == block.get("label") and f.get("start_minute") == block.get("start_minute")
                for f in fixed_blocks
            )
            if not is_fixed_existing:
                new_rows.append({
                    "user_id":          user_id,
                    "date_key":         target,
                    "label":            block.get("label", "Block"),
                    "category":         block.get("category", "work"),
                    "start_minute":     block.get("start_minute", now_minute),
                    "duration_minutes": block.get("duration_minutes", 60),
                    "pillar_id":        block.get("pillar_id"),
                    "priority":         block.get("priority", "medium"),
                    "flexible":         block.get("flexible", True),
                    "user_editable":    block.get("user_editable", True),
                    "notes":            block.get("notes"),
                })

        if new_rows:
            sb.table("time_blocks").insert(new_rows).execute()

        # Return full updated list
        final = (
            sb.table("time_blocks")
            .select("*")
            .eq("user_id", user_id)
            .eq("date_key", target)
            .order("start_minute")
            .execute()
        )
        return final.data or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reshuffle failed: {str(e)}")
