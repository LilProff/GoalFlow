import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  BarChart3, 
  Settings as SettingsIcon, 
  Flame, 
  Download, 
  Sun, 
  Moon, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  Plus,
  Trash2,
  AlertCircle,
  Mic,
  MicOff,
  X,
  MessageSquare,
  Volume2,
  Sparkles,
  Zap
} from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays, 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isToday,
  parse,
  isAfter,
  isBefore,
  addMinutes
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

import { 
  TaskCategory, 
  Task, 
  ScheduleItem, 
  DailyData, 
  GlobalData, 
  RynaMode 
} from './types';
import { cn } from './lib/utils';
import { useRyna } from './hooks/useRyna';
import { RynaPA } from './components/RynaPA';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- Constants ---
const CATEGORIES: Record<TaskCategory, { color: string; label: string }> = {
  SPIRITUAL: { color: 'border-amber-500', label: 'Spiritual' },
  PHYSICAL: { color: 'border-green-500', label: 'Physical' },
  LEARNING: { color: 'border-blue-500', label: 'Learning' },
  CAREER: { color: 'border-gold-500', label: 'Career/Financial' },
  CONTENT: { color: 'border-purple-500', label: 'Content' },
  PROJECT: { color: 'border-teal-500', label: 'Project' }
};

const DEFAULT_TASKS: Task[] = [
  { id: 's1', label: 'Bible reading (1 chapter)', category: 'SPIRITUAL', completed: false },
  { id: 's2', label: 'Morning prayer', category: 'SPIRITUAL', completed: false },
  { id: 's3', label: 'Evening journal', category: 'SPIRITUAL', completed: false },
  { id: 'p1', label: 'Exercise (30-40 mins)', category: 'PHYSICAL', completed: false },
  { id: 'p2', label: 'Drink 3L water', category: 'PHYSICAL', completed: false },
  { id: 'l1', label: 'Book reading (20 mins)', category: 'LEARNING', completed: false },
  { id: 'l2', label: 'Skill practice', category: 'LEARNING', completed: false },
  { id: 'c1', label: 'Deep Work (2 hours)', category: 'CAREER', completed: false },
  { id: 'c2', label: 'Financial tracking', category: 'CAREER', completed: false },
  { id: 'co1', label: 'Post content', category: 'CONTENT', completed: false },
  { id: 'pr1', label: 'Project progress', category: 'PROJECT', completed: false }
];

const WEEKDAY_SCHEDULE: ScheduleItem[] = [
  { time: '05:00', activity: 'Wake up & Water', category: 'PHYSICAL' },
  { time: '05:05', activity: 'Bible Reading & Prayer', category: 'SPIRITUAL' },
  { time: '05:30', activity: 'Book Reading', category: 'LEARNING' },
  { time: '05:50', activity: 'Exercise', category: 'PHYSICAL' },
  { time: '06:30', activity: 'Shower & Breakfast', category: 'PHYSICAL' },
  { time: '07:30', activity: 'Deep Work Session 1', category: 'CAREER' },
  { time: '09:30', activity: 'Break & Admin', category: 'REST' },
  { time: '10:00', activity: 'Deep Work Session 2', category: 'CAREER' },
  { time: '12:00', activity: 'Lunch & Learning', category: 'LEARNING' },
  { time: '13:00', activity: 'Project Work', category: 'PROJECT' },
  { time: '15:00', activity: 'Content Creation', category: 'CONTENT' },
  { time: '17:00', activity: 'Review & Planning', category: 'CAREER' },
  { time: '18:00', activity: 'Dinner & Family', category: 'REST' },
  { time: '20:00', activity: 'Reflection & Journal', category: 'SPIRITUAL' },
  { time: '21:00', activity: 'Wind down', category: 'REST' },
  { time: '22:00', activity: 'Sleep', category: 'REST' }
];

export default function App() {
  return (
    <ErrorBoundary>
      <GoalFlowApp />
    </ErrorBoundary>
  );
}

