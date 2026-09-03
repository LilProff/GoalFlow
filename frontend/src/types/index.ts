// ─── Core Enums ──────────────────────────────────────────────────────────────
export type CoachStyle = 'drill-sergeant' | 'mentor' | 'cheerleader' | 'strategist' | 'philosopher';
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'skipped';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'at-risk';
export type PillarId = string;
export type CategoryId = string;
export type MessageRole = 'user' | 'assistant' | 'system';
export type OnboardingMode = 'form' | 'chat' | 'import';
export type TimelineType = 'long-term' | 'short-term';
export type GoalOrigin = 'manual' | 'ai_import';
export type PaceStatus = 'ahead' | 'on_track' | 'behind';

// ─── Life Categories (complete person framework) ──────────────────────────────
export interface LifeCategory {
  id: CategoryId;
  label: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  pillarId?: PillarId; // which pillar this maps to
}

// ─── Pillars ──────────────────────────────────────────────────────────────────
export interface Pillar {
  id: PillarId;
  label: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  categories: CategoryId[];
  goal90Day?: string;
  weeklyKPIs?: string[];
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  timezone: string;
  occupation: string;
  weeklyHours: number;
  avatarUrl?: string;
  level: number;
  xp: number;
  streak: number;
  longestStreak: number;
  onboardingComplete: boolean;
  onboardingMode?: OnboardingMode;
  coachStyle: CoachStyle;
  pillars: Pillar[];
  categories: LifeCategory[];
  has9to5: boolean;
  workStartTime?: string;
  workEndTime?: string;
  wakeTime?: string;
  sleepTime?: string;
  deepWorkWindows?: { start: string; end: string }[];
  createdAt: string;
  badges: Badge[];
  totalTasksCompleted: number;
  weeklyScore: number;
}

// ─── Gamification ─────────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  earnedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarInitial: string;
  level: number;
  xp: number;
  streak: number;
  weeklyScore: number;
  rank: number;
  pillars: string[];
  occupation: string;
  badge?: string;
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  pillarId: PillarId;
  categoryId?: CategoryId;
  title: string;
  description?: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  status: TaskStatus;
  isAIGenerated: boolean;
  dateKey: string;
  startTime?: string; // HH:MM
  endTime?: string;
  createdAt: string;
  completedAt?: string;
  aiContext?: string; // why Ryna assigned this
  subtasks?: Subtask[]; // lightweight checklist within the task
}

// ─── Daily Data ───────────────────────────────────────────────────────────────
export interface DailyReflection {
  accomplished: string;
  blocked: string;
  grateful: string;
  tomorrowFocus: string;
}

export interface DailyData {
  id: string;
  dateKey: string;
  userId: string;
  buildHours: number;
  score: number;
  tasks: Task[];
  reflection: DailyReflection;
  pillarCompletion: Record<PillarId, boolean>;
  updatedAt: string;
}

// ─── Goals ────────────────────────────────────────────────────────────────────
export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
}

export interface TimelineAdjustment {
  fromDate: string;
  toDate: string;
  reason: string;
  adjustedAt: string;
}

export interface GoalPace {
  expectedProgress: number;
  status: PaceStatus;
  daysRemaining: number;
}

export interface Goal {
  id: string;
  userId: string;
  pillarId: PillarId;
  categoryId?: CategoryId;
  title: string;
  description: string;
  targetDate: string;
  status: GoalStatus;
  progress: number;
  milestones: Milestone[];
  weeklyPlan?: string;
  weeklyKPIs: string[];
  strategy?: string;
  type: 'outcome' | 'learning' | 'certification' | 'habit' | 'project';
  createdAt: string;
  // Long-term goals have no parent; short-term goals ladder up to one via
  // parentGoalId. Not every goal is forced onto the same fixed window —
  // see timelineType/pace.
  parentGoalId?: string | null;
  timelineType: TimelineType;
  origin: GoalOrigin;
  timelineHistory: TimelineAdjustment[];
  pace?: GoalPace | null; // computed server-side at read time, never stored client-side
}

// ─── AI-import onboarding ─────────────────────────────────────────────────────
export interface ImportDraftTask {
  title: string;
  description?: string;
  estimatedMinutes: number;
  subtasks: string[];
}

