import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { RefreshCw, MessageCircle, Plus, Clock, Zap, ChevronDown, ChevronUp, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { getPillarTheme, DEFAULT_PILLARS } from '../lib/constants';
import SegBar from '../components/ui/SegBar';
import NumberTicker from '../components/ui/NumberTicker';
import type { Task } from '../types';

const PILLAR_SYMS: Record<string, string> = { BUILD: '◈', SHOW: '◎', EARN: '◆', SYSTEMIZE: '◉' };

function ScoreGauge({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? 'var(--success)' : score >= 6 ? 'var(--acid)' : score >= 4 ? 'var(--warning)' : 'var(--danger)';
  const r = 42, circ = 2 * Math.PI * r;
  const half = circ / 2;
  const offset = half - (pct / 100) * half;
  return (
    <div className="relative flex items-center justify-center w-full max-w-[100px] mx-auto" style={{ aspectRatio: '100 / 60' }}>
      <svg className="w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="var(--border-mid)" strokeWidth="6" strokeLinecap="round" />
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${half} ${half}`} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s', filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <div className="absolute bottom-1 text-center">
        <p className="mono text-lg font-bold leading-none" style={{ color }}><NumberTicker value={score} decimals={1} /></p>
        <p className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>SCORE</p>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const theme = getPillarTheme(task.pillarId);
  const done = task.status === 'completed';
  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2.5 group transition-all"
      style={{ borderBottom: '1px solid var(--border-dim)', opacity: done ? 0.5 : 1 }}>
      <button onClick={onToggle}
        className="w-4 h-4 shrink-0 flex items-center justify-center transition-all"
        style={{ background: done ? theme.accent : 'transparent', border: `1px solid ${done ? theme.accent : 'var(--border-mid)'}` }}>
        {done && <span style={{ color: 'var(--bg-void)', fontSize: 9, fontWeight: 'bold' }}>✓</span>}
      </button>
      <span className="mono text-[10px] px-1.5 py-0.5 shrink-0" style={{ color: theme.accent, background: theme.bg, border: `1px solid ${theme.border}` }}>
        {task.pillarId.slice(0, 3)}
      </span>
      <span className={`flex-1 text-sm ${done ? 'line-through' : ''}`} style={{ color: done ? 'var(--tx-muted)' : 'var(--tx-primary)' }}>
        {task.title}
      </span>
      <span className="mono text-[9px] flex items-center gap-1 shrink-0" style={{ color: 'var(--tx-ghost)' }}>
        <Clock className="w-2.5 h-2.5" />{task.estimatedMinutes}m
      </span>
      {task.isAIGenerated && <Zap className="w-3 h-3 shrink-0" style={{ color: 'var(--acid)', opacity: 0.5 }} />}
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--tx-ghost)' }}>
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// Answers "what should I do right now" using the routine + project cadence
// engine — projects.py's /planning/next-action. Silent when there's simply
// no routine set up yet (a brand-new account) rather than nagging.
function NextActionCard() {
  const { nextAction, nextActionLoading, loadNextAction } = useStore();
  useEffect(() => { loadNextAction(); }, [loadNextAction]);

  // No routine configured yet (fresh account) — backend says so explicitly
  // rather than the card silently showing a placeholder.
  if (!nextActionLoading && (!nextAction || nextAction.slotType === 'open' && nextAction.slotLabel === 'Unstructured time')) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl p-4 mb-5 flex items-center gap-4" style={{ borderTop: '2px solid var(--acid)' }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
        <Zap className="w-4 h-4" style={{ color: 'var(--acid)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="mono text-[9px] tracking-widest font-bold mb-0.5" style={{ color: 'var(--acid)' }}>
          RIGHT NOW{nextAction ? ` · ${nextAction.slotLabel.toUpperCase()}` : ''}
        </p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--tx-primary)' }}>
          {nextActionLoading ? 'Working out what\'s next…' : nextAction?.recommendation}
        </p>
      </div>
      <Link to="/projects" className="shrink-0 mono text-[9px] tracking-widest font-bold flex items-center gap-1" style={{ color: 'var(--tx-muted)' }}>
        PROJECTS <ArrowRight className="w-3 h-3" />
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user, dailyData, kpi, toggleTask, updateBuildHours, updateReflection, generateTasks, deleteTask, setChatOpen, dailyLoading, addTask, logDay } = useStore();
  const [pillarFilter, setPillarFilter] = useState('ALL');
  const [reflOpen, setReflOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPillar, setNewPillar] = useState('BUILD');
  const [saving, setSaving] = useState(false);

  if (!dailyData || !user) return null;

  const done = dailyData.tasks.filter(t => t.status === 'completed').length;
  const total = dailyData.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const filteredTasks = pillarFilter === 'ALL' ? dailyData.tasks : dailyData.tasks.filter(t => t.pillarId === pillarFilter);

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addTask({ pillarId: newPillar, title: newTitle, estimatedMinutes: 30, status: 'pending', isAIGenerated: false, dateKey: format(new Date(), 'yyyy-MM-dd') });
    setNewTitle(''); setAddingTask(false);
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8 pb-5"
        style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>
            {format(new Date(), 'EEEE, MMM d yyyy').toUpperCase()} · {user.streak > 0 ? `${user.streak}-DAY STREAK` : 'NEW STREAK STARTS TODAY'}
          </p>
          <h1 className="text-2xl font-black">
            {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span style={{ color: 'var(--acid)' }}>{user.name.split(' ')[0]}.</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tx-secondary)' }}>
            {done === 0 ? 'Zero tasks done. Start executing.' : done === total ? 'All tasks complete. Exceptional.' : `${done}/${total} tasks done — keep going.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => generateTasks()} disabled={dailyLoading}
            className="flex items-center gap-2 px-3 py-2 mono text-[10px] tracking-widest transition-all disabled:opacity-40"
            style={{ border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)' }}>
            <RefreshCw className={`w-3 h-3 ${dailyLoading ? 'animate-spin' : ''}`} />
            {dailyLoading ? 'GENERATING...' : 'REGEN TASKS'}
          </button>
          <button onClick={() => setChatOpen(true)}
            className="btn-gradient flex items-center gap-2 px-3 py-2 rounded-lg mono text-[10px] tracking-widest font-bold transition-all">
            <MessageCircle className="w-3 h-3" /> ASK RYNA
          </button>
        </div>
      </motion.div>

      <NextActionCard />

      <div className="grid grid-cols-12 gap-5">
        {/* LEFT */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* KPI Strip */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
            className="grid grid-cols-3 gap-3">
            {/* Score */}
            <div className="glass-panel rounded-xl p-4" style={{ borderTop: '2px solid var(--acid)' }}>
              <p className="mono text-[9px] tracking-widest mb-3" style={{ color: 'var(--tx-muted)' }}>TODAY'S SCORE</p>
              <ScoreGauge score={dailyData.score} />
            </div>
            {/* Streak */}
            <div className="glass-panel rounded-xl p-4" style={{ borderTop: '2px solid #FACC15' }}>
              <p className="mono text-[9px] tracking-widest mb-3" style={{ color: 'var(--tx-muted)' }}>STREAK</p>
              <p className="mono text-2xl sm:text-4xl font-black" style={{ color: '#FACC15' }}><NumberTicker value={user.streak} /></p>
              <p className="mono text-[9px] tracking-widest mt-1" style={{ color: 'var(--tx-muted)' }}>DAYS · DON'T BREAK IT</p>
            </div>
            {/* Completion */}
            <div className="glass-panel rounded-xl p-4" style={{ borderTop: '2px solid var(--ember)' }}>
              <p className="mono text-[9px] tracking-widest mb-3" style={{ color: 'var(--tx-muted)' }}>COMPLETION</p>
              <p className="mono text-2xl sm:text-4xl font-black" style={{ color: 'var(--ember)' }}><NumberTicker value={pct} />%</p>
              <p className="mono text-[9px] tracking-widest mt-1" style={{ color: 'var(--tx-muted)' }}>{done}/{total} TASKS</p>
            </div>
          </motion.div>

          {/* Pillar Grid */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DEFAULT_PILLARS.map(p => {
              const theme = getPillarTheme(p.id);
              const pts = dailyData.tasks.filter(t => t.pillarId === p.id);
              const pdone = pts.filter(t => t.status === 'completed').length;
              const ppct = pts.length > 0 ? Math.round((pdone / pts.length) * 100) : 0;
              const active = pillarFilter === p.id;
              return (
                <button key={p.id} onClick={() => setPillarFilter(active ? 'ALL' : p.id)}
                  className="glass-panel rounded-xl p-3 text-left transition-all"
                  style={{
                    background: active ? theme.bg : undefined,
                    borderTop: `2px solid ${active ? theme.accent : 'transparent'}`,
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg" style={{ color: theme.accent }}>{PILLAR_SYMS[p.id]}</span>
                    <span className="mono text-[9px] font-bold" style={{ color: theme.accent }}>{ppct}%</span>
                  </div>
                  <p className="mono text-[10px] font-bold tracking-widest" style={{ color: 'var(--tx-primary)' }}>{p.id}</p>
                  <p className="mono text-[8px] mt-0.5" style={{ color: 'var(--tx-muted)' }}>{pdone}/{pts.length}</p>
                  <div className="mt-2">
                    <SegBar value={ppct} color={theme.accent} segments={10} height={3} />
                  </div>
                </button>
              );
            })}
          </motion.div>

          {/* Tasks panel */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="glass-panel rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <div className="flex items-center gap-4">
                <span className="mono text-[10px] font-bold tracking-widest" style={{ color: 'var(--tx-primary)' }}>TASKS</span>
                <div className="flex items-center gap-1">
                  {['ALL', 'BUILD', 'SHOW', 'EARN', 'SYSTEMIZE'].map(f => (
                    <button key={f} onClick={() => setPillarFilter(f)}
                      className="mono text-[9px] px-2 py-1 tracking-widest transition-all"
                      style={{
                        background: pillarFilter === f ? 'rgba(139,92,246,0.1)' : 'transparent',
                        border: `1px solid ${pillarFilter === f ? 'var(--acid)' : 'transparent'}`,
                        color: pillarFilter === f ? 'var(--acid)' : 'var(--tx-muted)',
                      }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setAddingTask(true)}
                className="flex items-center gap-1 mono text-[9px] tracking-widest px-2 py-1 transition-colors"
                style={{ color: 'var(--tx-muted)', border: '1px solid var(--border-dim)' }}>
                <Plus className="w-3 h-3" /> ADD
              </button>
            </div>
            <div>
              {filteredTasks.map(task => (
                <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
              ))}
              {filteredTasks.length === 0 && (
                <div className="py-10 text-center">
                  <p className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-ghost)' }}>NO TASKS · GENERATE OR ADD MANUALLY</p>
                </div>
              )}
              {addingTask && (
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
                  <select value={newPillar} onChange={e => setNewPillar(e.target.value)}
                    className="px-2 py-1.5 text-xs outline-none mono" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)' }}>
                    {['BUILD','SHOW','EARN','SYSTEMIZE'].map(p => <option key={p} value={p} style={{ background: 'var(--bg-overlay)' }}>{p}</option>)}
                  </select>
                  <input autoFocus type="text" placeholder="Task title..." value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setAddingTask(false); }}
                    className="flex-1 px-3 py-1.5 text-sm outline-none" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--acid)', color: 'var(--tx-primary)' }} />
                  <button onClick={handleAddTask} className="px-3 py-1.5 mono text-[10px] font-bold" style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>ADD</button>
                  <button onClick={() => setAddingTask(false)} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* RIGHT */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Build Hours */}
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="glass-panel rounded-xl p-5" style={{ borderTop: '2px solid var(--ember)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>BUILD HOURS TODAY</p>
              <p className="mono text-2xl font-black" style={{ color: 'var(--ember)' }}><NumberTicker value={dailyData.buildHours} decimals={1} /></p>
            </div>
            <input type="range" min={0} max={12} step={0.5} value={dailyData.buildHours} onChange={e => updateBuildHours(+e.target.value)} className="w-full" />
            <div className="flex justify-between mono text-[9px] mt-1" style={{ color: 'var(--tx-ghost)' }}>
              <span>0h</span><span>6h</span><span>12h</span>
            </div>
            <p className="mono text-[9px] mt-3" style={{ color: dailyData.buildHours >= 4 ? 'var(--acid)' : 'var(--tx-muted)' }}>
              {dailyData.buildHours >= 4 ? '▲ STRONG SESSION' : dailyData.buildHours >= 2 ? '▷ GOOD START' : '○ LOG YOUR HOURS'}
            </p>
          </motion.div>

          {/* Weekly stats */}
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }}
            className="glass-panel rounded-xl p-5">
            <p className="mono text-[9px] tracking-widest mb-4" style={{ color: 'var(--tx-muted)' }}>THIS WEEK</p>
            <div className="space-y-3">
              {[
                { label: 'AVG SCORE',      value: `${kpi?.weeklyAvgScore.toFixed(1)}/10` },
                { label: 'BUILD HOURS',    value: `${kpi?.buildHoursThisWeek}h` },
                { label: 'TASKS DONE',     value: `${kpi?.totalTasksCompleted}` },
                { label: 'LEVEL',          value: `LV. ${user.level}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem' }}>
                  <span className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>{label}</span>
                  <span className="mono text-xs font-bold" style={{ color: 'var(--tx-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Daily Reflection */}
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
            className="glass-panel rounded-xl overflow-hidden">
            <button onClick={() => setReflOpen(r => !r)}
              className="w-full flex items-center justify-between px-5 py-3 transition-colors"
              style={{ borderBottom: reflOpen ? '1px solid var(--border-dim)' : 'none' }}>
              <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--tx-muted)' }}>DAILY REFLECTION</span>
              {reflOpen ? <ChevronUp className="w-3.5 h-3.5" style={{ color: 'var(--tx-muted)' }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--tx-muted)' }} />}
            </button>
            {reflOpen && (
              <div className="p-4 space-y-3">
                {([
                  { key: 'accomplished' as const, label: '+ ACCOMPLISHED' },
                  { key: 'blocked' as const,      label: '× BLOCKED' },
                  { key: 'grateful' as const,     label: '◎ GRATEFUL' },
                ] as const).map(({ key, label }) => (
                  <div key={key}>
                    <label className="mono text-[8px] tracking-widest block mb-1" style={{ color: 'var(--tx-muted)' }}>{label}</label>
                    <textarea rows={2} value={dailyData.reflection[key]} onChange={e => updateReflection(key, e.target.value)}
                      placeholder="..." className="w-full px-3 py-2 text-sm outline-none resize-none transition-all"
                      style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)', color: 'var(--tx-primary)' }}
                      onFocus={e => (e.target.style.borderColor = 'var(--acid)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
                  </div>
                ))}
                <button onClick={async () => { setSaving(true); await logDay(); setSaving(false); }} disabled={saving}
                  className="w-full py-2 mono text-[10px] tracking-widest font-bold transition-all disabled:opacity-50"
                  style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                  {saving ? 'SAVING...' : 'SAVE REFLECTION'}
                </button>
              </div>
            )}
            {!reflOpen && (
              <p className="px-5 py-3 mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>TAP TO ADD REFLECTION</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
