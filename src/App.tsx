import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  BarChart3,
  Settings as SettingsIcon,
  Flame,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Sparkles,
  CloudOff,
  Cloud,
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  isToday,
} from 'date-fns';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import {
  TaskCategory,
  Task,
  ScheduleItem,
  DailyData,
  GlobalData,
  ImpromptuTask,
} from './types';
import { useRyna, RynaCallbacks } from './hooks/useRyna';
import { useToast } from './hooks/useToast';
import { useSupabase } from './hooks/useSupabase';
import { RynaPA } from './components/RynaPA';
import { Toast } from './components/Toast';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: Record<TaskCategory, { color: string; label: string }> = {
  SPIRITUAL: { color: 'border-amber-500', label: 'Spiritual' },
  PHYSICAL:  { color: 'border-green-500', label: 'Physical' },
  LEARNING:  { color: 'border-blue-500', label: 'Learning' },
  CAREER:    { color: 'border-yellow-500', label: 'Career/Financial' },
  CONTENT:   { color: 'border-purple-500', label: 'Content' },
  PROJECT:   { color: 'border-teal-500', label: 'Project' },
};

const DEFAULT_TASKS: Task[] = [
  { id: 's1', label: 'Bible reading (1 chapter)',  category: 'SPIRITUAL', completed: false },
  { id: 's2', label: 'Morning prayer',              category: 'SPIRITUAL', completed: false },
  { id: 's3', label: 'Evening journal',             category: 'SPIRITUAL', completed: false },
  { id: 'p1', label: 'Exercise (30-40 mins)',       category: 'PHYSICAL',  completed: false },
  { id: 'p2', label: 'Drink 3L water',              category: 'PHYSICAL',  completed: false },
  { id: 'l1', label: 'Book reading (20 mins)',      category: 'LEARNING',  completed: false },
  { id: 'l2', label: 'Skill practice',              category: 'LEARNING',  completed: false },
  { id: 'c1', label: 'Deep Work (2 hours)',         category: 'CAREER',    completed: false },
  { id: 'c2', label: 'Financial tracking',          category: 'CAREER',    completed: false },
  { id: 'co1', label: 'Post content',              category: 'CONTENT',   completed: false },
  { id: 'pr1', label: 'Project progress',           category: 'PROJECT',   completed: false },
];