export interface ImportDraftGoal {
  draftId: string;
  pillarId: PillarId;
  title: string;
  description?: string;
  timelineType: TimelineType;
  type: Goal['type'];
  targetDate?: string;
  parentDraftId?: string | null;
  tasks: ImportDraftTask[];
}

export interface GoalImportDraft {
  lifeAreasSummary?: string;
  goals: ImportDraftGoal[];
}

// ─── Time Planner ─────────────────────────────────────────────────────────────
export type BlockCategory =
  | 'sleep' | 'spiritual' | 'exercise' | 'transit' | 'deepwork'
  | 'meals' | 'admin' | 'show' | 'earn' | 'buffer' | 'personal'
  | 'learning' | 'social' | 'health' | 'work';

export interface TimeBlock {
  id: string;
  label: string;
  category: BlockCategory;
  startMinute: number;
  durationMinutes: number;
  pillarId?: string;
  categoryId?: string;
  notes?: string;
  completed: boolean;
  skipped: boolean;
  flexible: boolean;
  priority: 'fixed' | 'high' | 'medium' | 'low';
  userEditable: boolean;
  /** Who/what assigned this block — set marks it a commitment. Blank/undefined
   *  means self-scheduled. Reshuffle always treats it as an anchor. */
  assignedBy?: string;
  /** Set when this block was placed by a week-plan run — links back to the
   *  project whose cadence it's fulfilling. */
  projectId?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface KPISummary {
  currentScore: number;
  streak: number;
  level: number;
  xp: number;
  weeklyAvgScore: number;
  totalTasksCompleted: number;
  buildHoursThisWeek: number;
  pillarDistribution: Record<PillarId, number>;
  categoryDistribution: Record<CategoryId, number>;
  disciplineScore: number; // 0-100, AI-calculated
  consistencyScore: number;
}

export interface HistoryEntry {
  dateKey: string;
  score: number;
  buildHours: number;
  tasksCompleted: number;
  tasksTotal: number;
  disciplineScore: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  summary: string;
  highlights: string[];
  improvements: string[];
  aiInsight: string;
  coachMessage: string;
  nextWeekFocus: string[];
}

// ─── Ryna AI Coach ────────────────────────────────────────────────────────────
export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  mcpAction?: MCPAction;
}

export type MCPActionType =
  | 'add_task' | 'complete_task' | 'skip_task'
  | 'reshuffle_day' | 'change_task_time' | 'generate_tasks'
  | 'add_goal' | 'update_goal_progress'
  | 'switch_coach_style' | 'generate_content_idea'
  | 'draft_cold_email' | 'draft_dm';

