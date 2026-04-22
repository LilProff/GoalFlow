'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Circle, 
  Flame, 
  Settings, 
  BarChart3, 
  Clock, 
  Sparkles, 
  Zap,
  ChevronRight,
  Target,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, PILLAR_CONFIG, getTodayKey, LEVEL_CONFIG } from '@/lib/utils';
import { useStore, calculateScore, getXPForPillar, getLevelFromXP } from '@/store';
import { useApi } from '@/hooks/useApi';
import { RynaChat } from '@/components/RynaChat';
import type { Pillar } from '@/lib/types';

const PILARS: Pillar[] = ['BUILD', 'SHOW', 'EARN', 'SYSTEMIZE'];

const PILLAR_TASKS: Record<Pillar, string> = {
  BUILD: 'Deep work on your main skill/product',
  SHOW: 'Create and publish content',
  EARN: 'Client outreach or sales activity',
  SYSTEMIZE: 'Automate or document a process',
};

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rynaOpen, setRynaOpen] = useState(false);
  const { 
    user, 
    onboardingStep,
    pillarGoals,
    todayLog, 
    stats, 
    logPillar, 
    setBuildHours, 
    setReflection,
    addToast,
    activeTab,
    setActiveTab,
  } = useStore();
  const { generateTasks, logDay } = useApi();

  const todayKey = getTodayKey();
  const score = calculateScore(todayLog);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      router.push('/login');
    }
  }, [mounted, user, router]);

  if (!mounted) return null;

  const handlePillarToggle = (pillar: Pillar) => {
    const currentDone = todayLog[`${pillar.toLowerCase()}Done` as keyof typeof todayLog];
    logPillar(pillar, !currentDone);
    
    if (!currentDone) {
      const xp = getXPForPillar(pillar);
      addToast({
        type: 'success',
        title: `${pillar} Complete!`,
        message: `+${xp} XP earned`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tighter uppercase italic">GoalFlow</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 tracking-widest rounded">
              v2.0 BETA
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-amber-500">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span className="text-sm font-bold font-mono">{stats.streakCurrent}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Score Ring */}
        <section className="flex justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-zinc-800"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-amber-500"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: score / 10 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ strokeDasharray: 351.86 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black font-mono text-amber-500">{score}</span>
              <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
                /10
              </span>
            </div>
          </div>
        </section>

        {/* Level Badge */}
        <section className="flex justify-center">
          <div className={cn(
            'px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase',
            LEVEL_CONFIG[stats.level].bg,
            LEVEL_CONFIG[stats.level].color
          )}>
            {LEVEL_CONFIG[stats.level].label} · {stats.xp} XP
          </div>
        </section>

        {/* Pillar Grid */}
        <section className="grid grid-cols-2 gap-3">
          {PILARS.map((pillar) => {
            const done = todayLog[`${pillar.toLowerCase()}Done` as keyof typeof todayLog] as boolean;
            const config = PILLAR_CONFIG[pillar];
            
            return (
              <motion.button
                key={pillar}
                onClick={() => handlePillarToggle(pillar)}
                className={cn(
                  'relative p-4 rounded-2xl border-2 transition-all text-left',
                  config.bg,
                  config.border,
                  done 
                    ? 'border-amber-500/50 bg-amber-500/5' 
                    : 'hover:border-zinc-600 hover:scale-[1.02]'
                )}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={cn(
                    'text-xs font-bold tracking-[0.2em] uppercase',
                    config.color
                  )}>
                    {pillar}
                  </span>
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-700" />
                  )}
                </div>
                <p className="text-sm text-zinc-300 leading-tight">
                  {PILLAR_TASKS[pillar]}
                </p>
                {done && (
                  <div className="absolute inset-0 rounded-2xl bg-amber-500/5 animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </section>

        {/* Build Hours Slider */}
        <section className="space-y-3">
          <label className="text-xs font-bold text-zinc-500 tracking-widest uppercase">
            Deep Work Hours (Today)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="8"
              step="0.5"
              value={todayLog.buildHours}
              onChange={(e) => setBuildHours(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:bg-amber-500
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-amber-500/30"
            />
            <span className="text-lg font-mono font-bold text-amber-500 w-12 text-right">
              {todayLog.buildHours}h
            </span>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="flex gap-3">
          <button 
            onClick={() => user && generateTasks(user.id, pillarGoals as unknown as Record<string, string> || { BUILD: '', SHOW: '', EARN: '', SYSTEMIZE: '' }, user.phase)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all text-sm font-bold"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Regenerate Tasks
          </button>
          <button 
            onClick={() => setRynaOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all text-sm font-bold"
          >
            <Zap className="w-4 h-4 text-purple-500" />
            Ask Ryna
          </button>
        </section>

        {/* Reflection */}
        <section className="space-y-3">
          <label className="text-xs font-bold text-zinc-500 tracking-widest uppercase">
            Daily Reflection
          </label>
          <textarea
            value={todayLog.reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What did you accomplish? What's blocking you? What are you grateful for?"
            className="w-full h-24 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
          />
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur p-2">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link
            href="/"
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest">Today</span>
          </Link>
          <Link
            href="/tasks"
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest">Tasks</span>
          </Link>
          <Link
            href="/goals"
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest">Goals</span>
          </Link>
          <Link
            href="/analytics"
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest">Analytics</span>
          </Link>
          <Link
            href="/settings"
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold tracking-widest">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Ryna Chat */}
      <RynaChat isOpen={rynaOpen} onClose={() => setRynaOpen(false)} />
    </div>
  );
}