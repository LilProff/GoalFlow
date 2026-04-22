import json
import re
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from backend.config import settings
from backend.models import RynaChatRequest, RynaInsightRequest, RynaResponse

router = APIRouter(prefix="/ryna", tags=["ryna"])


# In-memory conversation store
conversations: dict[str, list[dict]] = {}


async def call_ai(prompt: str) -> str:
    """Call OpenRouter with fallback."""
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
                        "max_tokens": 300,
                        "temperature": 0.6,
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
    
    return "I'm having trouble connecting. Let me try again."


@router.post("/chat", response_model=RynaResponse)
async def chat(req: RynaChatRequest) -> RynaResponse:
    """Chat with Ryna AI Coach."""
    user_id = req.user_id
    goals = req.pillar_goals
    log = req.current_log
    stats = req.stats
    style = req.coaching_style
    
    # Build context
    build_goal = goals.get("BUILD", "")
    show_goal = goals.get("SHOW", "")
    earn_goal = goals.get("EARN", "")
    systemize_goal = goals.get("SYSTEMIZE", "")
    
    score = 0
    if log.get("build_done"):
        score += 3
    if log.get("show_done"):
        score += 2
    if log.get("earn_done"):
        score += 2
    if log.get("systemize_done"):
        score += 2
    
    # Style-specific prompts
    style_prompts = {
        "drill_sergeant": "Be strict, direct, high accountability. No excuses.",
        "balanced": "Be direct but encouraging. Balance truth with motivation.",
        "gentle": "Be supportive and patient. Focus on progress, not perfection.",
    }
    
    style_guide = style_prompts.get(style, style_prompts["balanced"])
    
    prompt = f"""You are Ryna, GoalFlow's AI Coach. {style_guide}

Current Status:
- Today's score: {score}/10
- Current streak: {stats.get('streak_current', 0)} days
- XP: {stats.get('xp', 0)}
- Level: {stats.get('level', 'beginner')}

Your Goals:
- BUILD: {build_goal}
- SHOW: {show_goal}
- EARN: {earn_goal}
- SYSTEMIZE: {systemize_goal}

Today:
- BUILD: {'✓' if log.get('build_done') else '○'}
- SHOW: {'✓' if log.get('show_done') else '○'}
- EARN: {'✓' if log.get('earn_done') else '○'}
- SYSTEMIZE: {'✓' if log.get('systemize_done') else '○'}
- Build hours: {log.get('build_hours', 0)}h

User says: "{req.query}"

Respond as Ryna. Keep it brief (2-3 sentences). Be helpful and actionable."""
    
    response = await call_ai(prompt)
    
    # Store conversation
    if user_id not in conversations:
        conversations[user_id] = []
    conversations[user_id].append({
        "role": "user",
        "content": req.query,
    })
    conversations[user_id].append({
        "role": "ryna",
        "content": response,
    })
    
    return RynaResponse(response=response, action=None)


@router.post("/insight", response_model=RynaResponse)
async def daily_insight(req: RynaInsightRequest) -> RynaResponse:
    """Get daily morning insight."""
    user_id = req.user_id
    goals = req.pillar_goals
    log = req.current_log
    last_7 = req.last_7_days
    
    build_goal = goals.get("BUILD", "")
    show_goal = goals.get("SHOW", "")
    earn_goal = goals.get("EARN", "")
    systemize_goal = goals.get("SYSTEMIZE", "")
    
    score = 0
    if log.get("build_done"):
        score += 3
    if log.get("show_done"):
        score += 2
    if log.get("earn_done"):
        score += 2
    if log.get("systemize_done"):
        score += 2
    
    # Calculate trends
    scores = [s.get("score", 0) for s in last_7]
    avg = sum(scores) / len(scores) if scores else 0
    trend = "improving" if avg > 5 else "needs work"
    
    prompt = f"""You are Ryna, GoalFlow's AI Coach. Give a daily morning insight.

Current Goals:
- BUILD: {build_goal}
- SHOW: {show_goal}
- EARN: {earn_goal}
- SYSTEMIZE: {systemize_goal}

Yesterday: {score}/10
Last 7 days average: {avg:.1f}/10 ({trend})

Today is a new day. Write a 2-sentence daily insight and list 1 priority focus for each pillar.

Format:
🔮 Daily Insight: [your insight]

Today's Focus:
• BUILD: [task]
• SHOW: [task]
• EARN: [task]
• SYSTEMIZE: [task]"""
    
    response = await call_ai(prompt)
    
    return RynaResponse(response=response, action=None)


@router.get("/history/{user_id}")
async def get_conversation_history(user_id: str) -> list[dict]:
    """Get conversation history."""
    return conversations.get(user_id, [])