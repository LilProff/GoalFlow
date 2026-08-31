from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from supabase import Client

from deps import get_current_user, get_supabase, safe_single
from models import WeeklyReport
from services.openrouter import call_ai

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ── Summary ───────────────────────────────────────────────────────────────────
@router.get("/summary")
async def get_summary(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    """KPI dashboard summary — pulled from user_stats + recent tasks."""
    try:
        stats_resp = safe_single(sb.table("user_stats").select("*").eq("user_id", user_id))
        stats = stats_resp.data or {"xp": 0, "level": 1, "streak_current": 0, "streak_longest": 0, "weekly_score": 0}

        # 7-day logs for weekly avg
        week_start = (date.today() - timedelta(days=6)).isoformat()
        logs_resp  = (
            sb.table("daily_logs")
            .select("score,build_hours,date_key")
            .eq("user_id", user_id)
            .gte("date_key", week_start)
            .execute()
        )
        logs = logs_resp.data or []

        # Today's tasks
        today = date.today().isoformat()
        tasks_resp = sb.table("tasks").select("status,pillar_id").eq("user_id", user_id).eq("date_key", today).execute()
        tasks = tasks_resp.data or []

        completed   = [t for t in tasks if t.get("status") == "completed"]
        weekly_avg  = round(sum(l.get("score", 0) for l in logs) / len(logs), 1) if logs else 0
        build_hours = round(sum(l.get("build_hours", 0) for l in logs), 1)

        # Pillar distribution from today's tasks
        pillar_dist: dict[str, int] = {}
        for t in completed:
            pid = t.get("pillar_id", "OTHER")
            pillar_dist[pid] = pillar_dist.get(pid, 0) + 1

        # Consistency: days with score >= 5 in last 7
        good_days   = sum(1 for l in logs if l.get("score", 0) >= 5)
        consistency = round((good_days / 7) * 100) if logs else 0

        return {
            "current_score":       round(logs[-1].get("score", 0) if logs else 0, 1),
            "streak":              stats.get("streak_current", 0),
            "streak_longest":      stats.get("streak_longest", 0),
            "level":               stats.get("level", 1),
            "xp":                  stats.get("xp", 0),
            "weekly_avg_score":    weekly_avg,
            "total_tasks_completed": len(completed),
            "build_hours_this_week": build_hours,
            "pillar_distribution": pillar_dist,
            "consistency_score":   consistency,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── History ───────────────────────────────────────────────────────────────────
@router.get("/history")
async def get_history(
    days: int = Query(default=30, ge=1, le=90),
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[dict]:
    """Per-day log history for charts."""
    try:
        start = (date.today() - timedelta(days=days)).isoformat()
        resp  = (
            sb.table("daily_logs")
            .select("date_key,score,build_hours,reflection,pillar_completion")
            .eq("user_id", user_id)
            .gte("date_key", start)
            .lte("date_key", date.today().isoformat())
            .order("date_key", desc=True)
            .execute()
        )
        result = []
        for log in (resp.data or []):
            # Count tasks for that day
            tasks_resp = (
                sb.table("tasks")
                .select("status")
                .eq("user_id", user_id)
                .eq("date_key", log["date_key"])
                .execute()
            )
            t_data = tasks_resp.data or []
            done   = len([t for t in t_data if t.get("status") == "completed"])
            total  = len(t_data)
            result.append({
                "date_key":         log["date_key"],
                "score":            log.get("score", 0),
                "build_hours":      log.get("build_hours", 0),
                "tasks_completed":  done,
                "tasks_total":      total,
                "discipline_score": round(log.get("score", 0) * 10),
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Heatmap (90 days) ─────────────────────────────────────────────────────────
@router.get("/heatmap")
async def get_heatmap(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> list[dict]:
    """90-day activity heatmap data — one entry per day logged."""
    try:
        start = (date.today() - timedelta(days=89)).isoformat()
        resp  = (
            sb.table("daily_logs")
            .select("date_key,score")
            .eq("user_id", user_id)
            .gte("date_key", start)
            .order("date_key")
            .execute()
        )
        return [
            {"date": l["date_key"], "value": l.get("score", 0)}
            for l in (resp.data or [])
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Pillar stats ──────────────────────────────────────────────────────────────
@router.get("/pillars")
async def get_pillar_stats(
    days: int = Query(default=30, ge=7, le=90),
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> dict:
    """Per-pillar task completion stats for the past N days."""
    try:
        start = (date.today() - timedelta(days=days)).isoformat()
        resp  = (
            sb.table("tasks")
            .select("pillar_id,status")
            .eq("user_id", user_id)
            .gte("date_key", start)
            .execute()
        )
        tasks = resp.data or []

        pillars: dict[str, dict] = {}
        for t in tasks:
            pid    = t.get("pillar_id", "OTHER")
            status = t.get("status", "pending")
            if pid not in pillars:
                pillars[pid] = {"total": 0, "completed": 0, "completion_rate": 0}
            pillars[pid]["total"] += 1
            if status == "completed":
                pillars[pid]["completed"] += 1

        for pid, data in pillars.items():
            data["completion_rate"] = round(
                (data["completed"] / data["total"] * 100) if data["total"] else 0
            )

        return pillars
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Weekly report (AI-generated) ─────────────────────────────────────────────
@router.get("/weekly-report", response_model=WeeklyReport)
async def get_weekly_report(
    user_id: str = Depends(get_current_user),
    sb: Client = Depends(get_supabase),
) -> WeeklyReport:
    """AI-generated weekly performance report."""
    try:
        today      = date.today()
        week_start = today - timedelta(days=6)

        logs_resp = (
            sb.table("daily_logs")
            .select("date_key,score,build_hours,pillar_completion")
            .eq("user_id", user_id)
            .gte("date_key", week_start.isoformat())
            .lte("date_key", today.isoformat())
            .execute()
        )
        logs = logs_resp.data or []

        if not logs:
            return WeeklyReport(
                week_start=week_start,
                week_end=today,
                summary="No logs this week. Start tracking your daily progress!",
                highlights=[],
                improvements=["Log your first day to get AI insights."],
                ai_insight="Consistency is your biggest lever. Log every day — even bad days.",
                coach_message="The journey of a thousand miles begins with a single step.",
                next_week_focus=["Log every day", "Complete at least one BUILD task daily"],
            )

        avg_score   = round(sum(l.get("score", 0) for l in logs) / len(logs), 1)
        build_hours = round(sum(l.get("build_hours", 0) for l in logs), 1)
        best_day    = max(logs, key=lambda l: l.get("score", 0))
        good_days   = sum(1 for l in logs if l.get("score", 0) >= 5)

        # Pillar aggregation
        pillar_hits: dict[str, int] = {"BUILD": 0, "SHOW": 0, "EARN": 0, "SYSTEMIZE": 0}
        for l in logs:
            for pid, done in (l.get("pillar_completion") or {}).items():
                if done and pid in pillar_hits:
                    pillar_hits[pid] += 1

        prompt = f"""You are GoalFlow's performance analyst. Analyze this week and give a sharp, honest report.

Week: {week_start} to {today}
Days logged: {len(logs)}/7
Average score: {avg_score}/10
Build hours: {build_hours}h
Good days (score ≥ 5): {good_days}/7
Best day: {best_day['date_key']} (score {best_day.get('score', 0)})
Pillar completions — BUILD:{pillar_hits['BUILD']} SHOW:{pillar_hits['SHOW']} EARN:{pillar_hits['EARN']} SYSTEMIZE:{pillar_hits['SYSTEMIZE']}

Return ONLY valid JSON (no fences):
{{
  "summary": "2-sentence honest week summary",
  "highlights": ["top win 1", "top win 2"],
  "improvements": ["area to improve 1", "area to improve 2"],
  "ai_insight": "1 data-driven insight",
  "coach_message": "1 motivational sentence",
  "next_week_focus": ["priority 1", "priority 2", "priority 3"]
}}"""

        raw = await call_ai(prompt, max_tokens=500, temperature=0.4, smart=True)

        import json, re
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        data  = json.loads(clean)

        return WeeklyReport(
            week_start=week_start,
            week_end=today,
            summary=data.get("summary", ""),
            highlights=data.get("highlights", []),
            improvements=data.get("improvements", []),
            ai_insight=data.get("ai_insight", ""),
            coach_message=data.get("coach_message", ""),
            next_week_focus=data.get("next_week_focus", []),
        )
    except Exception as e:
        # Graceful fallback — never 500 on report endpoint
        today      = date.today()
        week_start = today - timedelta(days=6)
        return WeeklyReport(
            week_start=week_start,
            week_end=today,
            summary="Report generation encountered an issue. Your data is safe.",
            highlights=[],
            improvements=[],
            ai_insight="",
            coach_message="Keep showing up.",
            next_week_focus=[],
        )
