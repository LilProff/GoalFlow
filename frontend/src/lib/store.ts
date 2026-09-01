import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { format } from 'date-fns';
import type {
  User, DailyData, Task, Goal, ChatMessage, OnboardingState,
  NotificationPreferences, KPISummary, HistoryEntry, WeeklyReport,
  LeaderboardEntry, AppNotification, TimeBlock, MCPAction, CoachStyle, TaskStatus
} from '../types';
import { api } from './api';
import { DEFAULT_PILLARS, LIFE_CATEGORIES } from './constants';

// ─── Time helpers ─────────────────────────────────────────────────────────────
export function minsToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
export function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ─── State shape ──────────────────────────────────────────────────────────────
interface AppState {
  isAuthenticated: boolean; user: User | null; authLoading: boolean;
  onboarding: OnboardingState;
  dailyData: DailyData | null; dailyLoading: boolean;
  goals: Goal[];
  kpi: KPISummary | null; history: HistoryEntry[]; weeklyReport: WeeklyReport | null;
  chatMessages: ChatMessage[]; chatLoading: boolean; chatOpen: boolean;
  leaderboard: LeaderboardEntry[];
  notifications: AppNotification[];
  timeBlocks: TimeBlock[]; plannerLoading: boolean;
  notificationPrefs: NotificationPreferences;
  sidebarCollapsed: boolean;

