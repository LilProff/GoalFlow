import { useState, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  
  return res.json();
}

// Types
interface Task {
  id: string;
  pillar: string;
  label: string;
  completed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DailyLog {
  [key: string]: unknown;
}

interface Stats {
  [key: string]: unknown;
}

interface Summary {
  total_logs: number;
  avg_score: number;
  current_streak: number;
  build_hours_total: number;
  pillars_completed: Record<string, number>;
}

interface WeeklyReport {
  week_start: string;
  week_end: string;
  avg_score: number;
  total_build_hours: number;
  pillars_completed: Record<string, number>;
  streak: number;
  insights: string;
}

interface ChatResponse {
  response: string;
  action?: Record<string, unknown>;
}

// API Functions
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTasks = useCallback(async (userId: string, pillarGoals: Record<string, string>, phase: number): Promise<Task[]> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchAPI<Task[]>('/tasks/generate', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, pillar_goals: pillarGoals, phase }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tasks');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getTodayTasks = useCallback(async (userId: string): Promise<Task[]> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchAPI<Task[]>(`/tasks/today/${userId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get tasks');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const logDay = useCallback(async (userId: string, log: DailyLog): Promise<{ score: number }> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchAPI<{ score: number }>('/analytics/log', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, ...log }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log day');
      return { score: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (userId: string, days: number = 7): Promise<DailyLog[]> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchAPI<DailyLog[]>(`/analytics/history/${userId}?days=${days}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get history');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getSummary = useCallback(async (userId: string): Promise<Summary> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchAPI<Summary>(`/analytics/summary/${userId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get summary');
      return {
        total_logs: 0,
        avg_score: 0,
        current_streak: 0,
        build_hours_total: 0,
        pillars_completed: { BUILD: 0, SHOW: 0, EARN: 0, SYSTEMIZE: 0 },
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getWeeklyReport = useCallback(async (userId: string): Promise<WeeklyReport> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchAPI<WeeklyReport>(`/analytics/weekly-report/${userId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get weekly report');
      return {
        week_start: '',
        week_end: '',
        avg_score: 0,
        total_build_hours: 0,
        pillars_completed: { BUILD: 0, SHOW: 0, EARN: 0, SYSTEMIZE: 0 },
        streak: 0,
        insights: 'Start logging your progress!',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const chatWithRyna = useCallback(async (
    userId: string,
    query: string,
    pillarGoals: Record<string, string>,
    currentLog: DailyLog,
    stats: Stats,
    coachingStyle: string
  ): Promise<ChatResponse> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchAPI<ChatResponse>('/ryna/chat', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          query,
          pillar_goals: pillarGoals,
          current_log: currentLog,
          stats,
          coaching_style: coachingStyle,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to chat with Ryna');
      return { response: "I'm having trouble connecting. Please try again." };
    } finally {
      setLoading(false);
    }
  }, []);

  const getDailyInsight = useCallback(async (
    userId: string,
    pillarGoals: Record<string, string>,
    currentLog: DailyLog,
    last7Days: DailyLog[]
  ): Promise<ChatResponse> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchAPI<ChatResponse>('/ryna/insight', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          pillar_goals: pillarGoals,
          current_log: currentLog,
          last_7_days: last7Days,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get insight');
      return { response: "Start your day with focus!" };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    generateTasks,
    getTodayTasks,
    logDay,
    getHistory,
    getSummary,
    getWeeklyReport,
    chatWithRyna,
    getDailyInsight,
  };
}