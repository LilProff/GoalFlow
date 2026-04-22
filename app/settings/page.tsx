'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Bell, 
  CreditCard, 
  LogOut,
  Moon,
  Sun,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

export default function SettingsPage() {
  const { user, stats, logout } = useStore();
  const [isDark, setIsDark] = useState(true);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-2xl font-black text-amber-500">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{user.name}</h2>
              <p className="text-sm text-zinc-500">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 tracking-widest rounded">
                  {user.coachingStyle.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-400 tracking-widest rounded">
                  PHASE {user.phase}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 text-center">
            <div className="text-xl font-black text-amber-500">{stats.xp}</div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">XP</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 text-center">
            <div className="text-xl font-black text-green-500">{stats.streakCurrent}</div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Streak</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 text-center">
            <div className="text-xl font-black text-blue-400">{stats.level}</div>
            <div className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Level</div>
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-zinc-500" />
              <span className="font-bold">Profile</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>

          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-zinc-500" />
              <span className="font-bold">Notifications</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>

          <button className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-zinc-500" />
              <span className="font-bold">Subscription</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/10 text-green-500 rounded">
                FREE
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </button>

          <button 
            onClick={() => setIsDark(!isDark)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-5 h-5 text-zinc-500" /> : <Sun className="w-5 h-5 text-zinc-500" />}
              <span className="font-bold">Dark Mode</span>
            </div>
            <div className={cn(
              'w-10 h-5 rounded-full transition-all relative',
              isDark ? 'bg-amber-500' : 'bg-zinc-700'
            )}>
              <div className={cn(
                'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                isDark ? 'left-6' : 'left-1'
              )} />
            </div>
          </button>

          <button 
            onClick={() => logout()}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="font-bold text-red-400">Sign Out</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-500/50" />
          </button>
        </motion.div>

        {/* Schedule Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Schedule</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Wake Time</span>
              <div className="font-mono font-bold">{user.wakeTime}</div>
            </div>
            <div>
              <span className="text-zinc-500">Sleep Time</span>
              <div className="font-mono font-bold">{user.sleepTime}</div>
            </div>
            <div>
              <span className="text-zinc-500">Hours/Day</span>
              <div className="font-mono font-bold">{user.hoursAvailable}h</div>
            </div>
            <div>
              <span className="text-zinc-500">Timezone</span>
              <div className="font-mono font-bold text-xs">{user.timezone}</div>
            </div>
          </div>
        </motion.div>

        {/* Version */}
        <div className="text-center text-xs text-zinc-600">
          GoalFlow v2.0.0 • Built by Samuel Ayomide
        </div>
      </main>
    </div>
  );
}