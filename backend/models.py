from typing import Any, Literal, Optional
from pydantic import BaseModel
from datetime import date


# ── Users / Auth ────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    name: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    timezone: str = "Africa/Lagos"
    phase: int = 1
    coaching_style: str = "balanced"
    wake_time: str = "05:00"
    sleep_time: str = "22:00"
    hours_available: int = 4
    onboarding_complete: bool = False


# ── Onboarding ────────────────────────────────────────────────────────────────

class OnboardingData(BaseModel):
    name: str
    email: str
    timezone: str = "Africa/Lagos"
    phase: int = 1
    coaching_style: str = "balanced"
    wake_time: str = "05:00"
    sleep_time: str = "22:00"
    hours_available: int = 4
    # Pillar goals
    build_goal: str = ""
    show_goal: str = ""
    earn_goal: str = ""
    systemize_goal: str = ""
    target_income: str = ""
    target_content: str = ""


# ── Pillar Goals ────────────────────────────────────────────────────────────────

class PillarGoals(BaseModel):
    pillar: str
    goal_90day: str
    target_income: Optional[str] = None
    target_content: Optional[str] = None


# ── Daily Log ────────────────────────────────────────────────────────────────

class DailyLogCreate(BaseModel):
    date: Optional[date] = None
    build_done: bool = False
    show_done: bool = False
    earn_done: bool = False
    systemize_done: bool = False
    build_hours: float = 0
    reflection: str = ""


class DailyLogResponse(BaseModel):
    id: str
    user_id: str
    date: date
    build_done: bool
    show_done: bool
    earn_done: bool
    systemize_done: bool
    build_hours: float
    score: int
    reflection: str


# ── Tasks ────────────────────────────────────────────────────────────────

class TaskGenerateRequest(BaseModel):
    user_id: str
    pillar_goals: dict[str, str]
    phase: int = 1
    date: Optional[date] = None


class TaskResponse(BaseModel):
    id: str
    pillar: str
    label: str
    completed: bool = False


# ── Daily Tasks ────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    pillar: Literal["BUILD", "SHOW", "EARN", "SYSTEMIZE"]
    label: str
    date: Optional[date] = None


class TaskUpdate(BaseModel):
    completed: bool


# ── Stats ────────────────────────────────────────────────────────────────

class UserStatsResponse(BaseModel):
    xp: int = 0
    level: str = "beginner"
    streak_current: int = 0
    streak_longest: int = 0


# ── Analytics ────────────────────────────────────────────────────────────────

class WeeklyReport(BaseModel):
    week_start: date
    week_end: date
    avg_score: float
    total_build_hours: float
    pillars_completed: dict[str, int]
    streak: int
    insights: str


# ── AI / Ryna ────────────────────────────────────────────────────────────────

class ScheduleItem(BaseModel):
    time: str
    activity: str
    category: str
    notes: Optional[str] = None


class RynaChatRequest(BaseModel):
    query: str
    user_id: str
    pillar_goals: dict[str, str]
    current_log: dict[str, Any]
    stats: dict[str, Any]
    coaching_style: str = "balanced"


class RynaInsightRequest(BaseModel):
    user_id: str
    pillar_goals: dict[str, str]
    current_log: dict[str, Any]
    last_7_days: list[dict[str, Any]] = []


class RynaResponse(BaseModel):
    response: str
    action: Optional[dict[str, Any]] = None


# ── Sync ─────────────────────────────────────────────────────────────────────

class SyncPushRequest(BaseModel):
    data: dict[str, Any]


class SyncPullResponse(BaseModel):
    data: dict[str, Any]
    updated_at: str
    found: bool