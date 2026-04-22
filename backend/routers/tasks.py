import json
import re
from datetime import date, timedelta

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.config import settings
from backend.models import TaskGenerateRequest, TaskResponse, TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


# In-memory task store (replace with Supabase)
tasks_store: dict[str, list[dict]] = {}


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


def generate_pillar_task(pillar: str, goals: dict, phase: int) -> str:
    """Generate a task for a pillar using AI."""
    goal = goals.get(pillar.lower(), "your goal")
    
    prompts = {
        "BUILD": f"""Generate a specific task that helps with: {goal}
Return ONLY the task text, no explanation. Keep it to 1 sentence.""",
        "SHOW": f"""Generate a content creation task for: {goal}
Return ONLY the task text, no explanation. Keep it to 1 sentence.""",
        "EARN": f"""Generate a revenue-building task for: {goal}
Return ONLY the task text, no explanation. Keep it to 1 sentence.""",
        "SYSTEMIZE": f"""Generate a process automation/improvement task for: {goal}
Return ONLY the task text, no explanation. Keep it to 1 sentence.""",
    }
    
    return prompts.get(pillar, "Complete your daily task")


async def call_ai(prompt: str) -> str:
    """Call OpenRouter with fallback."""
    models = [settings.openrouter_model] + settings.openrouter_fallback_models
    
    for model in models:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
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
                        "max_tokens": 100,
                        "temperature": 0.7,
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
    
    return "Complete your daily task for this pillar"


@router.post("/generate", response_model=list[TaskResponse])
async def generate_tasks(req: TaskGenerateRequest) -> list[TaskResponse]:
    """Generate daily tasks for all 4 pillars."""
    today = req.date or date.today()
    user_id = req.user_id
    goals = req.pillar_goals
    phase = req.phase
    
    if user_id not in tasks_store:
        tasks_store[user_id] = {}
    
    date_key = today.isoformat()
    if date_key in tasks_store[user_id]:
        return tasks_store[user_id][date_key]
    
    tasks = []
    for pillar in ["BUILD", "SHOW", "EARN", "SYSTEMIZE"]:
        prompt = generate_pillar_task(pillar, goals, phase)
        label = await call_ai(prompt)
        
        tasks.append(TaskResponse(
            id=f"{user_id}_{pillar}_{date_key}",
            pillar=pillar,
            label=label.strip(),
            completed=False,
        ))
    
    tasks_store[user_id][date_key] = tasks
    return tasks


@router.get("/today/{user_id}", response_model=list[TaskResponse])
async def get_today_tasks(user_id: str) -> list[TaskResponse]:
    """Get today's tasks for a user."""
    today = date.today().isoformat()
    
    if user_id not in tasks_store:
        return []
    
    return tasks_store[user_id].get(today, [])


@router.post("/{task_id}")
async def update_task(task_id: str, update: TaskUpdate) -> TaskResponse:
    """Mark a task as complete."""
    parts = task_id.split("_")
    if len(parts) < 3:
        raise HTTPException(status_code=400, detail="Invalid task ID")
    
    user_id = "_".join(parts[:-2])
    date_key = parts[-2]
    pillar = parts[-1]
    
    if user_id not in tasks_store:
        raise HTTPException(status_code=404, detail="Tasks not found")
    
    tasks = tasks_store[user_id].get(date_key, [])
    for task in tasks:
        if task["pillar"] == pillar:
            task["completed"] = update.completed
            break
    
    return TaskResponse(
        id=task_id,
        pillar=pillar,
        label=tasks[0]["label"] if tasks else "",
        completed=update.completed,
    )