import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Zap } from 'lucide-react';
import { useStore } from '../lib/store';
import { getPillarTheme } from '../lib/constants';
import SegBar from '../components/ui/SegBar';
import NumberTicker from '../components/ui/NumberTicker';

const PILLAR_COLORS: Record<string, string> = {
  BUILD: '#ff6b35', SHOW: '#00d4b4', EARN: '#f5c842', SYSTEMIZE: '#7b8fa8',
};

const ChartTip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs space-y-1" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)' }}>
      <p className="mono text-[9px] mb-1" style={{ color: 'var(--tx-muted)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="mono text-[10px]" style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  );
};

const TABS = ['OVERVIEW', 'PERFORMANCE', 'PILLARS'] as const;

export default function Analytics() {
  const { kpi, history, weeklyReport } = useStore();
  const [tab, setTab] = useState<typeof TABS[number]>('OVERVIEW');

  if (!kpi || !history.length) return null;

  const chartData = history.map(h => ({
    date: h.dateKey.slice(5),
    score: +h.score.toFixed(1),
    hours: +h.buildHours.toFixed(1),
    tasks: h.tasksCompleted,
  }));

  const pieData = Object.entries(kpi.pillarDistribution).map(([k, v]) => ({
    name: k, value: v, color: PILLAR_COLORS[k] || '#5a5448',
  }));

  const kpiCards = [
    { label: 'CURRENT SCORE', value: kpi.currentScore, dec: 1, suffix: '/10',    color: 'var(--acid)' },
    { label: 'STREAK',        value: kpi.streak,        dec: 0, suffix: ' days',  color: '#f5c842' },
    { label: 'BUILD HOURS',   value: kpi.buildHoursThisWeek, dec: 1, suffix: 'h this week', color: '#ff6b35' },
    { label: 'TASKS DONE',    value: kpi.totalTasksCompleted, dec: 0, suffix: ' all time', color: '#00d4b4' },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 pb-5"
        style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>EXECUTION INTELLIGENCE</p>
          <h1 className="text-2xl font-black">Analytics</h1>
        </div>
        <div className="flex items-center gap-px" style={{ border: '1px solid var(--border-mid)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="mono text-[9px] tracking-widest px-4 py-2 transition-all"
              style={{
                background: tab === t ? 'var(--acid)' : 'var(--bg-raised)',
                color: tab === t ? 'var(--bg-void)' : 'var(--tx-muted)',
              }}>
              {t}
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {kpiCards.map(({ label, value, dec, suffix, color }) => (
          <div key={label} className="p-4" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderTop: `2px solid ${color}` }}>
            <p className="mono text-[9px] tracking-widest mb-2" style={{ color: 'var(--tx-muted)' }}>{label}</p>
            <p className="mono text-2xl font-black" style={{ color }}>
              <NumberTicker value={value} decimals={dec} />
              <span className="text-sm font-normal ml-1" style={{ color: 'var(--tx-muted)' }}>{suffix}</span>
            </p>
          </div>
        ))}
      </motion.div>

      {/* OVERVIEW */}
      {tab === 'OVERVIEW' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            {/* Score line */}
            <div className="col-span-12 lg:col-span-8 p-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
              <p className="mono text-[9px] tracking-widest mb-5" style={{ color: 'var(--tx-muted)' }}>SCORE TREND — 14 DAYS</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,240,200,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--tx-ghost)', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: 'var(--tx-ghost)', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="score" stroke="var(--acid)" strokeWidth={2} dot={{ fill: 'var(--acid)', r: 2, strokeWidth: 0 }} activeDot={{ r: 4 }} name="Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Pie */}
            <div className="col-span-12 lg:col-span-4 p-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
              <p className="mono text-[9px] tracking-widest mb-4" style={{ color: 'var(--tx-muted)' }}>PILLAR DISTRIBUTION</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} opacity={0.85} />)}
                  </Pie>
                  <Tooltip content={<ChartTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieData.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-2 h-2 shrink-0" style={{ background: color }} />
                    <span className="mono text-[9px] flex-1" style={{ color: 'var(--tx-secondary)' }}>{name}</span>
                    <span className="mono text-[9px] font-bold" style={{ color }}>{value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Build hours bar */}
          <div className="p-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
            <p className="mono text-[9px] tracking-widest mb-5" style={{ color: 'var(--tx-muted)' }}>BUILD HOURS — 14 DAYS</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,240,200,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--tx-ghost)', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--tx-ghost)', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="hours" fill="#ff6b35" radius={[2, 2, 0, 0]} opacity={0.75} name="Build Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* PERFORMANCE */}
      {tab === 'PERFORMANCE' && weeklyReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="p-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderTop: '2px solid var(--acid)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--tx-muted)' }}>WEEKLY REPORT</p>
                <span className="mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>
                  {weeklyReport.weekStart.slice(5)} — {weeklyReport.weekEnd.slice(5)}
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--tx-secondary)' }}>{weeklyReport.summary}</p>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="mono text-[9px] tracking-widest mb-2 font-bold" style={{ color: '#00d4b4' }}>+ HIGHLIGHTS</p>
                  {weeklyReport.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <span className="mono text-[9px] mt-0.5" style={{ color: '#00d4b4' }}>+</span>
                      <span className="text-xs" style={{ color: 'var(--tx-secondary)' }}>{h}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="mono text-[9px] tracking-widest mb-2 font-bold" style={{ color: '#f5c842' }}>→ IMPROVEMENTS</p>
                  {weeklyReport.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <span className="mono text-[9px] mt-0.5" style={{ color: '#f5c842' }}>→</span>
                      <span className="text-xs" style={{ color: 'var(--tx-secondary)' }}>{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Ryna insight */}
            <div className="p-5 flex items-start gap-4"
              style={{ background: 'rgba(0,212,180,0.04)', border: '1px solid rgba(0,212,180,0.15)' }}>
              <div className="w-7 h-7 shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(0,212,180,0.12)', border: '1px solid rgba(0,212,180,0.25)' }}>
                <Zap className="w-3.5 h-3.5" style={{ color: '#00d4b4' }} />
              </div>
              <div>
                <p className="mono text-[9px] tracking-widest mb-2 font-bold" style={{ color: '#00d4b4' }}>RYNA'S WEEKLY INSIGHT</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>{weeklyReport.aiInsight}</p>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 p-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
            <p className="mono text-[9px] tracking-widest mb-4" style={{ color: 'var(--tx-muted)' }}>TASKS / DAY</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,240,200,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--tx-ghost)', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="date" type="category" tick={{ fill: 'var(--tx-ghost)', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="tasks" fill="var(--acid)" radius={[0, 2, 2, 0]} opacity={0.7} name="Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* PILLARS */}
      {tab === 'PILLARS' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(kpi.pillarDistribution).map(([id, pct]) => {
              const theme = getPillarTheme(id);
              return (
                <div key={id} className="p-5 text-center" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderTop: `2px solid ${theme.accent}` }}>
                  <p className="mono text-3xl font-black mb-1" style={{ color: theme.accent }}>{pct}%</p>
                  <p className="mono text-[9px] tracking-widest mb-3" style={{ color: 'var(--tx-muted)' }}>{id}</p>
                  <SegBar value={pct} color={theme.accent} segments={10} height={4} />
                </div>
              );
            })}
          </div>
          <div className="p-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
            <p className="mono text-[9px] tracking-widest mb-5" style={{ color: 'var(--tx-muted)' }}>SCORE + BUILD HOURS TREND</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,240,200,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--tx-ghost)', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--tx-ghost)', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="score" stroke="var(--acid)" strokeWidth={2} dot={false} name="Score" />
                <Line type="monotone" dataKey="hours" stroke="#ff6b35" strokeWidth={2} dot={false} name="Build Hours" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}
