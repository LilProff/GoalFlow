import json
from datetime import date, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from backend.config import settings
from backend.models import WeeklyReport

router = APIRouter(prefix="/analytics", tags=["analytics"])


# In-memory store (replace with Supabase)
logs_store: dict[str, list[dict]] = {}


async def call_ai(prompt: str) -> str:
    """Call OpenRouter for insights."""
    models = [settings.openrouter_model] + settings.openrouter_fallback_models
    
    for model in models:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.openrouter_base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://goalflow.app",
                        "X-Title": settings.app_name,
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 250,
                        "temperature": 0.5,
                    },
                )
            
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            
            if resp.status_code in (429, 404):
                continue
            
            raise HTTPException(status_code=502, detail=f"AI error: {resp.status_code}")
            
        except httpx.TimeoutException:
            continue
    
    return "Great work this week! Keep pushing forward."


def calculate_score(log: dict) -> int:
    score = 0
    if log.get("build_done"):
        score += 3
    if log.get("show_done"):
        score += 2
    if log.get("earn_done"):
        score += 2
    if log.get("systemize_done"):
        score += 2
    if log.get("build_hours", 0) >= 4:
        score += 1
    return score


@router.post("/log")
async def log_day(user_id: str, log: dict) -> dict:
    """Save a daily log."""
    if user_id not in logs_store:
        logs_store[user_id] = []
    
    log_date = log.get("date", date.today().isoformat())
    
    existing = [l for l in logs_store[user_id] if l.get("date") == log_date]
    if existing:
        logs_store[user_id] = [l for l in logs_store[user_id] if l.get("date") != log_date]
    
    log["score"] = calculate_score(log)
    logs_store[user_id].append(log)
    
    return {"status": "saved", "score": log["score"]}


@router.get("/history/{user_id}")
async def get_history(user_id: str, days: int = 7) -> list[dict]:
    """Get daily logs for the last N days."""
    if user_id not in logs_store:
        return []
    
    today = date.today()
    start = today - timedelta(days=days)
    
    return [
        l for l in logs_store[user_id]
        if l.get("date") and start.isoformat() <= l["date"] <= today.isoformat()
    ]


@router.get("/summary/{user_id}")
async def get_summary(user_id: str) -> dict:
    """Get analytics summary."""
    if user_id not in logs_store:
        return {
            "total_logs": 0,
            "avg_score": 0,
            "current_streak": 0,
            "build_hours_total": 0,
            "pillars_completed": {"BUILD": 0, "SHOW": 0, "EARN": 0, "SYSTEMIZE": 0},
        }
    
    logs = sorted(logs_store[user_id], key=lambda x: x.get("date", ""))
    if not logs:
        return {
            "total_logs": 0,
            "avg_score": 0,
            "current_streak": 0,
            "build_hours_total": 0,
            "pillars_completed": {"BUILD": 0, "SHOW": 0, "EARN": 0, "SYSTEMIZE": 0},
        }
    
    total_score = sum(l.get("score", 0) for l in logs)
    avg_score = total_score / len(logs) if logs else 0
    build_hours = sum(l.get("build_hours", 0) for l in logs)
    
    pillars = {"BUILD": 0, "SHOW": 0, "EARN": 0, "SYSTEMIZE": 0}
    for log in logs:
        for p in pillars:
            if log.get(f"{p.lower()}_done"):
                pillars[p] += 1
    
    # Calculate streak
    streak = 0
    today = date.today()
    for i in range(30):
        check = (today - timedelta(days=i)).isoformat()
        found = any(l.get("date") == check and l.get("score", 0) >= 5 for l in logs)
        if found:
            streak += 1
        elif i > 0:
            break
    
    return {
        "total_logs": len(logs),
        "avg_score": round(avg_score, 1),
        "current_streak": streak,
        "build_hours_total": round(build_hours, 1),
        "pillars_completed": pillars,
    }


@router.get("/weekly-report/{user_id}", response_model=WeeklyReport)
async def get_weekly_report(user_id: str) -> WeeklyReport:
    """Get AI-generated weekly report."""
    today = date.today()
    week_start = today - timedelta(days=6)
    week_end = today
    
    if user_id not in logs_store:
        return WeeklyReport(
            week_start=week_start,
            week_end=week_end,
            avg_score=0,
            total_build_hours=0,
            pillars_completed={"BUILD": 0, "SHOW": 0, "EARN": 0, "SYSTEMIZE": 0},
            streak=0,
            insights="No data yet. Start logging your daily progress!",
        )
    
    week_logs = [
        l for l in logs_store[user_id]
        if l.get("date") and week_start.isoformat() <= l["date"] <= week_end.isoformat()
    ]
    
    if not week_logs:
        return WeeklyReport(
            week_start=week_start,
            week_end=week_end,
            avg_score=0,
            total_build_hours=0,
            pillars_completed={"BUILD": 0, "SHOW": 0, "EARN": 0, "SYSTEMIZE": 0},
            streak=0,
            insights="No logs this week. Start tracking your progress!",
        )
    
    avg_score = sum(l.get("score", 0) for l in week_logs) / len(week_logs)
    build_hours = sum(l.get("build_hours", 0) for l in week_logs)
    
    pillars = {"BUILD": 0, "SHOW": 0, "EARN": 0, "SYSTEMIZE": 0}
    for log in week_logs:
        for p in pillars:
            if log.get(f"{p.lower()}_done"):
                pillars[p] += 1
    
    streak = sum(1 for l in week_logs if l.get("score", 0) >= 5)
    
    # Generate AI insights
    prompt = f"""You are GoalFlow's AI Coach. Analyze this week's performance:

- Average score: {avg_score:.1f}/10
- Build hours: {build_hours:.1f}
- Pillar completions: BUILD: {pillars['BUILD']}, SHOW: {pillars['SHOW']}, EARN: {pillars['EARN']}, SYSTEMIZE: {pillars['SYSTEMIZE']}
- Days completed (score >= 5): {streak}/7

Write a 2-sentence motivational insight. Be direct and actionable."""
    
    insights = await call_ai(prompt)
    
    return WeeklyReport(
        week_start=week_start,
        week_end=week_end,
        avg_score=round(avg_score, 1),
        total_build_hours=round(build_hours, 1),
        pillars_completed=pillars,
        streak=streak,
        insights=insights,
    )