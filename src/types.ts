export type TaskCategory = 'SPIRITUAL' | 'PHYSICAL' | 'LEARNING' | 'CAREER' | 'CONTENT' | 'PROJECT';

export interface Task {
  id: string;
  label: string;
  category: TaskCategory;
  completed: boolean;
}

export interface ScheduleItem {
  time: string;
  activity: string;
  category: TaskCategory | 'REST' | 'OTHER';
  notes?: string;
}

export interface DailyData {
  tasks: Task[];
  reflection: {
    accomplished: string;
    blocked: string;
    grateful: string;
  };
  customSchedule?: ScheduleItem[];
}

export interface GlobalData {
  goals: {
    monthly: string;
    levels: string[];
    currentLevelIndex: number;
  };
  history: Record<string, DailyData>;
  notificationSettings: {
    dailyStampReminder: boolean;
    dailyStampTime: string;
    taskReminders: boolean;
  };
}

export type RynaMode = 'idle' | 'listening' | 'thinking' | 'speaking';
