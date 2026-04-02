from typing import Any, Literal, Optional
from pydantic import BaseModel


# ── AI / Ryna ────────────────────────────────────────────────────────────────

class ScheduleItem(BaseModel):
    time: str
    activity: str
    category: str
    notes: Optional[str] = None


class RynaChatRequest(BaseModel):
    query: str
    current_schedule: list[ScheduleItem]
    tasks: list[dict[str, Any]]
    goals: dict[str, Any]
    task_completion_rate: float
    date_key: str
    history_last7: dict[str, Any] = {}


class RynaReshuffleRequest(BaseModel):
    reason: str
    impromptu_tasks: list[str] = []
    current_schedule: list[ScheduleItem]
    goals: dict[str, Any]
    task_completion_rate: float
    date_key: str


class RynaResponse(BaseModel):
    action: dict[str, Any]
    raw_text: str


# ── Sync ─────────────────────────────────────────────────────────────────────

class SyncPushRequest(BaseModel):
    data: dict[str, Any]


class SyncPullResponse(BaseModel):
    data: dict[str, Any]
    updated_at: str
    found: bool
