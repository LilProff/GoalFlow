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

export type RynaActionType =
  | 'reshuffle'
  | 'mark_task'
  | 'start_timer'
  | 'stop_timer'
  | 'reset_timer'
  | 'navigate'
  | 'add_note'
  | 'advice'
  | 'get_status';

export interface RynaAction {
  type: RynaActionType;
  // mark_task
  taskKeyword?: string;
  completed?: boolean;
  // navigate
  tab?: 'tasks' | 'schedule' | 'analytics' | 'settings';
  // add_note
  noteField?: 'accomplished' | 'blocked' | 'grateful';
  noteContent?: string;
  // advice / get_status
  message?: string;
  // reshuffle
  reason?: string;
  impromptu?: string[];
}

export type ToastType = 'info' | 'success' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  type: ToastType;
}
