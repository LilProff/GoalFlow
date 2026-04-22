import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, PillarGoals, DailyTask, UserStats, ChatMessage, Toast, Pillar } from '@/lib/types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Onboarding
  onboardingStep: number;
  
  // Data
  pillarGoals: PillarGoals | null;
  todayTasks: DailyTask[];
  todayLog: {
    buildDone: boolean;
    showDone: boolean;
    earnDone: boolean;
    systemizeDone: boolean;
    buildHours: number;
    reflection: string;
  };
  
  // Stats
  stats: UserStats;
  
  // UI
  activeTab: 'today' | 'tasks' | 'analytics' | 'history' | 'settings';
  isLoading: boolean;
  
  // Chat
  chatHistory: ChatMessage[];
  
  // Toasts
  toasts: Toast[];
  
  // Actions
  setUser: (user: User | null) => void;
  setOnboardingStep: (step: number) => void;
  setPillarGoals: (goals: PillarGoals) => void;
  setTodayTasks: (tasks: DailyTask[]) => void;
  toggleTask: (taskId: string) => void;
  logPillar: (pillar: Pillar, done: boolean) => void;
  setBuildHours: (hours: number) => void;
  setReflection: (text: string) => void;
  setActiveTab: (tab: AppState['activeTab']) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const initialStats: UserStats = {
  userId: '',
  xp: 0,
  level: 'beginner',
  streakCurrent: 0,
  streakLongest: 0,
  lastLogDate: null,
};

const initialTodayLog = {
  buildDone: false,
  showDone: false,
  earnDone: false,
  systemizeDone: false,
  buildHours: 0,
  reflection: '',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      onboardingStep: 0,
      pillarGoals: null,
      todayTasks: [],
      todayLog: initialTodayLog,
      stats: initialStats,
      activeTab: 'today',
      isLoading: false,
      chatHistory: [],
      toasts: [],

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      
      setPillarGoals: (goals) => set({ pillarGoals: goals }),
      
      setTodayTasks: (tasks) => set({ todayTasks: tasks }),
      
      toggleTask: (taskId) => set((state) => ({
        todayTasks: state.todayTasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        ),
      })),
      
      logPillar: (pillar, done) => set((state) => {
        const newLog = { ...state.todayLog };
        const pillarKey = `${pillar.toLowerCase()}Done` as keyof typeof newLog;
        (newLog as any)[pillarKey] = done;
        
        // Recalculate score
        let score = 0;
        if (newLog.buildDone) score += 3;
        if (newLog.showDone) score += 2;
        if (newLog.earnDone) score += 2;
        if (newLog.systemizeDone) score += 2;
        
        return { todayLog: newLog };
      }),
      
      setBuildHours: (hours) => set((state) => ({
        todayLog: { ...state.todayLog, buildHours: hours },
      })),
      
      setReflection: (text) => set((state) => ({
        todayLog: { ...state.todayLog, reflection: text },
      })),
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      addChatMessage: (message) => set((state) => ({
        chatHistory: [...state.chatHistory, message],
      })),
      
      clearChat: () => set({ chatHistory: [] }),
      
      addToast: (toast) => set((state) => ({
        toasts: [...state.toasts, { ...toast, id: Date.now().toString() }],
      })),
      
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      logout: () => set({
        user: null,
        isAuthenticated: false,
        onboardingStep: 0,
        pillarGoals: null,
        todayTasks: [],
        todayLog: initialTodayLog,
        stats: initialStats,
        chatHistory: [],
      }),
    }),
    {
      name: 'goalflow-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingStep: state.onboardingStep,
        pillarGoals: state.pillarGoals,
        todayTasks: state.todayTasks,
        todayLog: state.todayLog,
        stats: state.stats,
        chatHistory: state.chatHistory,
      }),
    }
  )
);

// Helper to calculate level from XP
export function getLevelFromXP(xp: number): UserStats['level'] {
  if (xp >= 120) return 'beast';
  if (xp >= 60) return 'operator';
  if (xp >= 30) return 'builder';
  return 'beginner';
}

// Helper to calculate score from log
export function calculateScore(log: AppState['todayLog']): number {
  let score = 0;
  if (log.buildDone) score += 3;
  if (log.showDone) score += 2;
  if (log.earnDone) score += 2;
  if (log.systemizeDone) score += 2;
  if (log.buildHours >= 4) score += 1;
  return score;
}

// Helper to get XP from task completion
export function getXPForPillar(pillar: Pillar): number {
  switch (pillar) {
    case 'BUILD': return 30;
    case 'SHOW': return 20;
    case 'EARN': return 20;
    case 'SYSTEMIZE': return 20;
    default: return 10;
  }
}