  // Auth
  logout: () => Promise<void>;
  /** Checks for a stored token and, if valid, loads the signed-in user's
   *  data. Resolves false if there's no valid session — that's the normal
   *  signed-out state, not an error. */
  initAuth: () => Promise<boolean>;
  /** Local-only sign-out reset — no network call. */
  resetAuthState: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logDay: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'timezone' | 'occupation' | 'weeklyHours' | 'coachStyle' | 'has9to5' | 'workStartTime' | 'workEndTime'>>) => Promise<void>;

  // Onboarding
  completeOnboarding: () => void;
  updateOnboardingStep: (step: number, data: Partial<OnboardingState>) => void;
  setOnboardingMode: (mode: 'form' | 'chat') => void;

  // Daily / Tasks
  toggleTask: (taskId: string) => void;
  updateBuildHours: (hours: number) => void;
  updateReflection: (field: keyof DailyData['reflection'], value: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  generateTasks: () => Promise<void>;
  spreadGoalTasks: () => Promise<void>;

  // Goals
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  deleteGoal: (goalId: string) => void;
  addMilestone: (goalId: string, title: string, dueDate: string) => Promise<void>;
  toggleMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  deleteMilestone: (goalId: string, milestoneId: string) => Promise<void>;

  // Planner
  toggleBlock: (blockId: string, field: 'completed' | 'skipped') => Promise<void>;
  updateBlock: (blockId: string, updates: Partial<TimeBlock>) => Promise<void>;
  addBlock: (block: Omit<TimeBlock, 'id'>) => Promise<void>;
  deleteBlock: (blockId: string) => Promise<void>;
  reshuffleDay: (reason?: string) => Promise<void>;
  syncTaskToPlanner: (task: Task) => void;
  syncPlannerToTasks: (blockId: string) => void;

  // Ryna Chat + MCP
  sendChatMessage: (content: string) => Promise<void>;
  executeMCPAction: (action: MCPAction) => Promise<string>;
  setChatOpen: (open: boolean) => void;
  switchCoachStyle: (style: CoachStyle) => void;

  // Notifications
  dismissNotification: (id: string) => void;
  addNotification: (n: Omit<AppNotification, 'id' | 'dismissed'>) => void;

  // UI
  setSidebarCollapsed: (v: boolean) => void;
  updateNotificationPrefs: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  deleteAccount: () => Promise<{ identity_deleted: boolean; message: string }>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const defaultOnboarding: OnboardingState = {
  step: 0, mode: 'form', completed: false,
  identity: { name:'', email:'', timezone:'America/New_York', occupation:'', weeklyHours:40, has9to5:false, workStartTime:'09:00', workEndTime:'17:00', direction:'exploring' },
  pillars: { selected:['BUILD','SHOW','EARN','SYSTEMIZE'], customPillars:[] },
  categories: { selected:['spiritual','physical','financial','mental','learning'] },
  goals: { goals:{}, timelines:{}, goalTypes:{} },
  schedule: { wakeTime:'06:00', sleepTime:'23:00', deepWorkWindows:[{start:'09:00',end:'12:00'}] },
  coachStyle: { style:'strategist' },
  chatHistory: [],
};

const defaultNotifPrefs: NotificationPreferences = {
  pushEnabled:false, morningBriefing:true, taskReminders:true,
  eveningReflection:true, weeklyReport:true, blockTransitions:true, coachNudges:true,
  briefingTime:'07:00', reflectionTime:'21:00',
};

const blankUserState = () => ({
  isAuthenticated: false, user: null, dailyData: null,
  goals: [], chatMessages: [], leaderboard: [], notifications: [], timeBlocks: [],
});

let msgId = 100;

const RYNA_RESPONSES = [
  "Understood. Based on your trajectory and goals, prioritise the highest-leverage task first while your energy is peak. What's the specific blocker?",
  "Your BUILD momentum is strong. Data shows you perform best in 90-minute focused blocks. Protect the next one — no meetings, no distractions.",
  "I'm noticing a pattern: you consistently skip EARN tasks when BUILD energy is high. That's avoidance. Schedule outreach as your first task tomorrow.",
  "Cross-referencing your goals with this week's output: on track for BUILD, behind on SHOW. Recommend posting today — even a short update compounds.",
  "Execution is the only metric that matters. What's the smallest action you can take in the next 10 minutes to move the needle?",
  "Your EARN goal is at-risk. The gap between BUILD progress and EARN tells me you're building without monetising. Time to flip the order.",
  "Good question. Let me think through this with you. What outcome are you actually optimising for right now?",
];

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create<AppState>()(persist((set, get) => ({
  isAuthenticated: false, user: null, authLoading: false,
  onboarding: defaultOnboarding,
  dailyData: null, dailyLoading: false,
  goals: [],
  kpi: null, history: [], weeklyReport: null,
  chatMessages: [], chatLoading: false, chatOpen: false,
  leaderboard: [],
  notifications: [],
  timeBlocks: [], plannerLoading: false,
  notificationPrefs: defaultNotifPrefs,
  sidebarCollapsed: false,

  // ── Auth (self-issued JWT) ────────────────────────────────────────────────
  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Clear local state even if API call fails
    }
    set(blankUserState());
  },

  resetAuthState: () => set({ ...blankUserState(), authLoading: false }),

  login: async (email, password) => {
    set({ authLoading: true });
    try {
      await api.login(email, password);
      await get().initAuth();
    } catch (e) {
      set({ authLoading: false });
      throw e;
    }
  },

  signup: async (email, password, name) => {
    set({ authLoading: true });
    try {
      await api.signup(email, password, name);
      await get().initAuth();
      // Pre-fill the onboarding wizard's name field with what they just typed
      // — they shouldn't have to re-enter it a screen later.
      set(s => ({
        onboarding: s.user?.onboardingComplete
          ? s.onboarding
          : { ...s.onboarding, identity: { ...s.onboarding.identity, name } },
      }));
    } catch (e) {
      set({ authLoading: false });
      throw e;
    }
  },

  initAuth: async () => {
    // Called on app boot to check for a stored token, and after login/signup
    // to load everything else. A thrown/failed verify here means there's no
    // valid session (no token, or token+refresh both expired) — genuinely
    // signed out, not an error to surface.
    if (!api.isAuthenticated()) {
      set({ authLoading: false });
      return false;
    }
    try {
      const user = await api.verifyToken();
      const [dailyData, pillars, stats, history, kpi, weeklyReport, goals, leaderboard, timeBlocks, notifPrefs] = await Promise.all([
        api.getToday().catch(() => null),
        api.getPillars().catch(() => []),
        api.getUserStats().catch(() => ({ xp: 0, level: 1, streak_current: 0, streak_longest: 0 })),
        api.getHistory(14).catch(() => []),
        api.getKPISummary().catch(() => null),
        api.getWeeklyReport().catch(() => null),
        api.getGoals().catch(() => []),
        api.getLeaderboard().catch(() => []),
        api.getPlannerBlocks().catch(() => []),
        api.getNotificationPrefs().catch(() => null),
      ]);
      set({
        isAuthenticated: true,
        authLoading: false,
        user: { ...user, level: stats.level, xp: stats.xp, streak: stats.streak_current, longestStreak: stats.streak_longest, pillars },
        dailyData,
        goals,
        history,
        kpi,
        weeklyReport,
        leaderboard,
        timeBlocks,
        ...(notifPrefs ? { notificationPrefs: notifPrefs } : {}),
      });
      // Project any scheduled tasks onto the timeline alongside the real blocks.
      dailyData?.tasks.forEach(t => { if (t.startTime) get().syncTaskToPlanner(t); });
      return true;
    } catch {
      // No stored token, or it (and its refresh) are no longer valid.
      set({ authLoading: false });
      return false;
    }
  },

  logDay: async () => {
    const { dailyData } = get();
    if (!dailyData) return;
    try {
      await api.logDay(dailyData.buildHours, dailyData.reflection);
    } catch (e) {
      console.error('Failed to log day:', e);
    }
  },

  updateProfile: async (updates) => {
    await api.updateProfile(updates);
    set(s => (s.user ? { user: { ...s.user, ...updates } } : {}));
  },

  completeOnboarding: async () => {
    const user = get().user;
    const ob = get().onboarding;
    if (!user) return;

    // Persist everything the wizard actually collected — this used to be
    // silently dropped (only the onboarding_complete flag was ever set),
    // so users landed on a fresh dashboard with default pillars and no
    // goals no matter what they entered.
    const chosenPillars = [
      ...DEFAULT_PILLARS.filter(p => ob.pillars.selected.includes(p.id)),
      ...ob.pillars.customPillars.map(cp => ({
        id: cp.id, label: cp.label, icon: '◈', color: '#5a5448',
        enabled: true, categories: [] as string[], weeklyKPIs: [] as string[],
      })),
    ];
    const chosenCategories = LIFE_CATEGORIES.filter(c => ob.categories.selected.includes(c.id));

    await api.saveOnboardingStep(6, {
      name: ob.identity.name,
      timezone: ob.identity.timezone,
      occupation: ob.identity.occupation,
      has9to5: ob.identity.has9to5,
      workStartTime: ob.identity.workStartTime,
      workEndTime: ob.identity.workEndTime,
      coachStyle: ob.coachStyle.style,
      pillars: chosenPillars.map(p => ({
        id: p.id, label: p.label, color: p.color, icon: p.icon,
        enabled: true, categories: p.categories, weeklyKPIs: p.weeklyKPIs,
      })),
      categories: chosenCategories.map(c => ({
        id: c.id, label: c.label, description: c.description,
        icon: c.icon, color: c.color, enabled: true, pillarId: '',
      })),
      goals: ob.goals.goals,
      goalTypes: ob.goals.goalTypes,
    }).catch(err => console.error('Failed to save onboarding data:', err));

    // Call API to mark onboarding complete in backend
    await api.completeOnboarding(ob.mode).catch(console.error);

    const [dailyData, pillars, history, kpi, weeklyReport, goals, leaderboard, timeBlocks] = await Promise.all([
      api.getToday().catch(() => null),
      api.getPillars().catch(() => []),
      api.getHistory(14).catch(() => []),
      api.getKPISummary().catch(() => null),
      api.getWeeklyReport().catch(() => null),
      api.getGoals().catch(() => []),
      api.getLeaderboard().catch(() => []),
      api.getPlannerBlocks().catch(() => []),
    ]);
    // Everything here is the user's own real data. A fresh account legitimately
    // has empty goals/tasks/leaderboard — the pages render empty states for
    // that. Falling back to MOCK_* (as this used to) showed a brand-new user a
    // stranger's goals, a fabricated leaderboard and a pre-written chat
    // history, which then silently diverged from the database on first edit.
    set(s => ({
      user: { ...s.user!, onboardingComplete: true, pillars },
      dailyData,
      goals,
      kpi,
      history,
      weeklyReport,
      chatMessages: [],
      leaderboard,
      notifications: [],
      timeBlocks,
      // The wizard is done — drop the persisted draft so it can't resurface
      // stale (e.g. a second onboarding after deleting and recreating an
      // account on the same device/browser).
      onboarding: defaultOnboarding,
    }));
    dailyData?.tasks.forEach(t => { if (t.startTime) get().syncTaskToPlanner(t); });
  },

  updateOnboardingStep: (step, data) => set(s => ({ onboarding: { ...s.onboarding, ...data, step } })),
  setOnboardingMode: (mode) => set(s => ({ onboarding: { ...s.onboarding, mode } })),

  // ── Tasks ─────────────────────────────────────────────────────────────────
  toggleTask: async (taskId) => {
    const state = get();
    if (!state.dailyData) return;
    const task = state.dailyData.tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTask(taskId, { status: newStatus });
    } catch (e) {
      console.error('Failed to update task:', e);
    }
    set(s => {
      if (!s.dailyData) return {};
      const tasks = s.dailyData.tasks.map(t =>
        t.id === taskId
          ? { ...t, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined }
          : t
      );
      const done = tasks.filter(t => t.status === 'completed').length;
      const score = tasks.length > 0 ? +((done / tasks.length) * 10).toFixed(1) : 0;
      const updatedTask = tasks.find(t => t.id === taskId);
      const newBlocks = s.timeBlocks.map(b =>
        b.id === `task-${taskId}` && updatedTask
          ? { ...b, completed: updatedTask.status === 'completed' }
          : b
      );
      return { dailyData: { ...s.dailyData, tasks, score }, timeBlocks: newBlocks };
    });
  },

  updateBuildHours: (hours) => set(s => ({
    dailyData: s.dailyData ? { ...s.dailyData, buildHours: hours } : null,
  })),

  updateReflection: (field, value) => set(s => ({
    dailyData: s.dailyData ? { ...s.dailyData, reflection: { ...s.dailyData.reflection, [field]: value } } : null,
  })),

  addTask: async (task) => {
    try {
      const newTask = await api.createTask(task.pillarId, task.title, task.description);
      set(s => ({ dailyData: s.dailyData ? { ...s.dailyData, tasks: [...s.dailyData.tasks, newTask] } : null }));
      if (task.startTime) {
        get().syncTaskToPlanner(newTask);
      }
    } catch (e) {
      console.error('Failed to create task:', e);
      // Fallback to local state
      const newTask: Task = { ...task, id: `t${Date.now()}`, createdAt: new Date().toISOString() };
      set(s => ({ dailyData: s.dailyData ? { ...s.dailyData, tasks: [...s.dailyData.tasks, newTask] } : null }));
    }
  },

  deleteTask: async (taskId) => {
    try {
      await api.deleteTask(taskId);
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
    set(s => ({
      dailyData: s.dailyData ? { ...s.dailyData, tasks: s.dailyData.tasks.filter(t => t.id !== taskId) } : null,
      timeBlocks: s.timeBlocks.filter(b => b.id !== `task-${taskId}`),
    }));
  },

  updateTask: async (taskId, updates) => {
    try {
      await api.updateTask(taskId, updates);
    } catch (e) {
      console.error('Failed to update task:', e);
    }
    set(s => {
      if (!s.dailyData) return {};
      const tasks = s.dailyData.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
      const updatedTask = tasks.find(t => t.id === taskId);
      // Sync time changes to planner
      const newBlocks = s.timeBlocks.map(b => {
        if (b.id !== `task-${taskId}` || !updatedTask) return b;
        const startMin = updatedTask.startTime ? timeToMins(updatedTask.startTime) : b.startMinute;
        return {
          ...b,
          startMinute: startMin,
          durationMinutes: updatedTask.estimatedMinutes ?? b.durationMinutes,
          label: updatedTask.title ?? b.label,
        };
      });
      return { dailyData: { ...s.dailyData, tasks }, timeBlocks: newBlocks };
    });
  },

  generateTasks: async () => {
    set({ dailyLoading: true });
    try {
      const tasks = await api.generateTasks();
      set(s => ({
        dailyLoading: false,
        dailyData: s.dailyData ? { ...s.dailyData, tasks } : null,
      }));
      // Sync tasks with start times to planner
      tasks.forEach(t => { if (t.startTime) get().syncTaskToPlanner(t); });
    } catch (e) {
      console.error('generateTasks failed:', e);
      set({ dailyLoading: false });
    }
  },

  spreadGoalTasks: async () => {
    set({ dailyLoading: true });
    try {
      const tasks = await api.spreadGoalTasks();
      set(s => ({
        dailyLoading: false,
        dailyData: s.dailyData ? { ...s.dailyData, tasks } : null,
      }));
      tasks.forEach(t => { if (t.startTime) get().syncTaskToPlanner(t); });
    } catch (e) {
      console.error('spreadGoalTasks failed:', e);
      set({ dailyLoading: false });
    }
  },

  // ── Goals ─────────────────────────────────────────────────────────────────
  updateGoal: async (goalId, updates) => {
    // Optimistic update
    set(s => ({ goals: s.goals.map(g => g.id === goalId ? { ...g, ...updates } : g) }));
    try {
      await api.updateGoal(goalId, updates);
    } catch (e) {
      console.error('Failed to update goal:', e);
      // Could revert here, but optimistic is usually fine
    }
  },
  addGoal: async (goal) => {
    try {
      const newGoal = await api.createGoal(goal);
      set(s => ({ goals: [...s.goals, newGoal] }));
    } catch (e) {
      console.error('Failed to create goal:', e);
      // Fallback local
      const newGoal: Goal = { ...goal, id: `g${Date.now()}`, createdAt: new Date().toISOString() };
      set(s => ({ goals: [...s.goals, newGoal] }));
    }
  },
  deleteGoal: async (goalId) => {
    set(s => ({ goals: s.goals.filter(g => g.id !== goalId) }));
    try {
      await api.deleteGoal(goalId);
    } catch (e) {
      console.error('Failed to delete goal:', e);
    }
  },

  addMilestone: async (goalId, title, dueDate) => {
    try {
      const milestone = await api.createMilestone(goalId, title, dueDate);
      set(s => ({
        goals: s.goals.map(g => g.id === goalId ? { ...g, milestones: [...g.milestones, milestone] } : g),
      }));
    } catch (e) {
      console.error('Failed to add milestone:', e);
      throw e;
    }
  },

  toggleMilestone: async (goalId, milestoneId) => {
    const goal = get().goals.find(g => g.id === goalId);
    const milestone = goal?.milestones.find(m => m.id === milestoneId);
    if (!milestone) return;
    const completed = !milestone.completed;
    set(s => ({
      goals: s.goals.map(g => g.id !== goalId ? g : {
        ...g, milestones: g.milestones.map(m => m.id === milestoneId ? { ...m, completed } : m),
      }),
    }));
    try {
      await api.updateMilestone(goalId, milestoneId, { completed });
    } catch (e) {
      console.error('Failed to update milestone:', e);
    }
  },

  deleteMilestone: async (goalId, milestoneId) => {
    set(s => ({
      goals: s.goals.map(g => g.id !== goalId ? g : { ...g, milestones: g.milestones.filter(m => m.id !== milestoneId) }),
    }));
    try {
      await api.deleteMilestone(goalId, milestoneId);
    } catch (e) {
      console.error('Failed to delete milestone:', e);
    }
  },

  // ── Planner ───────────────────────────────────────────────────────────────
  toggleBlock: async (blockId, field) => {
    // Task-derived blocks (id `task-<taskId>`) are a client-side projection
    // of dailyData.tasks — their source of truth is /tasks, not /planner.
    // Delegate to toggleTask, which already persists and keeps this same
    // timeBlocks array in sync.
    if (blockId.startsWith('task-')) {
      await get().toggleTask(blockId.replace('task-', ''));
      return;
    }
    const current = get().timeBlocks.find(b => b.id === blockId);
    if (!current) return;
    const newValue = !current[field];
    set(s => ({
      timeBlocks: s.timeBlocks.map(b =>
        b.id === blockId
          ? { ...b, [field]: newValue, completed: field === 'completed' ? newValue : false, skipped: field === 'skipped' ? newValue : false }
          : b
      ),
    }));
    try {
      await api.updatePlannerBlock(blockId, field === 'completed'
        ? { completed: newValue, skipped: false }
        : { skipped: newValue, completed: false });
    } catch (e) {
      console.error('Failed to update block:', e);
    }
  },

  updateBlock: async (blockId, updates) => {
    // Same task-vs-real-block split as toggleBlock.
    if (blockId.startsWith('task-')) {
      const taskId = blockId.replace('task-', '');
      await get().updateTask(taskId, {
        ...(updates.startMinute !== undefined && { startTime: minsToTime(updates.startMinute) }),
        ...(updates.startMinute !== undefined && updates.durationMinutes !== undefined && {
          endTime: minsToTime(updates.startMinute + updates.durationMinutes),
        }),
        ...(updates.durationMinutes !== undefined && { estimatedMinutes: updates.durationMinutes }),
        ...(updates.label !== undefined && { title: updates.label }),
      });
      return;
    }
    set(s => ({ timeBlocks: s.timeBlocks.map(b => b.id === blockId ? { ...b, ...updates } : b) }));
    try {
      await api.updatePlannerBlock(blockId, updates);
    } catch (e) {
      console.error('Failed to update block:', e);
    }
  },

  addBlock: async (block) => {
    const tempId = `b${Date.now()}`;
    set(s => ({ timeBlocks: [...s.timeBlocks, { ...block, id: tempId }].sort((a, b) => a.startMinute - b.startMinute) }));
    try {
      const created = await api.createPlannerBlock(block);
      set(s => ({ timeBlocks: s.timeBlocks.map(b => b.id === tempId ? created : b) }));
    } catch (e) {
      console.error('Failed to create block:', e);
    }
  },

  deleteBlock: async (blockId) => {
    if (blockId.startsWith('task-')) {
      await get().deleteTask(blockId.replace('task-', ''));
      return;
    }
    set(s => ({ timeBlocks: s.timeBlocks.filter(b => b.id !== blockId) }));
    try {
      await api.deletePlannerBlock(blockId);
    } catch (e) {
      console.error('Failed to delete block:', e);
    }
  },

  reshuffleDay: async (reason) => {
    set({ plannerLoading: true });
    try {
      const mapped = await api.reshuffleDay(reason);
      const notif: AppNotification = {
        id: `n${Date.now()}`, type: 'reshuffle',
        title: 'Day Reshuffled by Ryna',
        message: reason ? `Ryna reshuffled your day: ${reason}.` : 'Ryna optimised your remaining blocks.',
        time: format(new Date(), 'HH:mm'), dismissed: false,
      };
      set(s => ({ plannerLoading: false, timeBlocks: mapped, notifications: [notif, ...s.notifications] }));
    } catch (e) {
      console.error('reshuffleDay failed:', e);
      set({ plannerLoading: false });
    }
  },

  syncTaskToPlanner: (task) => {
    if (!task.startTime) return;
    const startMin = timeToMins(task.startTime);
    const block: TimeBlock = {
      id: `task-${task.id}`,
      label: task.title,
      category: task.pillarId === 'BUILD' ? 'deepwork' : task.pillarId === 'SHOW' ? 'show' : task.pillarId === 'EARN' ? 'earn' : 'admin',
      startMinute: startMin,
      durationMinutes: task.estimatedMinutes,
      pillarId: task.pillarId,
      completed: task.status === 'completed',
      skipped: task.status === 'skipped',
      flexible: true,
      priority: 'high',
      userEditable: true,
    };
    set(s => {
      const existing = s.timeBlocks.find(b => b.id === `task-${task.id}`);
      if (existing) {
        return { timeBlocks: s.timeBlocks.map(b => b.id === `task-${task.id}` ? block : b) };
      }
      return { timeBlocks: [...s.timeBlocks, block].sort((a, b) => a.startMinute - b.startMinute) };
    });
  },

  syncPlannerToTasks: (blockId) => {
    const { timeBlocks, dailyData } = get();
    const block = timeBlocks.find(b => b.id === blockId);
    if (!block || !blockId.startsWith('task-') || !dailyData) return;
    const taskId = blockId.replace('task-', '');
    const tasks = dailyData.tasks.map(t =>
      t.id === taskId
        ? { ...t, startTime: minsToTime(block.startMinute), endTime: minsToTime(block.startMinute + block.durationMinutes), estimatedMinutes: block.durationMinutes }
        : t
    );
    set(s => ({ dailyData: s.dailyData ? { ...s.dailyData, tasks } : null }));
  },

  // ── Ryna Chat + MCP ───────────────────────────────────────────────────────
  sendChatMessage: async (content) => {
    const state = get();
    const userMsg: ChatMessage = { id: `msg${++msgId}`, role: 'user', content, timestamp: new Date().toISOString() };
    set(s => ({ chatMessages: [...s.chatMessages, userMsg], chatLoading: true }));
    
    try {
      // Build goals from user pillars
      const goals: Record<string, string> = {};
      if (state.user?.pillars) {
        state.user.pillars.forEach(p => { goals[p.id] = p.goal90Day || ''; });
      }
      
      // Build current log from daily data
      const log: Record<string, unknown> = {};
      if (state.dailyData) {
        log.build_hours = state.dailyData.buildHours;
        log.build_done = state.dailyData.tasks.some(t => t.pillarId === 'BUILD' && t.status === 'completed');
        log.show_done = state.dailyData.tasks.some(t => t.pillarId === 'SHOW' && t.status === 'completed');
        log.earn_done = state.dailyData.tasks.some(t => t.pillarId === 'EARN' && t.status === 'completed');
        log.systemize_done = state.dailyData.tasks.some(t => t.pillarId === 'SYSTEMIZE' && t.status === 'completed');
      }
      
      // Build stats
      const stats: Record<string, unknown> = {
        streak_current: state.user?.streak || 0,
        xp: state.user?.xp || 0,
        level: state.user?.level || 1,
        weekly_score: state.user?.weeklyScore || 0,
      };
      
      const response = await api.sendToRyna(
        content,
        goals,
        log,
        stats,
        state.user?.coachStyle || 'strategist'
      );
      
      const aiMsg: ChatMessage = {
        id: `msg${++msgId}`, role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
      };
      set(s => ({ chatMessages: [...s.chatMessages, aiMsg], chatLoading: false }));
    } catch (error) {
      console.error('Ryna chat error:', error);
      // Fallback to mock response if API fails
      const aiMsg: ChatMessage = {
        id: `msg${++msgId}`, role: 'assistant',
        content: RYNA_RESPONSES[Math.floor(Math.random() * RYNA_RESPONSES.length)],
        timestamp: new Date().toISOString(),
      };
      set(s => ({ chatMessages: [...s.chatMessages, aiMsg], chatLoading: false }));
    }
  },

  executeMCPAction: async (action) => {
    const state = get();
    const { type, payload } = action;
    const p = payload as Record<string, unknown> || {};
    
    try {
      if (type === 'add_task') {
        const pillarId = String(p.pillarId || 'BUILD');
        const title = String(p.title || 'New task from Ryna');
        const description = String(p.description || '');
        const estimatedMinutes = Number(p.estimatedMinutes || 30);
        const startTime = String(p.startTime || '15:00');
        
        await get().addTask({ 
          pillarId, 
          title, 
          description, 
          estimatedMinutes, 
          status: 'pending', 
          isAIGenerated: true, 
          dateKey: format(new Date(), 'yyyy-MM-dd'), 
          startTime, 
          endTime: minsToTime(timeToMins(startTime) + estimatedMinutes) 
        });
        return `✓ Task "${title}" added to your ${pillarId} pillar.`;
      }
      
      if (type === 'complete_task') {
        const taskId = String(p.taskId || '');
        if (taskId) {
          await get().toggleTask(taskId);
          return '✓ Task marked complete!';
        }
        return 'No task selected to complete.';
      }
      
      if (type === 'skip_task') {
        const taskId = String(p.taskId || '');
        if (taskId && state.dailyData) {
          const task = state.dailyData.tasks.find(t => t.id === taskId);
          if (task) {
            await api.updateTask(taskId, { status: 'skipped' });
            set(s => {
              if (!s.dailyData) return {};
              const tasks = s.dailyData.tasks.map(t => t.id === taskId ? { ...t, status: 'skipped' as const } : t);
              return { dailyData: { ...s.dailyData, tasks } };
            });
            return '✓ Task skipped.';
          }
        }
        return 'No task to skip.';
      }
      
      if (type === 'reshuffle_day') {
        await get().reshuffleDay();
        return 'Day reshuffled. Buffer compressed, Deep Work protected.';
      }
      
      if (type === 'generate_tasks') {
        await get().generateTasks();
        return 'AI tasks generated for today with time allocations.';
      }
      
      if (type === 'change_task_time') {
        const taskId = String(p.taskId || '');
        const newTime = String(p.startTime || '');
        if (taskId && newTime && state.dailyData) {
          const task = state.dailyData.tasks.find(t => t.id === taskId);
          if (task) {
            try {
              await api.updateTask(taskId, { status: task.status });
            } catch { /* ignore API failure, update local state */ }
            get().updateTask(taskId, { startTime: newTime });
            return `Task rescheduled to ${newTime}.`;
          }
        }
        return 'Could not reschedule task.';
      }
      
      if (type === 'switch_coach_style') {
        const style = String(p.style || 'drill-sergeant');
        set(s => ({ user: s.user ? { ...s.user, coachStyle: style as CoachStyle } : null }));
        return `Coach style switched to ${style}.`;
      }
      
      if (type === 'add_goal') {
        const pillarId = String(p.pillarId || 'BUILD');
        const title = String(p.title || '');
        const userId = state.user?.id || '';
        if (title && userId) {
          get().addGoal({
            userId,
            pillarId,
            title,
            description: '',
            targetDate: format(new Date(Date.now() + 90 * 86400000), 'yyyy-MM-dd'),
            status: 'active',
            progress: 0,
            type: 'project',
            weeklyKPIs: [],
            milestones: [],
          });
          return `Goal "${title}" added to ${pillarId}.`;
        }
        return 'Please provide a goal title.';
      }
      
      if (type === 'update_goal_progress') {
        const goalId = String(p.goalId || '');
        const progress = Number(p.progress || 0);
        if (goalId && progress !== undefined) {
          get().updateGoal(goalId, { progress });
          return `Goal progress updated to ${progress}%.`;
        }
        return 'Could not update goal progress.';
      }
      
      if (type === 'draft_cold_email') {
        const context = String(p.context || '');
        return `Cold email draft:\n\nSubject: Quick question about ${context || '[their problem]'}\n\nHi [Name],\n\nI noticed you're working on ${context || 'something related to your business'}. I built GoalFlow to solve exactly that.\n\nWould you be open to a 15-minute call this week?\n\n— [Your Name]`;
      }
      
      if (type === 'generate_content_idea') {
        const pillar = String(p.pillar || 'BUILD');
        return `Content idea for ${pillar}:\n\n**"How I achieved [goal] in 90 days using the ${pillar} pillar..."**\n\nThread format. Start with the result, show the process, end with a question.\n\nPost before 2pm for best reach.`;
      }
      
      return `Action ${type} executed.`;
    } catch (error) {
      console.error('MCP action error:', error);
      return `Action failed. Please try again.`;
    }
  },

  setChatOpen: (open) => set({ chatOpen: open }),
  switchCoachStyle: (style) => set(s => ({ user: s.user ? { ...s.user, coachStyle: style } : null })),

  // ── Notifications ─────────────────────────────────────────────────────────
  dismissNotification: (id) => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, dismissed: true } : n),
  })),

  addNotification: (n) => set(s => ({
    notifications: [{ ...n, id: `n${Date.now()}`, dismissed: false }, ...s.notifications],
  })),

  // ── UI ────────────────────────────────────────────────────────────────────
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  // Optimistic: flip the toggle immediately, persist in the background, and
  // roll back if the write fails so the UI never claims a saved setting that
  // isn't. Previously this only ever touched local state, so every
  // notification preference silently reset on reload.
  updateNotificationPrefs: async (prefs) => {
    const previous = get().notificationPrefs;
    set(s => ({ notificationPrefs: { ...s.notificationPrefs, ...prefs } }));
    try {
      const saved = await api.updateNotificationPrefs(prefs);
      set({ notificationPrefs: saved });
    } catch (e) {
      console.error('Failed to save notification preferences:', e);
      set({ notificationPrefs: previous });
    }
  },

  deleteAccount: async () => {
    const result = await api.deleteAccount();
    set({ ...blankUserState(), authLoading: false });
    return result;
  },
}),
{
  name: 'goalflow-ui-state',
  storage: createJSONStorage(() => localStorage),
  // Only in-progress local drafts and device-level UI prefs persist here —
  // never auth tokens (those have their own localStorage keys in api.ts,
  // deliberately separate) or server-owned data (goals/tasks/etc. always
  // come fresh from initAuth() so they can't go stale against another
  // device). The concrete problem this solves: the onboarding wizard is a
  // multi-minute flow with real typed input, and previously a reload or a
  // backgrounded tab getting killed (common on mobile) silently wiped
  // whatever step the user was on.
  partialize: (state) => ({
    onboarding: state.onboarding,
    sidebarCollapsed: state.sidebarCollapsed,
  }),
}));
