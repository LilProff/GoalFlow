export type Pillar = 'BUILD' | 'SHOW' | 'EARN' | 'SYSTEMIZE';

export type CoachingStyle = 'drill_sergeant' | 'balanced' | 'gentle';

export type UserPhase = 1 | 2 | 3;

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
  phase: UserPhase;
  coachingStyle: CoachingStyle;
  wakeTime: string;
  sleepTime: string;
  hoursAvailable: number;
  onboardingComplete: boolean;
  createdAt: Date;
}

export interface PillarGoals {
  build: string;
  show: string;
  earn: string;
  systemize: string;
  targetIncome: string;
  targetContent: string;
}

export interface DailyTask {
  id: string;
  pillar: Pillar;
  label: string;
  completed: boolean;
}

export interface DailyLog {
  id: string;
  userId: string;
  date: string;
  buildDone: boolean;
  showDone: boolean;
  earnDone: boolean;
  systemizeDone: boolean;
  buildHours: number;
  score: number;
  reflection: string;
  taskIds: string[];
  createdAt: Date;
}

export interface UserStats {
  userId: string;
  xp: number;
  level: 'beginner' | 'builder' | 'operator' | 'beast';
  streakCurrent: number;
  streakLongest: number;
  lastLogDate: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ryna';
  content: string;
  timestamp: Date;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

export interface ActionResponse {
  type: 'message' | 'task_complete' | 'navigation' | 'score_update';
  content?: string;
  taskId?: string;
  tab?: 'tasks' | 'analytics' | 'history' | 'settings';
  scoreDelta?: number;
}