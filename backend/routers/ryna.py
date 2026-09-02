from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from deps import get_current_user, get_supabase, safe_single
from models import RynaChatRequest, RynaInsightRequest, RynaResponse
from services.openrouter import call_ai

router = APIRouter(prefix="/ryna", tags=["ryna"])

# ── Coach style prompts ────────────────────────────────────────────────────────
STYLE_PROMPTS: dict[str, str] = {
    "drill-sergeant": "Be strict, blunt, and demanding. No excuses, no coddling. Call out failures directly.",
    "mentor":         "Be wise and guiding. Ask questions that help the user discover answers themselves.",
    "cheerleader":    "Be enthusiastic and celebratory. Amplify every win. Keep energy sky-high.",
    "strategist":     "Be analytical and tactical. Focus on what moves the needle. Prioritize ruthlessly.",
    "philosopher":    "Be reflective and big-picture. Connect daily actions to deeper purpose.",
}


def _build_system_prompt(coach_style: str) -> str:
    style_guide = STYLE_PROMPTS.get(coach_style, STYLE_PROMPTS["strategist"])
    return (
        f"You are Ryna, GoalFlow's AI performance coach. {style_guide} "
        "Keep responses under 3 sentences unless asked for detail. "
        "Be specific, not generic. Never be preachy."
    )


async def _load_conversation(sb: Client, user_id: str) -> list[dict]:
    """Load today's conversation from Supabase."""
    today = date.today().isoformat()
    try:
        resp = safe_single(
            sb.table("ryna_conversations")
            .select("messages")
            .eq("user_id", user_id)
            .eq("date_key", today)
        )
        if resp and resp.data:
            return resp.data.get("messages", [])
    except Exception:
        pass
    return []


async def _save_conversation(sb: Client, user_id: str, messages: list[dict]) -> None:
    """Persist conversation to Supabase (upsert by user+date)."""
    today = date.today().isoformat()
    try:
        sb.table("ryna_conversations").upsert(
            {"user_id": user_id, "date_key": today, "messages": messages},
            on_conflict="user_id,date_key",
        ).execute()
    except Exception:
        pass  # Don't crash on persistence failure


# ── Chat ──────────────────────────────────────────────────────────────────────
@router.post("/chat", response_model=RynaResponse)
async def chat(
    req: RynaChatRequest,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> RynaResponse:
    """Chat with Ryna — context-aware, persistent per day."""
    today = date.today().isoformat()

    # ── Gather context from Supabase ──
    stats_resp   = safe_single(sb.table("user_stats").select("*").eq("user_id", user_id))
    profile_resp = safe_single(sb.table("user_profiles").select("name,coach_style,wake_time,sleep_time,deep_work_windows").eq("id", user_id))
    tasks_resp   = sb.table("tasks").select("pillar_id,title,status").eq("user_id", user_id).eq("date_key", today).execute()
    goals_resp   = sb.table("goals").select("pillar_id,title,progress").eq("user_id", user_id).eq("status", "active").execute()

    stats   = stats_resp.data   or {"xp": 0, "level": 1, "streak_current": 0, "streak_longest": 0}
    profile = profile_resp.data or {}
    tasks   = tasks_resp.data   or []
    goals   = goals_resp.data   or []

    coach_style    = req.coaching_style or profile.get("coach_style", "strategist")
    completed_cnt  = len([t for t in tasks if t.get("status") == "completed"])
    goals_summary  = "\n".join(f"  • {g['pillar_id']}: {g['title']} ({g.get('progress', 0)}%)" for g in goals) or "  No active goals yet."

    # Availability — only surfaced when the user has actually set it (Settings
    # → Schedule / onboarding), so Ryna doesn't act on an assumed default.
    availability_line = ""
    if profile.get("wake_time") or profile.get("sleep_time"):
        windows = profile.get("deep_work_windows") or []
        windows_desc = ", ".join(f"{w.get('start')}–{w.get('end')}" for w in windows if w.get("start") and w.get("end"))
        availability_line = (
            f"Awake hours: {profile.get('wake_time') or '?'}–{profile.get('sleep_time') or '?'}"
            + (f" | Deep-work windows: {windows_desc}" if windows_desc else "")
        )

    # ── Load conversation history for continuity ──
    history = await _load_conversation(sb, user_id)

    # ── Build prompt ──
    context_block = f"""
User stats: Level {stats.get('level', 1)} | {stats.get('xp', 0)} XP | 🔥 {stats.get('streak_current', 0)} day streak
Today: {completed_cnt}/{len(tasks)} tasks completed
{availability_line}
Active goals:
{goals_summary}
""".strip()

    # Recent history (last 6 messages) for conversational continuity
    recent = history[-6:] if len(history) > 6 else history
    history_text = ""
    if recent:
        history_text = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Ryna'}: {m['content']}"
            for m in recent
        )
        history_text = f"\nRecent conversation:\n{history_text}\n"

    prompt = f"""{context_block}
{history_text}
User says: "{req.query}"

Respond as Ryna. Be concise (2-3 sentences max) unless asked for a plan or breakdown."""

    system = _build_system_prompt(coach_style)
    response_text = await call_ai(prompt, system=system, max_tokens=300, temperature=0.65)

    # ── Persist updated history ──
    history.append({"role": "user",    "content": req.query,         "ts": datetime.utcnow().isoformat()})
    history.append({"role": "assistant", "content": response_text,   "ts": datetime.utcnow().isoformat()})
    await _save_conversation(sb, user_id, history)

    return RynaResponse(response=response_text, action=None)


