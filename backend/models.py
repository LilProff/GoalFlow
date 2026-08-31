from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime

# ── Enums (using Literal for Pydantic v2 compatibility) ────────────
PillarId = Literal["BUILD", "SHOW", "EARN", "SYSTEMIZE"]

TaskStatus = Literal["pending", "in-progress", "completed", "skipped"]

GoalStatus = Literal["active", "completed", "paused", "at-risk"]

GoalType = Literal["outcome", "learning", "certification", "habit", "project"]

BlockPriority = Literal["fixed", "high", "medium", "low"]

CoachStyle = Literal["drill-sergeant", "mentor", "cheerleader", "strategist", "philosopher"]

NotificationType = Literal["start", "end", "warning", "reshuffle", "info", "achievement", "coach"]

BadgeRarity = Literal["common", "rare", "epic", "legendary"]


# ── User ──────────────────────────────────────────────────────────────
class UserProfileBase(BaseModel):
    name: str
    email: str
    timezone: str = "Africa/Lagos"
    occupation: Optional[str] = None
    weekly_hours: int = 40
    avatar_url: Optional[str] = None
    level: int = 1
    xp: int = 0
    streak: int = 0
    longest_streak: int = 0
    onboarding_complete: bool = False
    onboarding_mode: Optional[Literal["form", "chat"]] = "form"
    coach_style: CoachStyle = "strategist"
    has_9_to_5: bool = False
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    total_tasks_completed: int = 0
    weekly_score: Optional[float] = 0.0


class UserProfileCreate(UserProfileBase):
    password: str


class UserProfileResponse(UserProfileBase):
    id: str
    created_at: datetime


# ── Auth ──────────────────────────────────────────────────────────
class AuthSignup(BaseModel):
    email: str
    password: str
    name: str


