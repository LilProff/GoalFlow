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
    wake_time: Optional[str] = None
    sleep_time: Optional[str] = None
    deep_work_windows: list[dict] = Field(default_factory=list)
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


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


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


TimelineType = Literal["long-term", "short-term"]
GoalOrigin = Literal["manual", "ai_import"]
PaceStatus = Literal["ahead", "on_track", "behind"]


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
    # A goal is long-term or short-term rather than everyone sharing one
    # fixed sprint length; a short-term goal can ladder up to a long-term
    # one via parent_goal_id.
    parent_goal_id: Optional[str] = None
    timeline_type: TimelineType = "short-term"
    origin: GoalOrigin = "manual"


class GoalCreate(GoalBase):
    # Manual creation (Goals.tsx) always sends a target_date the user picked.
    # The AI-import confirm step often doesn't have one yet — leaving this
    # optional lets create_goal() fall back to estimate_target_date()
    # instead of forcing every caller to compute it themselves.
    target_date: Optional[date] = None  # type: ignore[assignment]
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
    parent_goal_id: Optional[str] = None
    timeline_type: Optional[TimelineType] = None


class GoalPace(BaseModel):
    expected_progress: float
    status: PaceStatus
    days_remaining: int


class GoalResponse(GoalBase):
    id: str
    user_id: str
    milestones: list[dict] = Field(default_factory=list)
    timeline_history: list[dict] = Field(default_factory=list)
    # Computed at read time (see services/goal_timeline.py) — never stored,
    # so it's always fresh against today's date rather than going stale.
    pace: Optional[GoalPace] = None
    created_at: datetime

    @field_validator("goal_type", mode="before")
    @classmethod
    def _default_goal_type(cls, v):
        # Rows created before goal_type existed, or inserted directly (e.g.
        # onboarding's save-step) without setting it, store NULL — the
        # column has no DB-level default. Treat that the same as GoalBase's
        # own "project" default instead of failing response validation.
        return v or "project"


class GoalReplanResponse(BaseModel):
    goal: GoalResponse
    coach_note: Optional[str] = None


# ── Goal import (AI-assisted onboarding) ───────────────────────────────
class ImportDraftTask(BaseModel):
    title: str
    description: Optional[str] = None
    estimated_minutes: int = 30
    subtasks: list[str] = Field(default_factory=list)


class ImportDraftGoal(BaseModel):
    # A stable id scoped to this draft only (e.g. "g1") — lets a short-term
    # goal reference its long-term parent by id before either has a real
    # database row, and survives the user deleting/editing other entries
    # in the review step (unlike a plain array index).
    draft_id: str
    pillar_id: str
    title: str
    description: Optional[str] = None
    timeline_type: TimelineType = "short-term"
    goal_type: GoalType = "project"
    target_date: Optional[date] = None
    parent_draft_id: Optional[str] = None
    tasks: list[ImportDraftTask] = Field(default_factory=list)


class GoalImportDraft(BaseModel):
    life_areas_summary: Optional[str] = None
    goals: list[ImportDraftGoal] = Field(default_factory=list)


class GoalImportConfirmRequest(BaseModel):
    goals: list[ImportDraftGoal]


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
    # Lightweight checklist within a task — modeled the same low-overhead
    # way milestones are for goals (a JSONB list, no separate table).
    subtasks: list[dict] = Field(default_factory=list)


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
    subtasks: Optional[list[dict]] = None


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
    assigned_by: Optional[str] = None
    project_id: Optional[str] = None


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
    assigned_by: Optional[str] = None
    project_id: Optional[str] = None


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
class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
    user_agent: Optional[str] = None


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


# ── Projects (ongoing, cadenced work — distinct from Goals' target-dated
#    outcomes) and the weekly Routine container they get scheduled into ──
CadenceType = Literal["daily", "weekly", "fixed_day", "flexible"]
ProjectKind = Literal["work", "startup", "personal_build", "learning", "content", "outreach", "health", "relationships", "other"]
ProjectStatus = Literal["active", "paused", "dormant", "done"]
SlotType = Literal["sleep", "routine", "transit", "deep_work", "open", "evening_build", "night_study", "buffer"]


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    pillar_id: Optional[str] = None
    goal_id: Optional[str] = None
    kind: ProjectKind = "work"
    status: ProjectStatus = "active"
    cadence_type: CadenceType = "weekly"
    sessions_per_week: int = 1
    cadence_days: list[int] = Field(default_factory=list)  # 0=Mon..6=Sun
    slot_types: list[str] = Field(default_factory=list)
    session_minutes: int = 60
    is_main_quest: bool = False
    priority: int = 2


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    pillar_id: Optional[str] = None
    goal_id: Optional[str] = None
    kind: Optional[ProjectKind] = None
    status: Optional[ProjectStatus] = None
    cadence_type: Optional[CadenceType] = None
    sessions_per_week: Optional[int] = None
    cadence_days: Optional[list[int]] = None
    slot_types: Optional[list[str]] = None
    session_minutes: Optional[int] = None
    is_main_quest: Optional[bool] = None
    priority: Optional[int] = None