# ── Morning insight ───────────────────────────────────────────────────────────
@router.post("/insight", response_model=RynaResponse)
async def daily_insight(
    req: RynaInsightRequest,
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> RynaResponse:
    """AI-generated morning briefing using live Supabase data."""
    today = date.today().isoformat()

    stats_resp  = safe_single(sb.table("user_stats").select("*").eq("user_id", user_id))
    profile_resp = safe_single(sb.table("user_profiles").select("name,coach_style").eq("id", user_id))
    goals_resp  = sb.table("goals").select("pillar_id,title,progress").eq("user_id", user_id).eq("status", "active").execute()
    logs_resp   = (
        sb.table("daily_logs")
        .select("date_key,score,build_hours")
        .eq("user_id", user_id)
        .gte("date_key", (date.today() - __import__("datetime").timedelta(days=7)).isoformat())
        .order("date_key", desc=True)
        .execute()
    )

    stats   = stats_resp.data   or {"xp": 0, "level": 1, "streak_current": 0}
    profile = profile_resp.data or {}
    goals   = goals_resp.data   or []
    logs    = logs_resp.data    or []

    coach_style  = profile.get("coach_style", "strategist")
    name         = profile.get("name", "Champion")
    scores       = [l.get("score", 0) for l in logs]
    avg_score    = round(sum(scores) / len(scores), 1) if scores else 0
    goals_lines  = "\n".join(f"  • {g['pillar_id']}: {g['title']}" for g in goals) or "  No goals yet."

    prompt = f"""Good morning, {name}!

Stats: Level {stats.get('level', 1)} | {stats.get('streak_current', 0)}-day streak | 7-day avg score: {avg_score}/10

Active goals:
{goals_lines}

Generate a morning briefing:
1. One punchy motivational sentence (2 sentences max)
2. Today's #1 priority focus

Keep it tight and energizing."""

    system = _build_system_prompt(coach_style)
    response_text = await call_ai(prompt, system=system, max_tokens=250, temperature=0.7)

    return RynaResponse(response=response_text, action=None)


# ── Conversation history ──────────────────────────────────────────────────────
@router.get("/history")
async def get_history(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[dict]:
    """Return today's conversation history for this user."""
    return await _load_conversation(sb, user_id)


@router.delete("/history")
async def clear_history(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    """Clear today's conversation (start fresh)."""
    today = date.today().isoformat()
    try:
        sb.table("ryna_conversations").delete().eq("user_id", user_id).eq("date_key", today).execute()
    except Exception:
        pass
    return {"ok": True}