class AuthLogin(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    user: UserProfileResponse
    access_token: str
    refresh_token: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ClerkSyncRequest(BaseModel):
    clerk_user_id: str
    email: Optional[str] = None
    name: Optional[str] = None


# ── Pillars ───────────────────────────────────────────────────────
class PillarBase(BaseModel):
    pillar_id: str
    label: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    enabled: bool = True
    categories: Optional[list[str]] = Field(default_factory=list)
    weekly_kpis: Optional[list[str]] = Field(default_factory=list)
    goal: Optional[str] = None
    is_active: bool = True


class PillarCreate(PillarBase):
    pass


class PillarUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    goal: Optional[str] = None
    is_active: Optional[bool] = None


class PillarResponse(PillarBase):
    id: str
    user_id: str
    created_at: Optional[datetime] = None


# ── Categories ────────────────────────────────────────────────────
class CategoryBase(BaseModel):
    category_id: str
    label: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    enabled: bool = True
    pillar_id: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


# ── Goals ────────────────────────────────────────────────────────
class MilestoneBase(BaseModel):
    title: str
    due_date: date
    completed: bool = False


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[date] = None
    completed: Optional[bool] = None


class GoalBase(BaseModel):
    pillar_id: str
    title: str
    description: Optional[str] = None
    target_date: date
    status: GoalStatus = "active"
    progress: int = 0
    goal_type: GoalType = "project"
    weekly_kpis: Optional[list[str]] = Field(default_factory=list)
    weekly_plan: Optional[str] = None
    strategy: Optional[str] = None


class GoalCreate(GoalBase):
    milestones: Optional[list[MilestoneCreate]] = Field(default_factory=list)


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[date] = None
    status: Optional[GoalStatus] = None
    progress: Optional[int] = None
    goal_type: Optional[GoalType] = None
    weekly_kpis: Optional[list[str]] = None
    weekly_plan: Optional[str] = None
    strategy: Optional[str] = None


class GoalResponse(GoalBase):
    id: str
    user_id: str
    milestones: list[dict] = Field(default_factory=list)
    created_at: datetime

    @field_validator("goal_type", mode="before")
    @classmethod
    def _default_goal_type(cls, v):
        # Rows created before goal_type existed, or inserted directly (e.g.
        # onboarding's save-step) without setting it, store NULL — the
        # column has no DB-level default. Treat that the same as GoalBase's
        # own "project" default instead of failing response validation.
        return v or "project"


# ── Tasks ────────────────────────────────────────────────────────
class TaskBase(BaseModel):
    pillar_id: str
    title: str
    description: Optional[str] = None
    estimated_minutes: Optional[int] = 30
    category_id: Optional[str] = None
    status: TaskStatus = "pending"
    is_ai_generated: bool = False
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    ai_context: Optional[str] = None


class TaskCreate(TaskBase):
    date_key: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    estimated_minutes: Optional[int] = None
    status: Optional[TaskStatus] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    ai_context: Optional[str] = None
    is_ai_generated: Optional[bool] = None


class TaskResponse(TaskBase):
    id: str
    user_id: str
    date_key: date
    created_at: datetime
    completed_at: Optional[datetime] = None


class TaskGenerateRequest(BaseModel):
    date_key: Optional[date] = None


# ── Daily Log ──────────────────────────────────────────────────
class DailyReflection(BaseModel):
    accomplished: Optional[str] = None
    blocked: Optional[str] = None
    grateful: Optional[str] = None
    tomorrow_focus: Optional[str] = None


class DailyLogBase(BaseModel):
    date_key: date
    build_hours: float = 0.0
    score: float = 0.0
    reflection: Optional[DailyReflection] = Field(default_factory=DailyReflection)
    pillar_completion: Optional[dict] = Field(default_factory=dict)


class DailyLogCreate(DailyLogBase):
    tasks: Optional[list[TaskCreate]] = Field(default_factory=list)


class DailyLogResponse(DailyLogBase):
    id: str
    user_id: str
    tasks: list[dict] = Field(default_factory=list)
    updated_at: datetime


# ── Time Blocks (24h Planner) ─────────────────────────────
class TimeBlockBase(BaseModel):
    date_key: date
    label: str
    category: str
    start_minute: int
    duration_minutes: int
    pillar_id: Optional[str] = None
    priority: BlockPriority = "medium"
    flexible: bool = True
    user_editable: bool = True
    notes: Optional[str] = None


class TimeBlockCreate(TimeBlockBase):
    pass


class TimeBlockUpdate(BaseModel):
    label: Optional[str] = None
    category: Optional[str] = None
    start_minute: Optional[int] = None
    duration_minutes: Optional[int] = None
    pillar_id: Optional[str] = None
    priority: Optional[BlockPriority] = None
    flexible: Optional[bool] = None
    user_editable: Optional[bool] = None
    notes: Optional[str] = None
    completed: Optional[bool] = None
    skipped: Optional[bool] = None


class TimeBlockResponse(TimeBlockBase):
    id: str
    user_id: str
    completed: bool = False
    skipped: bool = False
    created_at: datetime


class PlannerReshuffleRequest(BaseModel):
    date_key: Optional[date] = None
    reason: Optional[str] = None


class PlannerReshuffleResponse(BaseModel):
    blocks: list[TimeBlockResponse]
    changes: Optional[list[dict]] = Field(default_factory=list)
    explanation: Optional[str] = None


# ── Analytics ───────────────────────────────────────────────────
class KPISummary(BaseModel):
    current_score: float = 0.0
    streak: int = 0
    level: int = 1
    xp: int = 0
    weekly_avg_score: float = 0.0
    total_tasks_completed: int = 0
    build_hours_this_week: float = 0.0
    pillar_distribution: dict = Field(default_factory=dict)
    consistency_score: float = 0.0
    discipline_score: float = 0.0


class HistoryEntry(BaseModel):
    date_key: date
    score: float
    build_hours: float
    tasks_completed: int
    tasks_total: int
    discipline_score: float


class WeeklyReport(BaseModel):
    week_start: date
    week_end: date
    summary: Optional[str] = None
    highlights: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    ai_insight: Optional[str] = None
    coach_message: Optional[str] = None
    next_week_focus: list[str] = Field(default_factory=list)


# ── AI / Ryna ────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[datetime] = None
    quick_actions: Optional[list[dict]] = None
    mcp_action: Optional[dict] = None
    mcp_executed: Optional[bool] = None


class RynaChatRequest(BaseModel):
    query: str
    pillar_goals: Optional[dict] = Field(default_factory=dict)
    current_log: Optional[dict] = Field(default_factory=dict)
    stats: Optional[dict] = Field(default_factory=dict)
    coaching_style: Optional[str] = "strategist"


class RynaResponse(BaseModel):
    response: str
    action: Optional[dict] = None


class RynaInsightRequest(BaseModel):
    pillar_goals: Optional[dict] = Field(default_factory=dict)
    current_log: Optional[dict] = Field(default_factory=dict)
    last_7_days: Optional[list[dict]] = Field(default_factory=list)


# ── Memory (pgvector) ───────────────────────────────────────
class MemoryCreate(BaseModel):
    date_key: date
    content: str
    embedding: Optional[list[float]] = None


class MemoryResponse(MemoryCreate):
    id: str
    user_id: str
    created_at: datetime


class MemorySearchRequest(BaseModel):
    query: str
    limit: int = 5


# ── Notifications ──────────────────────────────────────────────
class NotificationPrefs(BaseModel):
    push_enabled: bool = False
    morning_briefing: bool = True
    morning_time: str = "07:00"
    evening_reflection: bool = True
    evening_time: str = "21:00"
    task_reminders: bool = True
    block_transitions: bool = True
    coach_nudges: bool = True
    weekly_report: bool = True


class NotificationCreate(BaseModel):
    type: NotificationType
    title: str
    message: str
    time: Optional[str] = None
    action_label: Optional[str] = None
    mcp_action: Optional[dict] = None


class NotificationResponse(NotificationCreate):
    id: str
    user_id: str
    dismissed: bool = False
    created_at: datetime


# ── Leaderboard ────────────────────────────────────────────────
class LeaderboardEntry(BaseModel):
    user_id: str
    name: str
    avatar_initial: str
    level: int
    xp: int
    streak: int
    weekly_score: float
    rank: int
    pillars: list[str] = Field(default_factory=list)
    badge: Optional[str] = None


# ── Badges ────────────────────────────────────────────────────
class BadgeDefinition(BaseModel):
    badge_id: str
    label: str
    description: str
    icon: str
    rarity: BadgeRarity


class UserBadge(BaseModel):
    badge_id: str
    earned_at: datetime
    label: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    rarity: Optional[BadgeRarity] = None


# ── Onboarding ────────────────────────────────────────────────
class OnboardingStep(BaseModel):
    step: int
    mode: Optional[Literal["form", "chat"]] = "form"
    identity: Optional[dict] = Field(default_factory=dict)
    pillars: Optional[dict] = Field(default_factory=dict)
    categories: Optional[dict] = Field(default_factory=dict)
    goals: Optional[dict] = Field(default_factory=dict)
    schedule: Optional[dict] = Field(default_factory=dict)
    coach_style: Optional[dict] = Field(default_factory=dict)
    chat_history: list[dict] = Field(default_factory=list)
    completed: bool = False


# ── Stats ──────────────────────────────────────────────────────
class UserStatsResponse(BaseModel):
    xp: int
    level: int
    streak_current: int
    streak_longest: int
    last_log_date: Optional[date] = None
    weekly_score: Optional[float] = 0.0


class UserStatsUpdate(BaseModel):
    xp: Optional[int] = None
    level: Optional[int] = None
    streak_current: Optional[int] = None
    streak_longest: Optional[int] = None
    weekly_score: Optional[float] = None


# ── Generic Responses ─────────────────────────────────────────
class MessageResponse(BaseModel):
    message: str
    success: bool = True


class EmptyResponse(BaseModel):
    ok: bool = True
