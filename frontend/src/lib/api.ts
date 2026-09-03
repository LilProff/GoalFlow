import type { User, Task, DailyData, Pillar, KPISummary, HistoryEntry, WeeklyReport, UserStatsResponse, Goal, LeaderboardEntry, TimeBlock, NotificationPreferences, Milestone, PaceStatus, GoalImportDraft, ImportDraftGoal, Project, RoutineBlock, ProjectUpdateLog, NextAction, WeekPlan, LifeStructureDraft } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8010/api/v1';

const ACCESS_KEY = 'goalflow_token';
const REFRESH_KEY = 'goalflow_refresh_token';

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

function clearToken() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Invoked when a session ends for real (refresh also failed / no refresh
// token to try), so the app can drop the user back to signed-out instead of
// leaving every page stuck on an unexplained error.
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

/** Thrown when a session genuinely ends, so callers can distinguish that from a real failure. */
export class UnauthorizedError extends Error {
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// Access tokens are short-lived (12h) with no SDK auto-refreshing them
// anymore, so fetchApi has to do it itself: on a 401, try the refresh token
// once before giving up. Concurrent 401s share one in-flight refresh instead
// of each racing the endpoint.
let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async r => {
        if (!r.ok) return false;
        const data = await r.json();
        setTokens(data.access_token, data.refresh_token);
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  _retried = false,
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !_retried) {
      if (await tryRefresh()) return fetchApi<T>(endpoint, options, true);
      clearToken();
      onUnauthorized?.();
      const error = await response.json().catch(() => ({ detail: 'Session expired' }));
      throw new UnauthorizedError(error.detail || 'Session expired — please sign in again.');
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // 204 / empty bodies would otherwise blow up on response.json()
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// A separate path for multipart uploads (the goal-import file) — the
// browser needs to set its own Content-Type with a boundary, so this
// deliberately doesn't send the JSON header fetchApi always adds. Mirrors
// fetchApi's auth/401-refresh handling rather than sharing it, since the
// body shape (FormData vs. JSON) differs at every step.
async function fetchApiUpload<T>(endpoint: string, formData: FormData, _retried = false): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers, body: formData });

  if (!response.ok) {
    if (response.status === 401 && !_retried) {
      if (await tryRefresh()) return fetchApiUpload<T>(endpoint, formData, true);
      clearToken();
      onUnauthorized?.();
      const error = await response.json().catch(() => ({ detail: 'Session expired' }));
      throw new UnauthorizedError(error.detail || 'Session expired — please sign in again.');
    }
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

interface RawHistoryEntry {
  date_key?: string;
  score?: number;
  build_hours?: number;
  tasks_completed?: number;
  tasks_total?: number;
  discipline_score?: number;
}

function mapHistoryEntry(raw: RawHistoryEntry): HistoryEntry {
  return {
    dateKey: raw.date_key || '',
    score: Number(raw.score || 0),
    buildHours: Number(raw.build_hours || 0),
    tasksCompleted: Number(raw.tasks_completed || 0),
    tasksTotal: Number(raw.tasks_total || 0),
    disciplineScore: Number(raw.discipline_score || 0),
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────
interface AuthResponse {
  // Mirrors backend's UserProfileResponse (models.py) — signup/login/verify
  // all return this full shape. Only the fields mapUser actually reads are
  // declared here; each is optional so a narrower response (or a future
  // backend change) degrades to mapUser's defaults instead of breaking.
  user: {
    id: string;
    name: string;
    email: string;
    timezone: string;
    onboarding_complete: boolean;
    coach_style: string;
    created_at: string;
    occupation?: string | null;
    weekly_hours?: number;
    avatar_url?: string | null;
    has_9_to_5?: boolean;
    work_start_time?: string | null;
    work_end_time?: string | null;
    wake_time?: string | null;
    sleep_time?: string | null;
    deep_work_windows?: { start: string; end: string }[];
    total_tasks_completed?: number;
    weekly_score?: number;
  };
  access_token: string;
  refresh_token: string;
}

function mapUser(apiUser: AuthResponse['user']): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    timezone: apiUser.timezone,
    occupation: apiUser.occupation ?? '',
    weeklyHours: apiUser.weekly_hours ?? 40,
    avatarUrl: apiUser.avatar_url ?? undefined,
    level: 1,
    xp: 0,
    streak: 0,
    longestStreak: 0,
    onboardingComplete: apiUser.onboarding_complete,
    onboardingMode: 'form',
    coachStyle: apiUser.coach_style as User['coachStyle'],
    pillars: [],
    categories: [],
    has9to5: apiUser.has_9_to_5 ?? false,
    workStartTime: apiUser.work_start_time ?? undefined,
    workEndTime: apiUser.work_end_time ?? undefined,
    wakeTime: apiUser.wake_time ?? undefined,
    sleepTime: apiUser.sleep_time ?? undefined,
    deepWorkWindows: apiUser.deep_work_windows ?? undefined,
    createdAt: apiUser.created_at,
    badges: [],
    totalTasksCompleted: apiUser.total_tasks_completed ?? 0,
    weeklyScore: apiUser.weekly_score ?? 0,
  };
}

interface RawDailyData {
  id?: string;
  date_key?: string;
  user_id?: string;
  build_hours?: number;
  score?: number;
  reflection?: {
    accomplished?: string;
    blocked?: string;
    grateful?: string;
    tomorrow_focus?: string;
  };
  pillar_completion?: Record<string, boolean>;
  tasks?: RawTask[];
  updated_at?: string;
}

interface RawTask {
  id: string;
  pillar_id?: string;
  title?: string;
  description?: string;
  status?: string;
  estimated_minutes?: number;
  is_ai_generated?: boolean;
  date_key?: string;
  start_time?: string;
  end_time?: string;
  created_at?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
}

function mapTask(t: RawTask): Task {
  return {
    id: t.id,
    pillarId: t.pillar_id || '',
    title: t.title || '',
    description: t.description,
    status: (t.status || 'pending') as Task['status'],
    estimatedMinutes: t.estimated_minutes || 30,
    isAIGenerated: t.is_ai_generated || false,
    dateKey: t.date_key || '',
    startTime: t.start_time,
    endTime: t.end_time,
    createdAt: t.created_at || '',
    subtasks: t.subtasks || [],
  };
}

interface RawGoal {
  id: string;
  user_id?: string;
  pillar_id?: string;
  title?: string;
  description?: string;
  target_date?: string;
  status?: string;
  progress?: number;
  goal_type?: string;
  weekly_kpis?: string[];
  weekly_plan?: string;
  strategy?: string;
  milestones?: unknown[];
  created_at?: string;
  parent_goal_id?: string | null;
  timeline_type?: string;
  origin?: string;
  timeline_history?: { from_date: string; to_date: string; reason: string; adjusted_at: string }[];
  pace?: { expected_progress: number; status: string; days_remaining: number } | null;
}

/** `fallback` fills in fields a POST response echoes back incompletely (mirrors what createGoal previously did inline). */
function mapGoal(g: RawGoal, fallback?: Partial<Goal>): Goal {
  return {
    id: g.id,
    userId: g.user_id || fallback?.userId || '',
    pillarId: (g.pillar_id || fallback?.pillarId || 'BUILD') as Goal['pillarId'],
    title: g.title || fallback?.title || '',
    description: g.description || fallback?.description || '',
    targetDate: g.target_date || fallback?.targetDate || '',
    status: (g.status || fallback?.status || 'active') as Goal['status'],
    progress: g.progress ?? fallback?.progress ?? 0,
    type: (g.goal_type || fallback?.type || 'project') as Goal['type'],
    weeklyKPIs: g.weekly_kpis || fallback?.weeklyKPIs || [],
    weeklyPlan: g.weekly_plan ?? fallback?.weeklyPlan,
    strategy: g.strategy ?? fallback?.strategy,
    milestones: (g.milestones || fallback?.milestones || []) as Goal['milestones'],
    createdAt: g.created_at || fallback?.createdAt || new Date().toISOString(),
    parentGoalId: g.parent_goal_id ?? fallback?.parentGoalId ?? null,
    timelineType: (g.timeline_type || fallback?.timelineType || 'short-term') as Goal['timelineType'],
    origin: (g.origin || fallback?.origin || 'manual') as Goal['origin'],
    timelineHistory: (g.timeline_history || []).map(h => ({
      fromDate: h.from_date, toDate: h.to_date, reason: h.reason, adjustedAt: h.adjusted_at,
    })),
    pace: g.pace ? {
      expectedProgress: g.pace.expected_progress,
      status: g.pace.status as PaceStatus,
      daysRemaining: g.pace.days_remaining,
    } : null,
  };
}

interface RawPillar {
  pillar_id?: string;
  id?: string;
  label?: string;
  description?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
}

interface RawTimeBlock {
  id: string;
  label?: string;
  category?: string;
  start_minute?: number;
  duration_minutes?: number;
  pillar_id?: string;
  completed?: boolean;
  skipped?: boolean;
  flexible?: boolean;
  priority?: string;
  user_editable?: boolean;
  notes?: string;
  assigned_by?: string;
  project_id?: string;
}

function mapTimeBlock(b: RawTimeBlock): TimeBlock {
  return {
    id: b.id,
    label: b.label || '',
    category: (b.category || 'work') as TimeBlock['category'],
    startMinute: b.start_minute || 0,
    durationMinutes: b.duration_minutes || 30,
    pillarId: b.pillar_id,
    notes: b.notes,
    completed: b.completed || false,
    skipped: b.skipped || false,
    flexible: b.flexible ?? true,
    priority: (b.priority || 'medium') as TimeBlock['priority'],
    userEditable: b.user_editable ?? true,
    assignedBy: b.assigned_by || undefined,
    projectId: b.project_id || undefined,
  };
}

// ─── Projects / Routine mapping ─────────────────────────────────────────────
interface RawProject {
  id: string; name: string; description?: string; pillar_id?: string; goal_id?: string;
  kind: string; status: string; cadence_type: string; sessions_per_week: number;
  cadence_days: number[]; slot_types: string[]; session_minutes: number;
  is_main_quest: boolean; priority: number; last_worked_on?: string; created_at: string;
  sessions_this_week: number; sessions_target: number;
}

function mapProject(p: RawProject): Project {
  return {
    id: p.id, name: p.name, description: p.description, pillarId: p.pillar_id, goalId: p.goal_id,
    kind: p.kind as Project['kind'], status: p.status as Project['status'],
    cadenceType: p.cadence_type as Project['cadenceType'], sessionsPerWeek: p.sessions_per_week,
    cadenceDays: p.cadence_days || [], slotTypes: p.slot_types || [], sessionMinutes: p.session_minutes,
    isMainQuest: p.is_main_quest, priority: p.priority, lastWorkedOn: p.last_worked_on,
    createdAt: p.created_at, sessionsThisWeek: p.sessions_this_week, sessionsTarget: p.sessions_target,
  };
}

function unmapProject(p: Partial<Project>): Record<string, unknown> {
  return {
    ...(p.name !== undefined && { name: p.name }),
    ...(p.description !== undefined && { description: p.description }),
    ...(p.pillarId !== undefined && { pillar_id: p.pillarId }),
    ...(p.goalId !== undefined && { goal_id: p.goalId }),
    ...(p.kind !== undefined && { kind: p.kind }),
    ...(p.status !== undefined && { status: p.status }),
    ...(p.cadenceType !== undefined && { cadence_type: p.cadenceType }),
    ...(p.sessionsPerWeek !== undefined && { sessions_per_week: p.sessionsPerWeek }),
    ...(p.cadenceDays !== undefined && { cadence_days: p.cadenceDays }),
    ...(p.slotTypes !== undefined && { slot_types: p.slotTypes }),
    ...(p.sessionMinutes !== undefined && { session_minutes: p.sessionMinutes }),
    ...(p.isMainQuest !== undefined && { is_main_quest: p.isMainQuest }),
    ...(p.priority !== undefined && { priority: p.priority }),
  };
}

interface RawRoutineBlock {
  id: string; label: string; start_minute: number; end_minute: number; days_of_week: number[];
  slot_type: string; is_schedulable: boolean; category: string; notes?: string; created_at: string;
}

function mapRoutineBlock(r: RawRoutineBlock): RoutineBlock {
  return {
    id: r.id, label: r.label, startMinute: r.start_minute, endMinute: r.end_minute,
    daysOfWeek: r.days_of_week || [], slotType: r.slot_type as RoutineBlock['slotType'],
    isSchedulable: r.is_schedulable, category: r.category, notes: r.notes, createdAt: r.created_at,
  };
}

function unmapRoutineBlock(r: Partial<RoutineBlock>): Record<string, unknown> {
  return {
    ...(r.label !== undefined && { label: r.label }),
    ...(r.startMinute !== undefined && { start_minute: r.startMinute }),
    ...(r.endMinute !== undefined && { end_minute: r.endMinute }),
    ...(r.daysOfWeek !== undefined && { days_of_week: r.daysOfWeek }),
    ...(r.slotType !== undefined && { slot_type: r.slotType }),
    ...(r.isSchedulable !== undefined && { is_schedulable: r.isSchedulable }),
    ...(r.category !== undefined && { category: r.category }),
    ...(r.notes !== undefined && { notes: r.notes }),
  };
}

interface RawProjectUpdate {
  id: string; project_id: string; date_key: string; note?: string; minutes_spent: number;
  counts_as_session: boolean; blocker?: string; created_at: string;
}

function mapProjectUpdate(u: RawProjectUpdate): ProjectUpdateLog {
  return {
    id: u.id, projectId: u.project_id, dateKey: u.date_key, note: u.note,
    minutesSpent: u.minutes_spent, countsAsSession: u.counts_as_session, blocker: u.blocker,
    createdAt: u.created_at,
  };
}

function unmapTimeBlock(b: Partial<TimeBlock>, dateKey?: string): Record<string, unknown> {
  return {
    ...(dateKey !== undefined && { date_key: dateKey }),
    ...(b.label !== undefined && { label: b.label }),
    ...(b.category !== undefined && { category: b.category }),
    ...(b.startMinute !== undefined && { start_minute: b.startMinute }),
    ...(b.durationMinutes !== undefined && { duration_minutes: b.durationMinutes }),
    ...(b.pillarId !== undefined && { pillar_id: b.pillarId }),
    ...(b.completed !== undefined && { completed: b.completed }),
    ...(b.skipped !== undefined && { skipped: b.skipped }),
    ...(b.flexible !== undefined && { flexible: b.flexible }),
    ...(b.priority !== undefined && { priority: b.priority }),
    ...(b.userEditable !== undefined && { user_editable: b.userEditable }),
    ...(b.notes !== undefined && { notes: b.notes }),
    ...(b.assignedBy !== undefined && { assigned_by: b.assignedBy }),
  };
}

interface RawNotifPrefs {
  push_enabled?: boolean;
  morning_briefing?: boolean;
  morning_time?: string;
  evening_reflection?: boolean;
  evening_time?: string;
  task_reminders?: boolean;
  block_transitions?: boolean;
  coach_nudges?: boolean;
  weekly_report?: boolean;
}

function mapNotifPrefs(p: RawNotifPrefs): NotificationPreferences {
  return {
    pushEnabled: p.push_enabled ?? false,
    morningBriefing: p.morning_briefing ?? true,
    taskReminders: p.task_reminders ?? true,
    eveningReflection: p.evening_reflection ?? true,
    weeklyReport: p.weekly_report ?? true,
    blockTransitions: p.block_transitions ?? true,
    coachNudges: p.coach_nudges ?? true,
    briefingTime: (p.morning_time ?? '07:00').slice(0, 5),
    reflectionTime: (p.evening_time ?? '21:00').slice(0, 5),
  };
}

function unmapNotifPrefs(p: Partial<NotificationPreferences>): Record<string, unknown> {
  return {
    ...(p.pushEnabled       !== undefined && { push_enabled: p.pushEnabled }),
    ...(p.morningBriefing   !== undefined && { morning_briefing: p.morningBriefing }),
    ...(p.taskReminders     !== undefined && { task_reminders: p.taskReminders }),
    ...(p.eveningReflection !== undefined && { evening_reflection: p.eveningReflection }),
    ...(p.weeklyReport      !== undefined && { weekly_report: p.weeklyReport }),
    ...(p.blockTransitions  !== undefined && { block_transitions: p.blockTransitions }),
    ...(p.coachNudges       !== undefined && { coach_nudges: p.coachNudges }),
    ...(p.briefingTime      !== undefined && { morning_time: p.briefingTime }),
    ...(p.reflectionTime    !== undefined && { evening_time: p.reflectionTime }),
  };
}

function mapPillar(p: RawPillar): Pillar {
  return {
    id: p.pillar_id || p.id || '',
    label: p.label || '',
    description: p.description || '',
    icon: p.icon || '◈',
    color: p.color || '#888',
    enabled: p.enabled ?? true,
    categories: [],
  };
}

interface RynaAction {
  type: string;
  payload?: Record<string, unknown>;
}

interface RynaResponse {
  response: string;
  action?: RynaAction;
}

export const api = {
  // ─── Auth ───────────────────────────────────────────────────────────────
  async signup(email: string, password: string, name: string): Promise<User> {
    const data = await fetchApi<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setTokens(data.access_token, data.refresh_token);
    return mapUser(data.user);
  },

  async login(email: string, password: string): Promise<User> {
    const data = await fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.access_token, data.refresh_token);
    return mapUser(data.user);
  },

  async logout(): Promise<void> {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
    }
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await fetchApi('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  async verifyToken(): Promise<User> {
    const data = await fetchApi<AuthResponse['user']>('/auth/verify');
    return mapUser(data);
  },

  // Profile
  async updateProfile(updates: Partial<Pick<User, 'name' | 'timezone' | 'occupation' | 'weeklyHours' | 'coachStyle' | 'has9to5' | 'workStartTime' | 'workEndTime' | 'wakeTime' | 'sleepTime' | 'deepWorkWindows'>>): Promise<void> {
    await fetchApi('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        ...(updates.name         !== undefined && { name: updates.name }),
        ...(updates.timezone     !== undefined && { timezone: updates.timezone }),
        ...(updates.occupation   !== undefined && { occupation: updates.occupation }),
        ...(updates.weeklyHours  !== undefined && { weekly_hours: updates.weeklyHours }),
        ...(updates.coachStyle   !== undefined && { coach_style: updates.coachStyle }),
        ...(updates.has9to5      !== undefined && { has_9_to_5: updates.has9to5 }),
        ...(updates.workStartTime !== undefined && { work_start_time: updates.workStartTime }),
        ...(updates.workEndTime   !== undefined && { work_end_time: updates.workEndTime }),
        ...(updates.wakeTime         !== undefined && { wake_time: updates.wakeTime }),
        ...(updates.sleepTime        !== undefined && { sleep_time: updates.sleepTime }),
        ...(updates.deepWorkWindows  !== undefined && { deep_work_windows: updates.deepWorkWindows }),
      }),
    });
  },

  async deleteAccount(): Promise<{ identity_deleted: boolean; message: string }> {
    return fetchApi('/user/account', { method: 'DELETE' });
  },

  // ─── Notification preferences ─────────────────────────────────────────────
  async getNotificationPrefs(): Promise<NotificationPreferences> {
    const d = await fetchApi<RawNotifPrefs>('/notifications/prefs');
    return mapNotifPrefs(d);
  },

  async updateNotificationPrefs(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const d = await fetchApi<RawNotifPrefs>('/notifications/prefs', {
      method: 'PATCH',
      body: JSON.stringify(unmapNotifPrefs(prefs)),
    });
    return mapNotifPrefs(d);
  },

  // ─── Web Push ───────────────────────────────────────────────────────────────
  async getVapidPublicKey(): Promise<{ public_key: string; configured: boolean }> {
    return fetchApi('/notifications/vapid-public-key');
  },

  async registerPushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }): Promise<void> {
    await fetchApi('/notifications/push-subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys, user_agent: sub.userAgent }),
    });
  },

  async unregisterPushSubscription(endpoint: string): Promise<void> {
    await fetchApi(`/notifications/push-subscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
  },

  async sendTestPush(): Promise<{ sent: number; failed: number }> {
    return fetchApi('/notifications/push-test', { method: 'POST' });
  },

  // Onboarding
  async saveOnboardingStep(step: number, data: Record<string, unknown>): Promise<void> {
    await fetchApi('/onboarding/save-step', {
      method: 'POST',
      body: JSON.stringify({ step, data }),
    });
  },

  async completeOnboarding(mode: string = 'form'): Promise<void> {
    await fetchApi('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  // AI-import onboarding — parses an uploaded doc into an editable draft
  // (nothing persisted yet), then confirmGoalsImport actually writes it.
  async importGoalsFile(file: File): Promise<GoalImportDraft> {
    const form = new FormData();
    form.append('file', file);
    interface RawDraftTask { title: string; description?: string; estimated_minutes: number; subtasks: string[]; }
    interface RawDraftGoal {
      draft_id: string; pillar_id: string; title: string; description?: string;
      timeline_type: string; goal_type: string; target_date?: string;
      parent_draft_id?: string | null; tasks: RawDraftTask[];
    }
    const data = await fetchApiUpload<{ life_areas_summary?: string; goals: RawDraftGoal[] }>('/onboarding/import', form);
    return {
      lifeAreasSummary: data.life_areas_summary,
      goals: data.goals.map(g => ({
        draftId: g.draft_id,
        pillarId: g.pillar_id as Goal['pillarId'],
        title: g.title,
        description: g.description,
        timelineType: g.timeline_type as Goal['timelineType'],
        type: g.goal_type as Goal['type'],
        targetDate: g.target_date,
        parentDraftId: g.parent_draft_id,
        tasks: g.tasks.map(t => ({
          title: t.title, description: t.description,
          estimatedMinutes: t.estimated_minutes, subtasks: t.subtasks || [],
        })),
      })),
    };
  },

  async confirmGoalsImport(goals: ImportDraftGoal[]): Promise<{ ok: boolean; goalsCreated: number }> {
    const data = await fetchApi<{ ok: boolean; goals_created: number }>('/onboarding/import/confirm', {
      method: 'POST',
      body: JSON.stringify({
        goals: goals.map(g => ({
          draft_id: g.draftId,
          pillar_id: g.pillarId,
          title: g.title,
          description: g.description,
          timeline_type: g.timelineType,
          goal_type: g.type,
          target_date: g.targetDate,
          parent_draft_id: g.parentDraftId,
          tasks: g.tasks.map(t => ({
            title: t.title, description: t.description,
            estimated_minutes: t.estimatedMinutes, subtasks: t.subtasks,
          })),
        })),
      }),
    });
    return { ok: data.ok, goalsCreated: data.goals_created };
  },

  async getOnboardingStatus(): Promise<{ complete: boolean; mode: string }> {
    return fetchApi('/onboarding/status');
  },

  // Daily
  async getToday(): Promise<DailyData> {
    const data = await fetchApi<RawDailyData>('/daily/today');

    return {
      id: data.id || '',
      dateKey: data.date_key || new Date().toISOString().split('T')[0],
      userId: data.user_id || '',
      buildHours: data.build_hours || 0,
      score: data.score || 0,
      reflection: {
        accomplished: data.reflection?.accomplished || '',
        blocked: data.reflection?.blocked || '',
        grateful: data.reflection?.grateful || '',
        tomorrowFocus: data.reflection?.tomorrow_focus || '',
      },
      pillarCompletion: data.pillar_completion || {},
      tasks: (data.tasks || []).map(mapTask),
      updatedAt: data.updated_at || '',
    };
  },

  async logDay(buildHours: number, reflection: DailyData['reflection']): Promise<void> {
    await fetchApi('/daily/log', {
      method: 'POST',
      body: JSON.stringify({
        build_hours: buildHours,
        reflection: {
          accomplished: reflection.accomplished,
          blocked: reflection.blocked,
          grateful: reflection.grateful,
          tomorrow_focus: reflection.tomorrowFocus,
        },
      }),
    });
  },

  async getHistory(days: number = 7): Promise<HistoryEntry[]> {
    const data = await fetchApi<RawHistoryEntry[]>(`/daily/history?days=${days}`, {
      method: 'GET',
    });
    return data.map(mapHistoryEntry);
  },

  async getStreak(): Promise<{ streak_current: number; streak_longest: number; last_log_date: string }> {
    return fetchApi('/daily/streak');
  },

  // Tasks
  async getTodayTasks(): Promise<Task[]> {
    const data = await fetchApi<RawTask[]>('/tasks/today');
    return data.map(mapTask);
  },

  async createTask(pillarId: string, title: string, description?: string): Promise<Task> {
    const data = await fetchApi<RawTask>('/tasks/create', {
      method: 'POST',
      body: JSON.stringify({ pillar_id: pillarId, title, description }),
    });
    return mapTask(data);
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const data = await fetchApi<RawTask>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return mapTask(data);
  },

  async deleteTask(taskId: string): Promise<void> {
    await fetchApi(`/tasks/${taskId}`, { method: 'DELETE' });
  },

  // Pillars
  async getPillars(): Promise<Pillar[]> {
    const data = await fetchApi<RawPillar[]>('/pillars/');
    return data.map(mapPillar);
  },

  async updatePillar(pillarId: string, updates: Partial<Pillar>): Promise<Pillar> {
    const data = await fetchApi<RawPillar>(`/pillars/${pillarId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return mapPillar(data);
  },

  // User
  async getMe(): Promise<{ id: string; email: string; stats: UserStatsResponse }> {
    return fetchApi('/user/me');
  },

  async getUserStats(): Promise<UserStatsResponse> {
    return fetchApi('/user/stats');
  },

  async updateUserStats(updates: Partial<UserStatsResponse>): Promise<UserStatsResponse> {
    return fetchApi('/user/stats', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Ryna AI
  async sendToRyna(query: string, goals: Record<string, string>, log: Record<string, unknown>, stats: Record<string, unknown>, style: string): Promise<RynaResponse> {
    return fetchApi<RynaResponse>('/ryna/chat', {
      method: 'POST',
      body: JSON.stringify({
        query,
        pillar_goals: goals,
        current_log: log,
        stats,
        coaching_style: style,
      }),
    });
  },

  async getRynaInsight(goals: Record<string, string>, log: Record<string, unknown>, last7: HistoryEntry[]): Promise<RynaResponse> {
    return fetchApi<RynaResponse>('/ryna/insight', {
      method: 'POST',
      body: JSON.stringify({
        pillar_goals: goals,
        current_log: log,
        last_7_days: last7,
      }),
    });
  },

  // ─── Goals ──────────────────────────────────────────────────────────────────
  async getGoals(): Promise<Goal[]> {
    const data = await fetchApi<RawGoal[]>('/goals/');
    return data.map(g => mapGoal(g));
  },

  async createGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
    const data = await fetchApi<RawGoal>('/goals/', {
      method: 'POST',
      body: JSON.stringify({
        pillar_id:        goal.pillarId,
        title:            goal.title,
        description:      goal.description,
        // Omitted (rather than sent as '') when the timeline is left for
        // the system to propose — the backend estimates one from
        // timeline_type/goal_type instead of forcing a fixed window.
        ...(goal.targetDate && { target_date: goal.targetDate }),
        status:            goal.status,
        progress:          goal.progress,
        goal_type:         goal.type,
        weekly_kpis:       goal.weeklyKPIs,
        weekly_plan:       goal.weeklyPlan,
        strategy:          goal.strategy,
        milestones:        goal.milestones || [],
        parent_goal_id:    goal.parentGoalId || null,
        timeline_type:     goal.timelineType,
        origin:            goal.origin,
      }),
    });
    return mapGoal(data, goal);
  },

  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<Partial<Goal>> {
    await fetchApi(`/goals/${goalId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(updates.title        !== undefined && { title:           updates.title }),
        ...(updates.description  !== undefined && { description:     updates.description }),
        ...(updates.targetDate   !== undefined && { target_date:     updates.targetDate }),
        ...(updates.status       !== undefined && { status:          updates.status }),
        ...(updates.progress     !== undefined && { progress:        updates.progress }),
        ...(updates.type         !== undefined && { goal_type:       updates.type }),
        ...(updates.weeklyKPIs   !== undefined && { weekly_kpis:     updates.weeklyKPIs }),
        ...(updates.weeklyPlan   !== undefined && { weekly_plan:     updates.weeklyPlan }),
        ...(updates.strategy     !== undefined && { strategy:        updates.strategy }),
        ...(updates.parentGoalId !== undefined && { parent_goal_id:  updates.parentGoalId }),
        ...(updates.timelineType !== undefined && { timeline_type:   updates.timelineType }),
      }),
    });
    return updates;
  },

  async deleteGoal(goalId: string): Promise<void> {
    await fetchApi(`/goals/${goalId}`, { method: 'DELETE' });
  },

  /** Explicit, user-triggered timeline adjustment — never automatic. */
  async replanGoalTimeline(goalId: string): Promise<{ goal: Goal; coachNote?: string }> {
    const data = await fetchApi<{ goal: RawGoal; coach_note?: string }>(`/goals/${goalId}/replan`, { method: 'POST' });
    return { goal: mapGoal(data.goal), coachNote: data.coach_note };
  },

  // ─── Milestones ─────────────────────────────────────────────────────────────
  async createMilestone(goalId: string, title: string, dueDate: string): Promise<Milestone> {
    interface RawMilestone { id: string; goal_id?: string; title?: string; due_date?: string; completed?: boolean; completed_at?: string; }
    const data = await fetchApi<RawMilestone>(`/goals/${goalId}/milestones`, {
      method: 'POST',
      body: JSON.stringify({ title, due_date: dueDate, completed: false }),
    });
    return {
      id: data.id, goalId: data.goal_id || goalId, title: data.title || title,
      dueDate: data.due_date || dueDate, completed: data.completed || false, completedAt: data.completed_at,
    };
  },

  async updateMilestone(goalId: string, milestoneId: string, updates: Partial<Pick<Milestone, 'title' | 'dueDate' | 'completed'>>): Promise<void> {
    await fetchApi(`/goals/${goalId}/milestones/${milestoneId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(updates.title   !== undefined && { title: updates.title }),
        ...(updates.dueDate !== undefined && { due_date: updates.dueDate }),
        ...(updates.completed !== undefined && { completed: updates.completed }),
      }),
    });
  },

  async deleteMilestone(goalId: string, milestoneId: string): Promise<void> {
    await fetchApi(`/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' });
  },

  // ─── Task AI generation ────────────────────────────────────────────────────
  async generateTasks(): Promise<Task[]> {
    const data = await fetchApi<RawTask[]>('/tasks/generate');
    return data.map(mapTask);
  },

  async spreadGoalTasks(): Promise<Task[]> {
    const data = await fetchApi<RawTask[]>('/tasks/spread-goals', { method: 'POST' });
    return data.map(mapTask);
  },

  // ─── Planner ──────────────────────────────────────────────────────────────
  async getPlannerBlocks(dateKey?: string): Promise<TimeBlock[]> {
    const q = dateKey ? `?date_key=${dateKey}` : '';
    const data = await fetchApi<RawTimeBlock[]>(`/planner/${q}`);
    return data.map(mapTimeBlock);
  },

  async createPlannerBlock(block: Omit<TimeBlock, 'id'>, dateKey?: string): Promise<TimeBlock> {
    const data = await fetchApi<RawTimeBlock>('/planner/', {
      method: 'POST',
      body: JSON.stringify(unmapTimeBlock(block, dateKey || new Date().toISOString().slice(0, 10))),
    });
    return mapTimeBlock(data);
  },

  async updatePlannerBlock(blockId: string, updates: Partial<TimeBlock>): Promise<TimeBlock> {
    const data = await fetchApi<RawTimeBlock>(`/planner/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify(unmapTimeBlock(updates)),
    });
    return mapTimeBlock(data);
  },

  async deletePlannerBlock(blockId: string): Promise<void> {
    await fetchApi(`/planner/${blockId}`, { method: 'DELETE' });
  },

  async reshuffleDay(reason?: string, dateKey?: string): Promise<TimeBlock[]> {
    const data = await fetchApi<RawTimeBlock[]>('/planner/reshuffle', {
      method: 'POST',
      body: JSON.stringify({ reason, date_key: dateKey }),
    });
    return data.map(mapTimeBlock);
  },

  // ─── Analytics ────────────────────────────────────────────────────────────
  async getKPISummary(): Promise<KPISummary> {
    try {
      const data = await fetchApi<Record<string, unknown>>('/analytics/summary');
      return {
        currentScore:        Number(data.current_score       ?? 0),
        streak:              Number(data.streak              ?? 0),
        level:               Number(data.level               ?? 1),
        xp:                  Number(data.xp                  ?? 0),
        weeklyAvgScore:      Number(data.weekly_avg_score    ?? 0),
        totalTasksCompleted: Number(data.total_tasks_completed ?? 0),
        buildHoursThisWeek:  Number(data.build_hours_this_week ?? 0),
        pillarDistribution:  (data.pillar_distribution as Record<string, number>) || {},
        categoryDistribution: {},
        disciplineScore:     Number(data.consistency_score   ?? 0),
        consistencyScore:    Number(data.consistency_score   ?? 0),
      };
    } catch {
      // Fallback: compute locally from available data
      const [today, history, stats] = await Promise.all([
        this.getToday().catch(() => null),
        this.getHistory(14).catch(() => [] as HistoryEntry[]),
        this.getUserStats().catch(() => ({ xp: 0, level: 1, streak_current: 0, streak_longest: 0, weekly_score: 0 } as UserStatsResponse)),
      ]);
      const weeklySlice = history.slice(0, 7);
      const weeklyAvgScore = average(weeklySlice.map((h) => h.score));
      return {
        currentScore: today?.score ?? 0,
        streak: stats.streak_current ?? 0,
        level: stats.level ?? 1,
        xp: stats.xp ?? 0,
        weeklyAvgScore: Number(weeklyAvgScore.toFixed(1)),
        totalTasksCompleted: history.reduce((s, h) => s + h.tasksCompleted, 0),
        buildHoursThisWeek: Number(weeklySlice.reduce((s, h) => s + h.buildHours, 0).toFixed(1)),
        pillarDistribution: {},
        categoryDistribution: {},
        disciplineScore: Math.round((weeklyAvgScore / 10) * 100),
        consistencyScore: Math.round(average(weeklySlice.map((h) => (h.tasksTotal > 0 ? (h.tasksCompleted / h.tasksTotal) * 100 : 0)))),
      };
    }
  },

  // ─── Leaderboard ──────────────────────────────────────────────────────────
  async getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    interface RawLeaderboardEntry {
      user_id?: string;
      name?: string;
      avatar_initial?: string;
      level?: number;
      xp?: number;
      streak_current?: number;
      weekly_score?: number;
      occupation?: string;
      pillars?: string[];
      badge?: string;
    }
    const data = await fetchApi<RawLeaderboardEntry[]>(`/leaderboard/?limit=${limit}`);
    return data.map((e, i) => ({
      userId: e.user_id || '',
      name: e.name || 'Anonymous',
      avatarInitial: e.avatar_initial || '?',
      level: e.level || 1,
      xp: e.xp || 0,
      streak: e.streak_current || 0,
      weeklyScore: e.weekly_score || 0,
      rank: i + 1,
      pillars: e.pillars || [],
      occupation: e.occupation || '',
      badge: e.badge,
    }));
  },

  async getWeeklyReport(): Promise<WeeklyReport> {
    try {
      const data = await fetchApi<Record<string, unknown>>('/analytics/weekly-report');
      return {
        weekStart:    String(data.week_start   ?? ''),
        weekEnd:      String(data.week_end     ?? ''),
        summary:      String(data.summary      ?? ''),
        highlights:   (data.highlights         as string[]) || [],
        improvements: (data.improvements       as string[]) || [],
        aiInsight:    String(data.ai_insight   ?? ''),
        coachMessage: String(data.coach_message ?? ''),
        nextWeekFocus: (data.next_week_focus   as string[]) || [],
      };
    } catch {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      return {
        weekStart: weekStart.toISOString().slice(0, 10),
        weekEnd: today.toISOString().slice(0, 10),
        summary: 'Report unavailable — backend may be offline.',
        highlights: [], improvements: [], aiInsight: '', coachMessage: 'Keep showing up.',
        nextWeekFocus: [],
      };
    }
  },

  // ─── Projects (ongoing, cadenced work) ─────────────────────────────────────
  async getProjects(status?: string): Promise<Project[]> {
    const data = await fetchApi<RawProject[]>(`/projects/${status ? `?status=${status}` : ''}`);
    return data.map(mapProject);
  },

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'sessionsThisWeek' | 'sessionsTarget' | 'lastWorkedOn'>): Promise<Project> {
    const data = await fetchApi<RawProject>('/projects/', { method: 'POST', body: JSON.stringify(unmapProject(project)) });
    return mapProject(data);
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const data = await fetchApi<RawProject>(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(unmapProject(updates)) });
    return mapProject(data);
  },

  async deleteProject(projectId: string): Promise<void> {
    await fetchApi(`/projects/${projectId}`, { method: 'DELETE' });
  },

  async getProjectUpdates(projectId: string): Promise<ProjectUpdateLog[]> {
    const data = await fetchApi<RawProjectUpdate[]>(`/projects/${projectId}/updates`);
    return data.map(mapProjectUpdate);
  },

  async logProjectUpdate(projectId: string, entry: { note?: string; minutesSpent?: number; countsAsSession?: boolean; blocker?: string; dateKey?: string }): Promise<ProjectUpdateLog> {
    const data = await fetchApi<RawProjectUpdate>(`/projects/${projectId}/updates`, {
      method: 'POST',
      body: JSON.stringify({
        note: entry.note, minutes_spent: entry.minutesSpent ?? 0,
        counts_as_session: entry.countsAsSession ?? true, blocker: entry.blocker,
        date_key: entry.dateKey,
      }),
    });
    return mapProjectUpdate(data);
  },

  // ─── Routine (the weekly container) ────────────────────────────────────────
  async getRoutine(): Promise<RoutineBlock[]> {
    const data = await fetchApi<RawRoutineBlock[]>('/routine/');
    return data.map(mapRoutineBlock);
  },

  async createRoutineBlock(block: Omit<RoutineBlock, 'id' | 'createdAt'>): Promise<RoutineBlock> {
    const data = await fetchApi<RawRoutineBlock>('/routine/', { method: 'POST', body: JSON.stringify(unmapRoutineBlock(block)) });
    return mapRoutineBlock(data);
  },

  async updateRoutineBlock(blockId: string, updates: Partial<RoutineBlock>): Promise<RoutineBlock> {
    const data = await fetchApi<RawRoutineBlock>(`/routine/${blockId}`, { method: 'PATCH', body: JSON.stringify(unmapRoutineBlock(updates)) });
    return mapRoutineBlock(data);
  },

  async deleteRoutineBlock(blockId: string): Promise<void> {
    await fetchApi(`/routine/${blockId}`, { method: 'DELETE' });
  },

  // ─── Planning engine ────────────────────────────────────────────────────────
  async getNextAction(): Promise<NextAction> {
    const data = await fetchApi<Record<string, unknown>>('/planning/next-action');
    return {
      slotLabel: String(data.slot_label ?? ''),
      slotType: String(data.slot_type ?? ''),
      minutesLeftInSlot: Number(data.minutes_left_in_slot ?? 0),
      recommendation: data.recommendation as string | undefined,
      projectId: data.project_id as string | undefined,
      projectName: data.project_name as string | undefined,
      taskTitle: data.task_title as string | undefined,
      reason: data.reason as string | undefined,
    };
  },

  async planWeek(weekStart?: string): Promise<WeekPlan> {
    const data = await fetchApi<{
      week_start: string;
      days: { date_key: string; day_of_week: number; blocks: RawTimeBlock[] }[];
      protected_main_quest?: string;
      at_risk_projects: string[];
    }>('/planning/week-plan', { method: 'POST', body: JSON.stringify({ week_start: weekStart }) });
    return {
      weekStart: data.week_start,
      days: data.days.map(d => ({ dateKey: d.date_key, dayOfWeek: d.day_of_week, blocks: d.blocks.map(mapTimeBlock) })),
      protectedMainQuest: data.protected_main_quest,
      atRiskProjects: data.at_risk_projects || [],
    };
  },

  // ─── Life-structure import (routine + projects from a doc, e.g. a life plan) ──
  async importLifeStructure(file: File): Promise<LifeStructureDraft> {
    const form = new FormData();
    form.append('file', file);
    const data = await fetchApiUpload<{
      summary?: string;
      routine_blocks: { draft_id: string; label: string; start_minute: number; end_minute: number; days_of_week: number[]; slot_type: string; is_schedulable: boolean; category: string }[];
      projects: { draft_id: string; name: string; description?: string; kind: string; pillar_id?: string; cadence_type: string; sessions_per_week: number; cadence_days: number[]; slot_types: string[]; session_minutes: number; is_main_quest: boolean; priority: number; needs_clarification?: string }[];
      open_questions: string[];
    }>('/life-structure/import', form);
    return {
      summary: data.summary,
      routineBlocks: data.routine_blocks.map(r => ({
        draftId: r.draft_id, label: r.label, startMinute: r.start_minute, endMinute: r.end_minute,
        daysOfWeek: r.days_of_week, slotType: r.slot_type as RoutineBlock['slotType'],
        isSchedulable: r.is_schedulable, category: r.category,
      })),
      projects: data.projects.map(p => ({
        draftId: p.draft_id, name: p.name, description: p.description, kind: p.kind as Project['kind'],
        pillarId: p.pillar_id, cadenceType: p.cadence_type as Project['cadenceType'],
        sessionsPerWeek: p.sessions_per_week, cadenceDays: p.cadence_days, slotTypes: p.slot_types,
        sessionMinutes: p.session_minutes, isMainQuest: p.is_main_quest, priority: p.priority,
        needsClarification: p.needs_clarification,
      })),
      openQuestions: data.open_questions || [],
    };
  },

  async confirmLifeStructureImport(draft: LifeStructureDraft): Promise<{ ok: boolean; routine_blocks_created: number; projects_created: number }> {
    return fetchApi('/life-structure/import/confirm', {
      method: 'POST',
      body: JSON.stringify({
        routine_blocks: draft.routineBlocks.map(r => ({
          draft_id: r.draftId, label: r.label, start_minute: r.startMinute, end_minute: r.endMinute,
          days_of_week: r.daysOfWeek, slot_type: r.slotType, is_schedulable: r.isSchedulable, category: r.category,
        })),
        projects: draft.projects.map(p => ({
          draft_id: p.draftId, name: p.name, description: p.description, kind: p.kind,
          pillar_id: p.pillarId, cadence_type: p.cadenceType, sessions_per_week: p.sessionsPerWeek,
          cadence_days: p.cadenceDays, slot_types: p.slotTypes, session_minutes: p.sessionMinutes,
          is_main_quest: p.isMainQuest, priority: p.priority, needs_clarification: p.needsClarification,
        })),
      }),
    });
  },
};