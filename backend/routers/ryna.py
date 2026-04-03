import json
import re
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from datetime import datetime

from backend.config import settings
from backend.models import RynaChatRequest, RynaReshuffleRequest, RynaResponse

router = APIRouter(prefix="/ryna", tags=["ryna"])


# ── AI call helper ───────────────────────────────────────────────────────────

async def call_ai(prompt: str) -> str:
    """Call OpenRouter with automatic model fallback on 429/404."""
    models = [settings.openrouter_model] + settings.openrouter_fallback_models
    last_error = ""

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
                        "response_format": {"type": "json_object"},
                        "temperature": 0.7,
                    },
                )

            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                print(f"[Ryna] Used model: {model}")
                return content

            # Rate limited or unavailable — try next model
            if resp.status_code in (429, 404):
                last_error = f"{model}: {resp.status_code}"
                continue

            # Other error — raise immediately
            raise HTTPException(
                status_code=502,
                detail=f"OpenRouter error {resp.status_code} ({model}): {resp.text[:300]}",
            )

        except httpx.TimeoutException:
            last_error = f"{model}: timeout"
            continue

    raise HTTPException(
        status_code=502,
        detail=f"All AI models unavailable. Last error: {last_error}",
    )


def extract_json(text: str) -> dict[str, Any]:
    """Robust JSON extraction — handles markdown fences and embedded JSON."""
    # Strip ```json ... ``` fences
    cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned)

    # Try whole string
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Find first { } block
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        return json.loads(match.group(0))

    raise ValueError(f"No valid JSON in AI response: {text[:200]}")


def get_7day_summary(history: dict[str, Any]) -> str:
    lines = []
    for key, data in sorted(history.items(), reverse=True)[:7]:
        tasks = data.get("tasks", [])
        if not tasks:
            continue
        done = sum(1 for t in tasks if t.get("completed"))
        rate = round((done / len(tasks)) * 100)
        lines.append(f"{key}: {rate}% ({done}/{len(tasks)} tasks)")
    return "\n".join(lines) if lines else "No history yet."


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=RynaResponse)
async def chat(req: RynaChatRequest) -> RynaResponse:
    """Process a user query and return a structured action."""
    now = datetime.now().strftime("%A, %B %d %Y %H:%M").replace(" 0", " ")
    tasks_list = "\n".join(
        f"- [{'X' if t.get('completed') else ' '}] {t.get('label')} ({t.get('category')})"
        for t in req.tasks
    )
    level_index = req.goals.get("currentLevelIndex", 0)
    levels = req.goals.get("levels", [])
    current_level = levels[level_index] if levels else "unknown"

    prompt = f"""You are Ryna, Samuel's GoalFlow AI Personal Assistant. Be direct, energetic, no fluff.

Current Date/Time: {now}
Samuel's Monthly Goal: {req.goals.get('monthly')} (target level: {current_level})
Today's Progress: {req.task_completion_rate:.0f}% tasks done

Today's Tasks:
{tasks_list}

Last 7 Days:
{get_7day_summary(req.history_last7)}

Current Schedule (first 6): {json.dumps([s.model_dump() for s in req.current_schedule[:6]])}

Samuel says: "{req.query}"

Determine the best action and return ONLY a JSON object (no markdown). Choose ONE type:
- {{"type": "advice", "message": "1-2 sentence response"}}
- {{"type": "get_status"}}
- {{"type": "mark_task", "taskKeyword": "keyword from task name", "completed": true}}
- {{"type": "start_timer"}}
- {{"type": "stop_timer"}}
- {{"type": "reset_timer"}}
- {{"type": "navigate", "tab": "tasks|schedule|analytics|settings"}}
- {{"type": "add_note", "noteField": "accomplished|blocked|grateful", "noteContent": "the note text"}}
- {{"type": "reshuffle", "reason": "short reason", "impromptu": ["any new tasks"]}}
- {{"type": "add_tasks", "tasks": [{{"label": "task name", "category": "CAREER|PROJECT|SPIRITUAL|PHYSICAL|LEARNING|CONTENT", "scheduleTime": "HH:mm", "notes": "optional"}}]}}

Intent rules:
- "note that..." / "log that..." → add_note
- "mark X done" / "tick off X" → mark_task
- "start timer/pomodoro" → start_timer
- "I have X to do / I was asked to / add X to my day / remind me to" → add_tasks
- "reshuffle / my day changed" → reshuffle
- Category guide: meetings/work/client/revenue → CAREER, coding/building/deploy → PROJECT,
  reading/course/skill → LEARNING, post/content/video → CONTENT,
  prayer/bible/journal → SPIRITUAL, gym/water/health → PHYSICAL"""

    raw = await call_ai(prompt)
    action = extract_json(raw)
    return RynaResponse(action=action, raw_text=raw)


@router.post("/reshuffle", response_model=RynaResponse)
async def reshuffle(req: RynaReshuffleRequest) -> RynaResponse:
    """Reshuffle today's schedule using AI."""
    now = datetime.now().strftime("%H:%M")
    level_index = req.goals.get("currentLevelIndex", 0)
    levels = req.goals.get("levels", [])
    current_level = levels[level_index] if levels else "unknown"

    prompt = f"""You are Ryna, Samuel's GoalFlow AI Personal Assistant.

Current Time: {now}
Today's Date: {req.date_key}
Reason for reshuffle: {req.reason}
Impromptu tasks to add: {", ".join(req.impromptu_tasks) if req.impromptu_tasks else "none"}
Samuel's Monthly Goal: {req.goals.get('monthly')} (level: {current_level})
Current Schedule: {json.dumps([s.model_dump() for s in req.current_schedule])}
Today's completion so far: {req.task_completion_rate:.0f}%

Produce a revised schedule for the remainder of today. Keep past blocks, adjust upcoming ones.
Return ONLY a JSON object (no markdown) with exactly these fields:
{{
  "schedule": [{{"time": "HH:mm", "activity": "...", "category": "CAREER|PROJECT|SPIRITUAL|PHYSICAL|LEARNING|CONTENT|REST|OTHER", "notes": "optional"}}],
  "advice": "A short motivational message (1-2 sentences)"
}}"""

    raw = await call_ai(prompt)
    action = extract_json(raw)
    return RynaResponse(action=action, raw_text=raw)