function GoalFlowApp() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<DailyData>({
    tasks: DEFAULT_TASKS,
    reflection: { accomplished: '', blocked: '', grateful: '' }
  });
  const [globalData, setGlobalData] = useState<GlobalData>(() => {
    const saved = localStorage.getItem('goalflow_global');
    const defaultData: GlobalData = {
      goals: {
        monthly: '$400/mo',
        levels: ['$400/mo', '$3K', '$5K', '$10K', '$50K', '$100K'],
        currentLevelIndex: 0
      },
      history: {},
      notificationSettings: {
        dailyStampReminder: true,
        dailyStampTime: '21:00',
        taskReminders: true
      }
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed || typeof parsed !== 'object') return defaultData;
        return {
          ...defaultData,
          ...parsed,
          history: parsed.history || {},
          notificationSettings: { ...defaultData.notificationSettings, ...parsed.notificationSettings }
        };
      } catch (e) {
        console.error("Failed to parse global data", e);
        return defaultData;
      }
    }
    return defaultData;
  });

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'schedule' | 'analytics' | 'settings'>('tasks');
  const [timer, setTimer] = useState({ active: false, seconds: 1500, mode: 'work' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [lastNotifiedTask, setLastNotifiedTask] = useState<string | null>(null);
  const [lastNotifiedStamp, setLastNotifiedStamp] = useState<string | null>(null);

  const dateKey = format(currentDate, 'yyyy-MM-dd');

  const taskCompletionRate = useMemo(() => {
    const completed = dailyData.tasks.filter(t => t.completed).length;
    return (completed / dailyData.tasks.length) * 100;
  }, [dailyData.tasks]);

  const currentSchedule = dailyData.customSchedule || WEEKDAY_SCHEDULE;

  // Ryna AI PA Hook
  const {
    rynaMode,
    rynaTranscript,
    rynaResponse,
    isCoachLoading,
    setRynaResponse,
    startListening,
    stopListening,
    handleReshuffle
  } = useRyna(
    currentSchedule,
    globalData.goals,
    taskCompletionRate,
    dateKey,
    setDailyData,
    setGlobalData
  );

  // PWA Install Prompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleResetAllData = () => {
    if (window.confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Load daily data when date changes
  useEffect(() => {
    const saved = (globalData?.history || {})[dateKey];
    if (saved) {
      setDailyData(saved);
    } else {
      setDailyData({
        tasks: DEFAULT_TASKS.map(t => ({ ...t })),
        reflection: { accomplished: '', blocked: '', grateful: '' }
      });
    }
  }, [dateKey, globalData.history]);

  // Save global data
  useEffect(() => {
    localStorage.setItem('goalflow_global', JSON.stringify(globalData));
  }, [globalData]);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (timer.active && timer.seconds > 0) {
      interval = setInterval(() => {
        setTimer(prev => ({ ...prev, seconds: prev.seconds - 1 }));
      }, 1000);
    } else if (timer.seconds === 0) {
      setTimer(prev => ({ ...prev, active: false }));
      if (Notification.permission === 'granted') {
        new Notification(`Pomodoro ${timer.mode === 'work' ? 'Finished' : 'Break Over'}!`, {
          body: timer.mode === 'work' ? 'Time for a break.' : 'Back to work!',
          icon: 'https://picsum.photos/seed/goalflow/192/192'
        });
      }
    }
    return () => clearInterval(interval);
  }, [timer.active, timer.seconds, timer.mode]);

  // Notification logic
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const nowStr = format(currentTime, 'HH:mm');

    // Daily Stamp Reminder
    if (globalData.notificationSettings.dailyStampReminder && 
        nowStr === globalData.notificationSettings.dailyStampTime && 
        lastNotifiedStamp !== dateKey) {
      new Notification("Time to Stamp!", {
        body: "Don't forget to log your daily progress and reflection.",
        icon: 'https://picsum.photos/seed/goalflow/192/192'
      });
      setLastNotifiedStamp(dateKey);
    }

    // Task Reminders
    if (globalData.notificationSettings.taskReminders && activeTask) {
      if (activeTask.time === nowStr && lastNotifiedTask !== activeTask.activity) {
        new Notification("Next Task Starting", {
          body: `Time for: ${activeTask.activity}`,
          icon: 'https://picsum.photos/seed/goalflow/192/192'
        });
        setLastNotifiedTask(activeTask.activity);
      }
    }
  }, [currentTime, globalData.notificationSettings, lastNotifiedTask, lastNotifiedStamp, dateKey]);

  const toggleTask = (id: string) => {
    const newTasks = dailyData.tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    const newData = { ...dailyData, tasks: newTasks };
    setDailyData(newData);
    setGlobalData(prev => ({
      ...prev,
      history: { ...(prev?.history || {}), [dateKey]: newData }
    }));
  };

  const updateReflection = (field: keyof DailyData['reflection'], value: string) => {
    const newData = {
      ...dailyData,
      reflection: { ...dailyData.reflection, [field]: value }
    };
    setDailyData(newData);
    setGlobalData(prev => ({
      ...prev,
      history: { ...(prev?.history || {}), [dateKey]: newData }
    }));
  };

  const streak = useMemo(() => {
    let count = 0;
    let checkDate = subDays(new Date(), 1);
    while (true) {
      const key = format(checkDate, 'yyyy-MM-dd');
      const data = (globalData?.history || {})[key];
      if (!data || !data.tasks) break;
      const rate = (data.tasks.filter(t => t.completed).length / data.tasks.length) * 100;
      if (rate >= 80) {
        count++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    // Add today if completion is >= 80%
    if (taskCompletionRate >= 80) count++;
    return count;
  }, [globalData.history, taskCompletionRate]);

  const activeTask = useMemo(() => {
    const now = format(currentTime, 'HH:mm');
    for (let i = 0; i < currentSchedule.length; i++) {
      const item = currentSchedule[i];
      const nextItem = currentSchedule[i + 1];
      if (now >= item.time && (!nextItem || now < nextItem.time)) {
        return item;
      }
    }
    return null;
  }, [currentTime, currentSchedule]);

  const exportCSV = () => {
    const headers = ['Date', 'Task', 'Category', 'Completed'];
    const rows = Object.entries(globalData?.history || {}).flatMap(([date, data]) => {
      const daily = data as DailyData;
      if (!daily || !daily.tasks) return [];
      return daily.tasks.map(t => [date, t.label, t.category, t.completed]);
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `goalflow_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans",
      isDarkMode ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tighter uppercase italic">GoalFlow</h1>
                <div className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] font-bold text-amber-500 tracking-widest uppercase">Beta v2.0</div>
              </div>
              <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
                {format(currentDate, 'EEEE, MMMM do, yyyy')}
              </p>
            </div>
            
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-amber-500">
                  <Flame className="w-4 h-4 fill-amber-500" />
                  <span className="font-bold font-mono">{streak} DAY STREAK</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative pt-8 pb-4">
            <div className="flex justify-between mb-4">
              {globalData.goals.levels.map((level, idx) => (
                <div key={level} className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500",
                    idx <= globalData.goals.currentLevelIndex ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-zinc-800"
                  )} />
                  <span className={cn(
                    "text-[10px] font-bold font-mono tracking-tighter transition-colors",
                    idx === globalData.goals.currentLevelIndex ? "text-amber-500" : "text-zinc-500"
                  )}>{level}</span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(globalData.goals.currentLevelIndex / (globalData.goals.levels.length - 1)) * 100}%` }}
                className="h-full bg-amber-500"
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <nav className="lg:col-span-3 space-y-2">
            {[
              { id: 'tasks', label: 'Daily Tasks', icon: CheckCircle2 },
              { id: 'schedule', label: 'Live Schedule', icon: Calendar },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: SettingsIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                  activeTab === tab.id 
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-lg shadow-amber-500/20" 
                    : "hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200"
                )}
              >
                <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-zinc-950" : "text-zinc-500 group-hover:text-amber-500")} />
                <span className="text-sm uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}

            <div className="mt-8 p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pomodoro</span>
                <Clock className="w-3 h-3 text-amber-500" />
              </div>
              <div className="text-center">
                <div className="text-4xl font-mono font-bold tracking-tighter mb-4">
                  {Math.floor(timer.seconds / 60).toString().padStart(2, '0')}:
                  {(timer.seconds % 60).toString().padStart(2, '0')}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTimer(prev => ({ ...prev, active: !prev.active }))}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    {timer.active ? 'Pause' : 'Start'}
                  </button>
                  <button 
                    onClick={() => setTimer({ active: false, seconds: 1500, mode: 'work' })}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Tab Content */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
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
                      <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-sm font-bold font-mono">{isToday(currentDate) ? 'TODAY' : format(currentDate, 'MMM d')}</span>
                      <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(CATEGORIES).map(([cat, info]) => (
                      <div key={cat} className={cn("bg-zinc-900/30 rounded-2xl border-l-4 p-6 border border-zinc-800/50", info.color)}>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">{info.label}</h3>
                        <div className="space-y-3">
                          {dailyData.tasks.filter(t => t.category === cat).map(task => (
                            <button 
                              key={task.id}
                              onClick={() => toggleTask(task.id)}
                              className="w-full flex items-center justify-between group"
                            >
                              <span className={cn("text-sm transition-all", task.completed ? "text-zinc-600 line-through" : "text-zinc-200")}>{task.label}</span>
                              {task.completed ? <CheckCircle2 className="w-5 h-5 text-amber-500" /> : <Circle className="w-5 h-5 text-zinc-800 group-hover:text-zinc-600 transition-colors" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

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
                      onClick={() => handleReshuffle("Manual request")}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-400 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Reshuffle Day
                    </button>
                  </div>

                  <div className="relative space-y-4">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />
                    {currentSchedule.map((item, idx) => {
                      const isActive = activeTask === item;
                      return (
                        <div key={idx} className={cn(
                          "relative pl-12 transition-all duration-500",
                          isActive ? "scale-105" : "opacity-50"
                        )}>
                          <div className={cn(
                            "absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 transition-all",
                            isActive ? "bg-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-zinc-950 border-zinc-800"
                          )} />
                          <div className={cn(
                            "p-4 rounded-xl border transition-all",
                            isActive ? "bg-amber-500/10 border-amber-500/50" : "bg-zinc-900/30 border-zinc-800/50"
                          )}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono font-bold text-amber-500">{item.time}</span>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{item.category}</span>
                            </div>
                            <h4 className="font-bold text-zinc-200">{item.activity}</h4>
                            {item.notes && <p className="text-xs text-zinc-500 mt-1 italic">{item.notes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

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
                    <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Today's Completion</span>
                      <div className="text-4xl font-mono font-bold text-amber-500">{taskCompletionRate.toFixed(0)}%</div>
                    </div>
                    <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Streak</span>
                      <div className="text-4xl font-mono font-bold text-amber-500">{streak} Days</div>
                    </div>
                    <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Level Progress</span>
                      <div className="text-4xl font-mono font-bold text-amber-500">{globalData.goals.currentLevelIndex + 1}/{globalData.goals.levels.length}</div>
                    </div>
                  </div>
                </motion.div>
              )}

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
                    <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Notifications</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold">Daily Stamp Reminder</div>
                            <div className="text-[10px] text-zinc-500">Remind me to log progress at night</div>
                          </div>
                          <button 
                            onClick={() => setGlobalData(prev => ({
                              ...prev,
                              notificationSettings: { ...prev.notificationSettings, dailyStampReminder: !prev.notificationSettings.dailyStampReminder }
                            }))}
                            className={cn(
                              "w-10 h-5 rounded-full transition-all relative",
                              globalData.notificationSettings.dailyStampReminder ? "bg-amber-500" : "bg-zinc-800"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                              globalData.notificationSettings.dailyStampReminder ? "left-6" : "left-1"
                            )} />
                          </button>
                        </div>
                        {globalData.notificationSettings.dailyStampReminder && (
                          <input 
                            type="time" 
                            value={globalData.notificationSettings.dailyStampTime}
                            onChange={(e) => setGlobalData(prev => ({
                              ...prev,
                              notificationSettings: { ...prev.notificationSettings, dailyStampTime: e.target.value }
                            }))}
                            className="bg-zinc-800 border-none rounded text-xs font-mono py-1 px-2 focus:ring-1 focus:ring-amber-500"
                          />
                        )}
                      </div>
                    </div>

                    <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">App Settings</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">Install GoalFlow</div>
                          <div className="text-[10px] text-zinc-500">Add to home screen for offline access</div>
                        </div>
                        <button 
                          onClick={handleInstall}
                          disabled={!deferredPrompt}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                            deferredPrompt ? "bg-amber-500 text-zinc-950" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          )}
                        >
                          {deferredPrompt ? "Install Now" : "Installed"}
                        </button>
                      </div>
                    </div>

                    <div className="bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800/50 space-y-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Danger Zone</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-red-500">Reset All Data</div>
                          <div className="text-[10px] text-zinc-500">Permanently delete all progress and history</div>
                        </div>
                        <button 
                          onClick={handleResetAllData}
                          className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all"
                        >
                          Reset Now
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer Reflection */}
        <footer className="mt-24 border-t border-zinc-900 pt-12 pb-24">
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg"><Flame className="w-5 h-5 text-amber-500" /></div>
              <h2 className="text-2xl font-bold tracking-tight">Daily Reflection</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">What did I accomplish?</label>
                <textarea 
                  value={dailyData.reflection.accomplished}
                  onChange={(e) => updateReflection('accomplished', e.target.value)}
                  className="w-full h-32 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  placeholder="List your wins..."
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">What blocked me?</label>
                <textarea 
                  value={dailyData.reflection.blocked}
                  onChange={(e) => updateReflection('blocked', e.target.value)}
                  className="w-full h-32 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  placeholder="Identify friction..."
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Grateful for?</label>
                <textarea 
                  value={dailyData.reflection.grateful}
                  onChange={(e) => updateReflection('grateful', e.target.value)}
                  className="w-full h-32 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  placeholder="Gratitude is fuel..."
                />
              </div>
            </div>
          </section>
        </footer>
      </div>

      {/* Ryna AI PA UI */}
      <RynaPA 
        rynaMode={rynaMode}
        rynaTranscript={rynaTranscript}
        rynaResponse={rynaResponse}
        setRynaResponse={setRynaResponse}
        startListening={startListening}
        stopListening={stopListening}
      />

      {/* Mobile Navigation Spacer */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
