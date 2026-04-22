'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  Flame, 
  Clock, 
  Target,
  Zap,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { cn, PILLAR_CONFIG, LEVEL_CONFIG } from '@/lib/utils';
import { useStore } from '@/store';
import { useApi } from '@/hooks/useApi';

const COLORS = ['#60a5fa', '#c084fc', '#4ade80', '#fb923c'];

export default function AnalyticsPage() {
  const { user, pillarGoals, stats } = useStore();
  const { getSummary, getHistory, getWeeklyReport, loading } = useApi();
  
  const [summary, setSummary] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      const [s, h, w] = await Promise.all([
        getSummary(user.id),
        getHistory(user.id, 7),
        getWeeklyReport(user.id),
      ]);
      setSummary(s);
      setHistory(h);
      setWeeklyReport(w);
    };
    
    loadData();
  }, [user, getSummary, getHistory, getWeeklyReport]);

  if (!user) return null;

  const pillarData = summary?.pillars_completed ? [
    { name: 'BUILD', value: summary.pillars_completed.BUILD || 0 },
    { name: 'SHOW', value: summary.pillars_completed.SHOW || 0 },
    { name: 'EARN', value: summary.pillars_completed.EARN || 0 },
    { name: 'SYSTEMIZE', value: summary.pillars_completed.SYSTEMIZE || 0 },
  ] : [];

  const chartData = history.slice(-7).map((d: any, i: number) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i % 7] || `Day ${i + 1}`,
    score: d.score || 0,
    buildHours: d.build_hours || 0,
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-24">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Analytics</h1>
          <div className="flex items-center gap-1.5 text-amber-500">
            <Flame className="w-4 h-4 fill-amber-500" />
            <span className="text-sm font-bold font-mono">{stats.streakCurrent} day streak</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Avg Score</span>
            </div>
            <div className="text-3xl font-black font-mono text-amber-500">
              {summary?.avg_score?.toFixed(1) || '0.0'}<span className="text-lg">/10</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Build Hours</span>
            </div>
            <div className="text-3xl font-black font-mono text-blue-400">
              {summary?.build_hours_total?.toFixed(1) || '0.0'}<span className="text-lg">h</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Streak</span>
            </div>
            <div className="text-3xl font-black font-mono text-green-400">
              {summary?.current_streak || 0}<span className="text-lg text-zinc-500"> days</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">Level</span>
            </div>
            <div className={cn(
              "text-xl font-bold",
              LEVEL_CONFIG[stats.level as keyof typeof LEVEL_CONFIG]?.color || 'text-zinc-400'
            )}>
              {LEVEL_CONFIG[stats.level as keyof typeof LEVEL_CONFIG]?.label || 'Beginner'}
            </div>
            <div className="text-xs text-zinc-500 font-mono">{stats.xp} XP</div>
          </motion.div>
        </div>

        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
        >
          <h2 className="text-sm font-bold tracking-widest uppercase mb-4">Last 7 Days</h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="day" 
                  stroke="#71717a" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 10]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar 
                  dataKey="score" 
                  fill="#f59e0b" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pillar Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800"
        >
          <h2 className="text-sm font-bold tracking-widest uppercase mb-4">Pillar Completion</h2>
          <div className="flex items-center gap-6">
            <div className="h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pillarData}
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pillarData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {pillarData.map((item: any, i: number) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: COLORS[i] }}
                    />
                    <span className="text-xs font-bold text-zinc-400">{item.name}</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">{item.value}x</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Weekly AI Report */}
        {weeklyReport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-purple-500/10 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-500 tracking-widest uppercase">Weekly Report</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {weeklyReport.insights}
            </p>
            <div className="mt-4 flex gap-4 text-xs font-mono text-zinc-500">
              <span>Score: {weeklyReport.avg_score}/10</span>
              <span>•</span>
              <span>Build: {weeklyReport.total_build_hours}h</span>
              <span>•</span>
              <span>Streak: {weeklyReport.streak}/7</span>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}