class ProjectResponse(ProjectBase):
    id: str
    user_id: str
    last_worked_on: Optional[date] = None
    created_at: datetime
    # Computed at read time (see services/planning.py) — sessions already
    # logged this week vs. the cadence target, so the UI/planner can see
    # who's behind without recomputing it themselves.
    sessions_this_week: int = 0
    sessions_target: int = 0


class RoutineBlockBase(BaseModel):
    label: str
    start_minute: int
    end_minute: int
    days_of_week: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])
    slot_type: SlotType = "open"
    is_schedulable: bool = False
    category: str = "admin"
    notes: Optional[str] = None


class RoutineBlockCreate(RoutineBlockBase):
    pass


class RoutineBlockUpdate(BaseModel):
    label: Optional[str] = None
    start_minute: Optional[int] = None
    end_minute: Optional[int] = None
    days_of_week: Optional[list[int]] = None
    slot_type: Optional[SlotType] = None
    is_schedulable: Optional[bool] = None
    category: Optional[str] = None
    notes: Optional[str] = None


class RoutineBlockResponse(RoutineBlockBase):
    id: str
    user_id: str
    created_at: datetime


class ProjectUpdateLogBase(BaseModel):
    project_id: str
    date_key: Optional[date] = None
    note: Optional[str] = None
    minutes_spent: int = 0
    counts_as_session: bool = True
    blocker: Optional[str] = None


class ProjectUpdateLogCreate(ProjectUpdateLogBase):
    pass


class ProjectUpdateLogResponse(ProjectUpdateLogBase):
    id: str
    user_id: str
    date_key: date
    created_at: datetime


# ── Planning engine (next-hour recommendation + week plan) ───────────
class NextActionResponse(BaseModel):
    """What to do right now, given the routine container, project cadence
    debt, and what's already on today's plan. May recommend nothing (e.g.
    a non-schedulable routine slot like sleep) rather than force a choice."""
    slot_label: str
    slot_type: str
    minutes_left_in_slot: int
    recommendation: Optional[str] = None  # human explanation from the AI
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    task_title: Optional[str] = None
    reason: Optional[str] = None


class WeekPlanRequest(BaseModel):
    week_start: Optional[date] = None  # defaults to the coming/current Monday


class WeekPlanDay(BaseModel):
    date_key: date
    day_of_week: int
    blocks: list[TimeBlockResponse] = Field(default_factory=list)


class WeekPlanResponse(BaseModel):
    week_start: date
    days: list[WeekPlanDay]
    protected_main_quest: Optional[str] = None
    at_risk_projects: list[str] = Field(default_factory=list)  # names falling behind cadence


class LifeStructureImportRequest(BaseModel):
    pass  # file comes via multipart, same pattern as onboarding's /import


class LifeStructureDraftProject(BaseModel):
    draft_id: str
    name: str
    description: Optional[str] = None
    kind: ProjectKind = "work"
    pillar_id: Optional[str] = None
    cadence_type: CadenceType = "weekly"
    sessions_per_week: int = 1
    cadence_days: list[int] = Field(default_factory=list)
    slot_types: list[str] = Field(default_factory=list)
    session_minutes: int = 60
    is_main_quest: bool = False
    priority: int = 2
    needs_clarification: Optional[str] = None  # e.g. "status unconfirmed — dormant or active?"


class LifeStructureDraftRoutineBlock(BaseModel):
    draft_id: str
    label: str
    start_minute: int
    end_minute: int
    days_of_week: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])
    slot_type: SlotType = "open"
    is_schedulable: bool = False
    category: str = "admin"


class LifeStructureDraft(BaseModel):
    summary: Optional[str] = None
    routine_blocks: list[LifeStructureDraftRoutineBlock] = Field(default_factory=list)
    projects: list[LifeStructureDraftProject] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class LifeStructureConfirmRequest(BaseModel):
    routine_blocks: list[LifeStructureDraftRoutineBlock] = Field(default_factory=list)
    projects: list[LifeStructureDraftProject] = Field(default_factory=list)


# ── Generic Responses ─────────────────────────────────────────
class MessageResponse(BaseModel):
    message: str
    success: bool = True


class EmptyResponse(BaseModel):
    ok: bool = True