const WEEKDAY_SCHEDULE: ScheduleItem[] = [
  { time: '05:00', activity: 'Wake up & Water',       category: 'PHYSICAL'  },
  { time: '05:05', activity: 'Bible Reading & Prayer', category: 'SPIRITUAL' },
  { time: '05:30', activity: 'Book Reading',           category: 'LEARNING'  },
  { time: '05:50', activity: 'Exercise',               category: 'PHYSICAL'  },
  { time: '06:30', activity: 'Shower & Breakfast',     category: 'PHYSICAL'  },
  { time: '07:30', activity: 'Deep Work Session 1',    category: 'CAREER'    },
  { time: '09:30', activity: 'Break & Admin',          category: 'REST'      },
  { time: '10:00', activity: 'Deep Work Session 2',    category: 'CAREER'    },
  { time: '12:00', activity: 'Lunch & Learning',       category: 'LEARNING'  },
  { time: '13:00', activity: 'Project Work',           category: 'PROJECT'   },
  { time: '15:00', activity: 'Content Creation',       category: 'CONTENT'   },
  { time: '17:00', activity: 'Review & Planning',      category: 'CAREER'    },
  { time: '18:00', activity: 'Dinner & Family',        category: 'REST'      },
  { time: '20:00', activity: 'Reflection & Journal',   category: 'SPIRITUAL' },
  { time: '21:00', activity: 'Wind down',              category: 'REST'      },
  { time: '22:00', activity: 'Sleep',                  category: 'REST'      },
];

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<DailyData>({
    tasks: DEFAULT_TASKS,
    reflection: { accomplished: '', blocked: '', grateful: '' },
  });

  const [globalData, setGlobalData] = useState<GlobalData>(() => {
    const defaultData: GlobalData = {
      goals: {
        monthly: '$400/mo',
        levels: ['$400/mo', '$3K', '$5K', '$10K', '$50K', '$100K'],
        currentLevelIndex: 0,
      },
      history: {},
      notificationSettings: {
        dailyStampReminder: true,
        dailyStampTime: '21:00',
        taskReminders: true,
      },
    };
    const saved = localStorage.getItem('goalflow_global');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaultData,
          ...parsed,
          history: parsed.history ?? {},
          notificationSettings: {
            ...defaultData.notificationSettings,
            ...(parsed.notificationSettings ?? {}),
          },
        };
      } catch {
        return defaultData;
      }
    }
    return defaultData;
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('goalflow_theme');
    if (saved !== null) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [activeTab, setActiveTab] = useState<'tasks' | 'schedule' | 'analytics' | 'settings'>('tasks');
  const [timer, setTimer] = useState({ active: false, seconds: 1500, mode: 'work' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const lastNotifiedTask = useRef<string | null>(null);
  const lastNotifiedStamp = useRef<string | null>(null);

  const dateKey = format(currentDate, 'yyyy-MM-dd');

  // ── In-app toast + Supabase sync ──────────────────────────────────────────

  const { toasts, removeToast, notify } = useToast();
  const { isSynced, syncError, isEnabled: supabaseEnabled } = useSupabase(globalData, setGlobalData);

  // ── Derived state ─────────────────────────────────────────────────────────

  const taskCompletionRate = useMemo(() => {
    const done = dailyData.tasks.filter(t => t.completed).length;
    return (done / Math.max(dailyData.tasks.length, 1)) * 100;
  }, [dailyData.tasks]);

  const currentSchedule = dailyData.customSchedule ?? WEEKDAY_SCHEDULE;

  const activeTask = useMemo(() => {
    const now = format(currentTime, 'HH:mm');
    for (let i = 0; i < currentSchedule.length; i++) {
      const item = currentSchedule[i];
      const next = currentSchedule[i + 1];
      if (now >= item.time && (!next || now < next.time)) return item;
    }
    return null;
  }, [currentTime, currentSchedule]);

  const streak = useMemo(() => {
    let count = 0;
    let check = subDays(new Date(), 1);
    while (true) {
      const key = format(check, 'yyyy-MM-dd');
      const data = globalData.history?.[key];
      if (!data) break;
      const rate = (data.tasks.filter(t => t.completed).length / Math.max(data.tasks.length, 1)) * 100;
      if (rate >= 80) { count++; check = subDays(check, 1); }
      else break;
    }
    if (taskCompletionRate >= 80) count++;
    return count;
  }, [globalData.history, taskCompletionRate]);

  const historyLast7Days = useMemo(() => {
    const result: Record<string, DailyData> = {};
    for (let i = 1; i <= 7; i++) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      if (globalData.history?.[key]) result[key] = globalData.history[key];
    }
    return result;
  }, [globalData.history]);

  // ── Ryna callbacks ────────────────────────────────────────────────────────

  const toggleTask = useCallback((id: string) => {
    setDailyData(prev => {
      const newTasks = prev.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
      const newData = { ...prev, tasks: newTasks };
      setGlobalData(g => ({
        ...g,
        history: { ...(g.history ?? {}), [dateKey]: newData },
      }));
      return newData;
    });
  }, [dateKey]);

  const updateReflection = useCallback((field: keyof DailyData['reflection'], value: string) => {
    setDailyData(prev => {
      const newData = { ...prev, reflection: { ...prev.reflection, [field]: value } };
      setGlobalData(g => ({
        ...g,
        history: { ...(g.history ?? {}), [dateKey]: newData },
      }));
      return newData;
    });
  }, [dateKey]);

  const rynaCallbacks = useMemo<RynaCallbacks>(() => ({
    onMarkTask: (keyword, completed) => {
      const lower = keyword.toLowerCase();
      // Find best matching task
      const task = dailyData.tasks.find(t =>
        t.label.toLowerCase().includes(lower)
      ) ?? dailyData.tasks.find(t =>
        lower.split(' ').some(word => t.label.toLowerCase().includes(word))
      );

      if (!task) return `No task found matching "${keyword}". Check the tasks tab.`;

      setDailyData(prev => {
        const newTasks = prev.tasks.map(t =>
          t.id === task.id ? { ...t, completed } : t
        );
        const newData = { ...prev, tasks: newTasks };
        setGlobalData(g => ({
          ...g,
          history: { ...(g.history ?? {}), [dateKey]: newData },
        }));
        return newData;
      });
      return `${completed ? '✓ Marked done' : '↩ Unmarked'}: "${task.label}"`;
    },

    onTimerAction: (action) => {
      if (action === 'start')  setTimer(prev => ({ ...prev, active: true }));
      if (action === 'stop')   setTimer(prev => ({ ...prev, active: false }));
      if (action === 'reset')  setTimer({ active: false, seconds: 1500, mode: 'work' });
    },

    onNavigate: (tab) => setActiveTab(tab),

    onAddNote: (field, content) => updateReflection(field, content),

    onAddTasks: (newTasks: ImpromptuTask[]) => {
      // Generate unique IDs for each task
      const tasksToAdd: Task[] = newTasks.map((t, i) => ({
        id: `ryna_${Date.now()}_${i}`,
        label: t.label,
        category: t.category,
        completed: false,
      }));

      // Build schedule entries for tasks that have a time
      const scheduleEntries: ScheduleItem[] = newTasks
        .filter(t => t.scheduleTime)
        .map(t => ({
          time: t.scheduleTime!,
          activity: t.label,
          category: t.category,
          notes: t.notes ?? 'Added by Ryna',
        }));

      setDailyData(prev => {
        const updatedTasks = [...prev.tasks, ...tasksToAdd];

        // Merge new schedule entries into existing schedule, sorted by time
        const baseSchedule = prev.customSchedule ?? WEEKDAY_SCHEDULE;
        const mergedSchedule = scheduleEntries.length
          ? [...baseSchedule, ...scheduleEntries].sort((a, b) =>
              a.time.localeCompare(b.time)
            )
          : prev.customSchedule; // keep undefined if no schedule changes

        const newData: DailyData = {
          ...prev,
          tasks: updatedTasks,
          ...(mergedSchedule ? { customSchedule: mergedSchedule } : {}),
        };

        setGlobalData(g => ({
          ...g,
          history: { ...(g.history ?? {}), [dateKey]: newData },
        }));
        return newData;
      });

      const withTimes = newTasks.filter(t => t.scheduleTime);
      const summary = tasksToAdd.map(t => `"${t.label}"`).join(', ');
      const timeSuffix = withTimes.length
        ? ` Scheduled ${withTimes.map(t => `${t.label} at ${t.scheduleTime}`).join(', ')}.`
        : '';
      return `Added ${tasksToAdd.length} task${tasksToAdd.length > 1 ? 's' : ''} to your day: ${summary}.${timeSuffix} I'll remind you when the time comes.`;
    },

    onGetStatus: () => {
      const done = dailyData.tasks.filter(t => t.completed).length;
      const total = dailyData.tasks.length;
      return `You've completed ${done} of ${total} tasks today (${taskCompletionRate.toFixed(0)}%). Streak: ${streak} days. Level: ${globalData.goals.levels[globalData.goals.currentLevelIndex]}.`;
    },

    notify,
  }), [dailyData.tasks, dailyData.customSchedule, dateKey, taskCompletionRate, streak, globalData.goals, notify, updateReflection, setDailyData, setGlobalData]);

  // ── Ryna hook ─────────────────────────────────────────────────────────────

  const {
    rynaMode,
    rynaTranscript,
    rynaResponse,
    setRynaResponse,
    startListening,
    stopListening,
    askRyna,
    handleReshuffle,
  } = useRyna(
    currentSchedule,
    globalData.goals,
    taskCompletionRate,
    dateKey,
    dailyData.tasks,
    historyLast7Days,
    setDailyData,
    setGlobalData,
    rynaCallbacks
  );

  // ── Effects ───────────────────────────────────────────────────────────────

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Theme persistence
  useEffect(() => {
    localStorage.setItem('goalflow_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Load daily data when date changes
  useEffect(() => {
    const saved = globalData.history?.[dateKey];
    if (saved) {
      setDailyData(saved);
    } else {
      setDailyData({
        tasks: DEFAULT_TASKS.map(t => ({ ...t, completed: false })),
        reflection: { accomplished: '', blocked: '', grateful: '' },
      });
    }
  }, [dateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist globalData to localStorage
  useEffect(() => {
    localStorage.setItem('goalflow_global', JSON.stringify(globalData));
  }, [globalData]);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Pomodoro timer
  useEffect(() => {
    if (!timer.active || timer.seconds <= 0) {
      if (timer.seconds === 0) {
        setTimer(prev => ({ ...prev, active: false }));
        const title = `Pomodoro ${timer.mode === 'work' ? 'Done' : 'Break Over'}!`;
        const body = timer.mode === 'work' ? 'Time for a break.' : 'Back to work!';
        notify(title, body, 'success');
      }
      return;
    }
    const id = setInterval(() => {
      setTimer(prev => ({ ...prev, seconds: prev.seconds - 1 }));
    }, 1000);
    return () => clearInterval(id);
  }, [timer.active, timer.seconds, timer.mode, notify]);

  // Notifications (task + daily stamp)
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();

    const nowStr = format(currentTime, 'HH:mm');

    if (
      globalData.notificationSettings.dailyStampReminder &&
      nowStr === globalData.notificationSettings.dailyStampTime &&
      lastNotifiedStamp.current !== dateKey
    ) {
      lastNotifiedStamp.current = dateKey;
      notify("Time to Stamp!", "Don't forget to log your daily progress and reflection.", 'info');
    }

    if (globalData.notificationSettings.taskReminders && activeTask) {
      if (activeTask.time === nowStr && lastNotifiedTask.current !== activeTask.activity) {
        lastNotifiedTask.current = activeTask.activity;
        notify('Next Task Starting', `Time for: ${activeTask.activity}`, 'info');
      }
    }
  }, [currentTime, globalData.notificationSettings, dateKey, activeTask, notify]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Task', 'Category', 'Completed'];
    const rows = Object.entries(globalData.history ?? {}).flatMap(([date, data]) =>
      (data as DailyData).tasks.map(t => [date, t.label, t.category, String(t.completed)])
    );
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goalflow_${format(new Date(), 'yyyyMMdd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      'min-h-screen transition-colors duration-500 font-sans',
      isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    )}>
      {/* In-app Toast notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ── */}
        <header className="mb-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">GoalFlow</h1>
                <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-bold text-amber-500 tracking-widest uppercase">Beta v2.0</div>
              </div>
              <p className={cn("font-mono text-sm uppercase tracking-widest", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                {format(currentDate, 'EEEE, MMMM do, yyyy')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Sync indicator */}
              {supabaseEnabled && (
                <div className={cn("flex items-center gap-1.5 text-[10px] font-mono", isSynced ? "text-green-500" : syncError ? "text-orange-500" : "text-zinc-500")}>
                  {isSynced ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
                  {isSynced ? 'Synced' : syncError ? 'Sync error' : 'Syncing...'}
                </div>
              )}

              {/* Streak */}
              <div className="flex items-center gap-1.5 text-amber-500">
                <Flame className="w-4 h-4 fill-amber-500" />
                <span className="font-bold font-mono text-sm">{streak} DAY STREAK</span>
              </div>

              {/* Theme toggle */}
              <button
                onClick={() => setIsDarkMode(v => !v)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDarkMode ? "bg-zinc-900 text-zinc-400 hover:text-zinc-200" : "bg-zinc-200 text-zinc-600 hover:text-zinc-900"
                )}
              >
                {isDarkMode
                  ? <span className="text-xs font-bold font-mono">DARK</span>
                  : <span className="text-xs font-bold font-mono">LIGHT</span>
                }
              </button>
            </div>
          </div>

          {/* Goals progress bar */}
          <div className="relative pt-8 pb-4">
            <div className="flex justify-between mb-4">
              {globalData.goals.levels.map((level, idx) => (
                <div key={level} className="flex flex-col items-center gap-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full transition-all duration-500',
                    idx <= globalData.goals.currentLevelIndex
                      ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300'
                  )} />
                  <span className={cn(
                    'text-[10px] font-bold font-mono tracking-tighter transition-colors',
                    idx === globalData.goals.currentLevelIndex
                      ? 'text-amber-500'
                      : isDarkMode ? 'text-zinc-500' : 'text-zinc-400'
                  )}>{level}</span>
                </div>
              ))}
            </div>
            <div className={cn("h-1 rounded-full overflow-hidden", isDarkMode ? "bg-zinc-900" : "bg-zinc-200")}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(globalData.goals.currentLevelIndex / (globalData.goals.levels.length - 1)) * 100}%` }}
                className="h-full bg-amber-500"
              />
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar nav */}
          <nav className="lg:col-span-3 space-y-2">
            {([
              { id: 'tasks',     label: 'Daily Tasks',   icon: CheckCircle2 },
              { id: 'schedule',  label: 'Live Schedule', icon: Calendar },
              { id: 'analytics', label: 'Analytics',     icon: BarChart3 },
              { id: 'settings',  label: 'Settings',      icon: SettingsIcon },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group',
                  activeTab === tab.id
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/20'
                    : isDarkMode
                      ? 'hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200'
                      : 'hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800'
                )}
              >
                <tab.icon className={cn('w-5 h-5', activeTab === tab.id ? 'text-zinc-950' : 'text-zinc-500 group-hover:text-amber-500')} />
                <span className="text-sm uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}

            {/* Pomodoro timer */}
            <div className={cn(
              "mt-8 p-6 rounded-2xl border space-y-4",
              isDarkMode ? "bg-zinc-900/30 border-zinc-800/50" : "bg-zinc-100 border-zinc-200"
            )}>
              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                  Pomodoro
                </span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] font-mono text-amber-500">{timer.mode}</span>
                </div>
              </div>
              <div className="text-center">
                <div className={cn("text-4xl font-mono font-bold tracking-tighter mb-4", timer.active ? "text-amber-500" : isDarkMode ? "text-zinc-200" : "text-zinc-800")}>
                  {Math.floor(timer.seconds / 60).toString().padStart(2, '0')}:
                  {(timer.seconds % 60).toString().padStart(2, '0')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimer(prev => ({ ...prev, active: !prev.active }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors",
                      isDarkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-200 hover:bg-zinc-300"
                    )}
                  >
                    {timer.active ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={() => setTimer({ active: false, seconds: 1500, mode: 'work' })}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDarkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-200 hover:bg-zinc-300"
                    )}
                  >
                    <Trash2 className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Tab content */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">

              {/* ── Tasks ── */}
              {activeTab === 'tasks' && (
                <motion.div
                  key="tasks"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Today's Focus</h2>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-zinc-900" : "hover:bg-zinc-200")}>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold font-mono">
                        {isToday(currentDate) ? 'TODAY' : format(currentDate, 'MMM d')}
                      </span>
                      <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className={cn("p-2 rounded-lg transition-colors", isDarkMode ? "hover:bg-zinc-900" : "hover:bg-zinc-200")}>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Completion bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className={isDarkMode ? "text-zinc-500" : "text-zinc-400"}>Daily completion</span>
                      <span className="text-amber-500 font-bold">{taskCompletionRate.toFixed(0)}%</span>
                    </div>
                    <div className={cn("h-1.5 rounded-full overflow-hidden", isDarkMode ? "bg-zinc-900" : "bg-zinc-200")}>
                      <motion.div
                        animate={{ width: `${taskCompletionRate}%` }}
                        className="h-full bg-amber-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 100 }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(CATEGORIES).map(([cat, info]) => {
                      const catTasks = dailyData.tasks.filter(t => t.category === cat);
                      const catDone = catTasks.filter(t => t.completed).length;
                      return (
                        <div
                          key={cat}
                          className={cn(
                            "rounded-2xl border-l-4 p-6 border transition-all",
                            info.color,
                            isDarkMode ? "bg-zinc-900/30 border-zinc-800/50" : "bg-white border-zinc-200"
                          )}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className={cn("text-[10px] font-bold uppercase tracking-[0.2em]", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                              {info.label}
                            </h3>
                            <span className="text-[10px] font-mono text-amber-500">{catDone}/{catTasks.length}</span>
                          </div>
                          <div className="space-y-3">
                            {catTasks.map(task => (
                              <button
                                key={task.id}
                                onClick={() => toggleTask(task.id)}
                                className="w-full flex items-center justify-between group"
                              >
                                <span className={cn(
                                  'text-sm transition-all',
                                  task.completed
                                    ? isDarkMode ? 'text-zinc-600 line-through' : 'text-zinc-400 line-through'
                                    : isDarkMode ? 'text-zinc-200' : 'text-zinc-800'
                                )}>
                                  {task.label}
                                </span>
                                {task.completed
                                  ? <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                                  : <Circle className={cn("w-5 h-5 shrink-0 transition-colors", isDarkMode ? "text-zinc-800 group-hover:text-zinc-600" : "text-zinc-300 group-hover:text-zinc-500")} />
                                }
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Schedule ── */}
              {activeTab === 'schedule' && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Live Schedule</h2>
                    <button
                      onClick={() => handleReshuffle('Manual request')}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-400 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Reshuffle Day
                    </button>
                  </div>

                  {dailyData.customSchedule && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-500 font-mono">AI-reshuffled schedule active</span>
                      <button
                        onClick={() => setDailyData(prev => {
                          const { customSchedule: _cs, ...rest } = prev;
                          setGlobalData(g => ({ ...g, history: { ...g.history, [dateKey]: rest } }));
                          return rest;
                        })}
                        className="ml-auto text-[10px] text-amber-500/60 hover:text-amber-500 underline"
                      >
                        Reset to default
                      </button>
                    </div>
                  )}

                  <div className="relative space-y-4">
                    <div className={cn("absolute left-4 top-0 bottom-0 w-px", isDarkMode ? "bg-zinc-800" : "bg-zinc-200")} />
                    {currentSchedule.map((item, idx) => {
                      const isActive = activeTask === item;
                      return (
                        <div key={idx} className={cn(
                          'relative pl-12 transition-all duration-500',
                          isActive ? 'scale-[1.02]' : 'opacity-50'
                        )}>
                          <div className={cn(
                            'absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 transition-all',
                            isActive
                              ? 'bg-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                              : isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-300'
                          )} />
                          <div className={cn(
                            'p-4 rounded-xl border transition-all',
                            isActive
                              ? 'bg-amber-500/10 border-amber-500/50'
                              : isDarkMode ? 'bg-zinc-900/30 border-zinc-800/50' : 'bg-white border-zinc-200'
                          )}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono font-bold text-amber-500">{item.time}</span>
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>{item.category}</span>
                            </div>
                            <h4 className={cn("font-bold", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>{item.activity}</h4>
                            {item.notes && <p className="text-xs text-zinc-500 mt-1 italic">{item.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Analytics ── */}
              {activeTab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-2xl font-bold tracking-tight">Performance Analytics</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: "Today's Completion", value: `${taskCompletionRate.toFixed(0)}%` },
                      { label: 'Current Streak',     value: `${streak} Days` },
                      { label: 'Level Progress',     value: `${globalData.goals.currentLevelIndex + 1}/${globalData.goals.levels.length}` },
                    ].map(stat => (
                      <div key={stat.label} className={cn(
                        "p-6 rounded-2xl border space-y-2",
                        isDarkMode ? "bg-zinc-900/30 border-zinc-800/50" : "bg-white border-zinc-200"
                      )}>
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>{stat.label}</span>
                        <div className="text-4xl font-mono font-bold text-amber-500">{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 7-day history bars */}
                  <div className={cn("p-6 rounded-2xl border", isDarkMode ? "bg-zinc-900/30 border-zinc-800/50" : "bg-white border-zinc-200")}>
                    <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-6", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Last 7 Days</h3>
                    <div className="flex items-end gap-3 h-24">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = subDays(new Date(), 6 - i);
                        const key = format(d, 'yyyy-MM-dd');
                        const data = globalData.history?.[key];
                        const rate = data
                          ? Math.round((data.tasks.filter(t => t.completed).length / Math.max(data.tasks.length, 1)) * 100)
                          : 0;
                        const isCurrentDay = key === dateKey;
                        return (
                          <div key={key} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-mono text-amber-500">{rate > 0 ? `${rate}%` : ''}</span>
                            <div className="w-full relative" style={{ height: '64px' }}>
                              <div className={cn("absolute bottom-0 w-full rounded-t transition-all", isDarkMode ? "bg-zinc-800" : "bg-zinc-100")} style={{ height: '100%' }} />
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${rate}%` }}
                                className={cn("absolute bottom-0 w-full rounded-t", isCurrentDay ? "bg-amber-500" : "bg-amber-500/40")}
                              />
                            </div>
                            <span className={cn("text-[9px] font-mono", isDarkMode ? "text-zinc-600" : "text-zinc-400")}>
                              {format(d, 'EEE')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-400 transition-all"
                  >
                    Export CSV
                  </button>
                </motion.div>
              )}

              {/* ── Settings ── */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                  <div className="space-y-6">

                    {/* Notifications */}
                    <div className={cn("p-6 rounded-2xl border space-y-6", isDarkMode ? "bg-zinc-900/30 border-zinc-800/50" : "bg-white border-zinc-200")}>
                      <h3 className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Notifications</h3>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">Daily Stamp Reminder</div>
                          <div className={cn("text-[10px]", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Remind me to log progress at night</div>
                        </div>
                        <button
                          onClick={() => setGlobalData(prev => ({
                            ...prev,
                            notificationSettings: {
                              ...prev.notificationSettings,
                              dailyStampReminder: !prev.notificationSettings.dailyStampReminder
                            }
                          }))}
                          className={cn(
                            'w-10 h-5 rounded-full transition-all relative',
                            globalData.notificationSettings.dailyStampReminder ? 'bg-amber-500' : isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300'
                          )}
                        >
                          <div className={cn(
                            'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                            globalData.notificationSettings.dailyStampReminder ? 'left-6' : 'left-1'
                          )} />
                        </button>
                      </div>

                      {globalData.notificationSettings.dailyStampReminder && (
                        <input
                          type="time"
                          value={globalData.notificationSettings.dailyStampTime}
                          onChange={e => setGlobalData(prev => ({
                            ...prev,
                            notificationSettings: { ...prev.notificationSettings, dailyStampTime: e.target.value }
                          }))}
                          className={cn(
                            "rounded text-xs font-mono py-1 px-2 focus:ring-1 focus:ring-amber-500 border-none",
                            isDarkMode ? "bg-zinc-800" : "bg-zinc-100"
                          )}
                        />
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">Task Reminders</div>
                          <div className={cn("text-[10px]", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Notify when schedule item starts</div>
                        </div>
                        <button
                          onClick={() => setGlobalData(prev => ({
                            ...prev,
                            notificationSettings: {
                              ...prev.notificationSettings,
                              taskReminders: !prev.notificationSettings.taskReminders
                            }
                          }))}
                          className={cn(
                            'w-10 h-5 rounded-full transition-all relative',
                            globalData.notificationSettings.taskReminders ? 'bg-amber-500' : isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300'
                          )}
                        >
                          <div className={cn(
                            'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                            globalData.notificationSettings.taskReminders ? 'left-6' : 'left-1'
                          )} />
                        </button>
                      </div>
                    </div>

                    {/* Goals level control */}
                    <div className={cn("p-6 rounded-2xl border space-y-4", isDarkMode ? "bg-zinc-900/30 border-zinc-800/50" : "bg-white border-zinc-200")}>
                      <h3 className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Income Level</h3>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setGlobalData(prev => ({
                            ...prev,
                            goals: { ...prev.goals, currentLevelIndex: Math.max(0, prev.goals.currentLevelIndex - 1) }
                          }))}
                          disabled={globalData.goals.currentLevelIndex === 0}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-amber-500 font-mono text-lg flex-1 text-center">
                          {globalData.goals.levels[globalData.goals.currentLevelIndex]}
                        </span>
                        <button
                          onClick={() => setGlobalData(prev => ({
                            ...prev,
                            goals: { ...prev.goals, currentLevelIndex: Math.min(prev.goals.levels.length - 1, prev.goals.currentLevelIndex + 1) }
                          }))}
                          disabled={globalData.goals.currentLevelIndex === globalData.goals.levels.length - 1}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* App settings */}
                    <div className={cn("p-6 rounded-2xl border space-y-4", isDarkMode ? "bg-zinc-900/30 border-zinc-800/50" : "bg-white border-zinc-200")}>
                      <h3 className={cn("text-xs font-bold uppercase tracking-widest", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>App</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">Install GoalFlow</div>
                          <div className={cn("text-[10px]", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>Add to home screen for offline access</div>
                        </div>
                        <button
                          onClick={handleInstall}
                          disabled={!deferredPrompt}
                          className={cn(
                            'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
                            deferredPrompt
                              ? 'bg-amber-500 text-zinc-950'
                              : isDarkMode ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                          )}
                        >
                          {deferredPrompt ? 'Install Now' : 'Installed / Not Available'}
                        </button>
                      </div>

                      {supabaseEnabled && (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold">Cloud Sync</div>
                            <div className={cn("text-[10px]", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                              {syncError ? `Error: ${syncError}` : isSynced ? 'Data synced to Supabase' : 'Syncing...'}
                            </div>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full", isSynced ? "bg-green-500" : syncError ? "bg-orange-500" : "bg-zinc-500 animate-pulse")} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

        {/* ── Reflection footer ── */}
        <footer className="mt-24 border-t border-zinc-900 pt-12 pb-32">
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Flame className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Daily Reflection</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {([
                { field: 'accomplished' as const, label: 'What did I accomplish?', placeholder: 'List your wins...' },
                { field: 'blocked' as const,      label: 'What blocked me?',        placeholder: 'Identify friction...' },
                { field: 'grateful' as const,     label: 'Grateful for?',            placeholder: 'Gratitude is fuel...' },
              ]).map(({ field, label, placeholder }) => (
                <div key={field} className="space-y-3">
                  <label className={cn("text-[10px] font-bold uppercase tracking-widest", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                    {label}
                  </label>
                  <textarea
                    value={dailyData.reflection[field]}
                    onChange={e => updateReflection(field, e.target.value)}
                    className={cn(
                      "w-full h-32 rounded-xl p-4 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none border",
                      isDarkMode ? "bg-zinc-900/30 border-zinc-800 text-zinc-200 placeholder-zinc-700" : "bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400"
                    )}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </section>
        </footer>
      </div>

      {/* Ryna AI PA */}
      <RynaPA
        rynaMode={rynaMode}
        rynaTranscript={rynaTranscript}
        rynaResponse={rynaResponse}
        setRynaResponse={setRynaResponse}
        startListening={startListening}
        stopListening={stopListening}
        askRyna={askRyna}
      />
    </div>
  );
}