export interface MCPAction {
  type: MCPActionType;
  payload?: Record<string, unknown>;
  preview?: string; // human-readable description of what will happen
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  quickActions?: QuickAction[];
  mcpAction?: MCPAction;
  mcpExecuted?: boolean;
  isTyping?: boolean;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
export interface OnboardingState {
  step: number;
  mode: OnboardingMode;
  identity: IdentityStep;
  pillars: PillarStep;
  categories: CategoryStep;
  goals: GoalsStep;
  schedule: ScheduleStep;
  coachStyle: CoachStyleStep;
  chatHistory: ChatMessage[];
  completed: boolean;
}

export interface IdentityStep {
  name: string;
  email: string;
  timezone: string;
  occupation: string;
  weeklyHours: number;
  has9to5: boolean;
  workStartTime: string;
  workEndTime: string;
  direction: 'clear' | 'exploring'; // do they know what they want?
}

export interface PillarStep {
  selected: PillarId[];
  customPillars: { id: string; label: string; description: string }[];
}

export interface CategoryStep {
  selected: CategoryId[];
}

export interface GoalsStep {
  goals: Record<PillarId, string>;
  timelines: Record<PillarId, string>;
  goalTypes: Record<PillarId, Goal['type']>;
}

export interface ScheduleStep {
  wakeTime: string;
  sleepTime: string;
  deepWorkWindows: { start: string; end: string }[];
}

export interface CoachStyleStep {
  style: CoachStyle;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface NotificationPreferences {
  pushEnabled: boolean;
  morningBriefing: boolean;
  taskReminders: boolean;
  eveningReflection: boolean;
  weeklyReport: boolean;
  blockTransitions: boolean;
  coachNudges: boolean;
  briefingTime: string;
  reflectionTime: string;
}

export interface AppNotification {
  id: string;
  type: 'start' | 'end' | 'warning' | 'reshuffle' | 'info' | 'achievement' | 'coach';
  title: string;
  message: string;
  time: string;
  dismissed: boolean;
  actionLabel?: string;
  mcpAction?: MCPAction;
}

// ─── Social (Phase 2 stub) ────────────────────────────────────────────────────
export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userLevel: number;
  content: string;
  pillarId: string;
  likes: number;
  createdAt: string;
  type: 'win' | 'milestone' | 'reflection' | 'question';
}

// ─── Stats ─────────────────────────────────────────────────────────────────
export interface UserStatsResponse {
  xp: number;
  level: number;
  streak_current: number;
  streak_longest: number;
  last_log_date?: string;
  weekly_score: number;
}

// ─── Projects & Routine (recurring/cadenced work, distinct from Goals'
//     target-dated outcomes) ────────────────────────────────────────────────
export type CadenceType = 'daily' | 'weekly' | 'fixed_day' | 'flexible';
export type ProjectKind = 'work' | 'startup' | 'personal_build' | 'learning' | 'content' | 'outreach' | 'health' | 'relationships' | 'other';
export type ProjectStatus = 'active' | 'paused' | 'dormant' | 'done';
export type SlotType = 'sleep' | 'routine' | 'transit' | 'deep_work' | 'open' | 'evening_build' | 'night_study' | 'buffer';

export interface Project {
  id: string;
  name: string;
  description?: string;
  pillarId?: string;
  goalId?: string;
  kind: ProjectKind;
  status: ProjectStatus;
  cadenceType: CadenceType;
  sessionsPerWeek: number;
  cadenceDays: number[]; // 0=Mon..6=Sun
  slotTypes: string[];
  sessionMinutes: number;
  isMainQuest: boolean;
  priority: number; // 1 (highest) .. 5
  lastWorkedOn?: string;
  createdAt: string;
  sessionsThisWeek: number;
  sessionsTarget: number;
}

export interface RoutineBlock {
  id: string;
  label: string;
  startMinute: number;
  endMinute: number;
  daysOfWeek: number[];
  slotType: SlotType;
  isSchedulable: boolean;
  category: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectUpdateLog {
  id: string;
  projectId: string;
  dateKey: string;
  note?: string;
  minutesSpent: number;
  countsAsSession: boolean;
  blocker?: string;
  createdAt: string;
}

export interface NextAction {
  slotLabel: string;
  slotType: string;
  minutesLeftInSlot: number;
  recommendation?: string;
  projectId?: string;
  projectName?: string;
  taskTitle?: string;
  reason?: string;
}

export interface WeekPlanDay {
  dateKey: string;
  dayOfWeek: number;
  blocks: TimeBlock[];
}

export interface WeekPlan {
  weekStart: string;
  days: WeekPlanDay[];
  protectedMainQuest?: string;
  atRiskProjects: string[];
}

// ─── Life-structure import (routine + projects from a free-form doc) ───────
export interface LifeStructureDraftProject {
  draftId: string;
  name: string;
  description?: string;
  kind: ProjectKind;
  pillarId?: string;
  cadenceType: CadenceType;
  sessionsPerWeek: number;
  cadenceDays: number[];
  slotTypes: string[];
  sessionMinutes: number;
  isMainQuest: boolean;
  priority: number;
  needsClarification?: string;
}

export interface LifeStructureDraftRoutineBlock {
  draftId: string;
  label: string;
  startMinute: number;
  endMinute: number;
  daysOfWeek: number[];
  slotType: SlotType;
  isSchedulable: boolean;
  category: string;
}

export interface LifeStructureDraft {
  summary?: string;
  routineBlocks: LifeStructureDraftRoutineBlock[];
  projects: LifeStructureDraftProject[];
  openQuestions: string[];
}
