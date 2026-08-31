import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { RefreshCw, Plus, Trash2, Clock, Zap, X, Timer, Link2, Edit3, Save, ChevronUp } from 'lucide-react';
import { useStore, minsToTime, timeToMins } from '../lib/store';
import { getPillarTheme, DEFAULT_PILLARS } from '../lib/constants';
import SegBar from '../components/ui/SegBar';
import type { Task, TaskStatus } from '../types';

const STATUS_OPTS: { v: TaskStatus | 'all'; label: string }[] = [
  { v: 'all', label: 'ALL' }, { v: 'pending', label: 'PENDING' },
  { v: 'completed', label: 'DONE' }, { v: 'skipped', label: 'SKIPPED' },
];

// ─── Inline task editor ───────────────────────────────────────────────────────
function TaskEditor({ task, onSave, onClose }: { task: Task; onSave: (updates: Partial<Task>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description ?? '');
  const [startTime, setStartTime] = useState(task.startTime ?? '09:00');
  const [duration, setDuration] = useState(task.estimatedMinutes);

  const endTime = (() => {
    const [h, m] = startTime.split(':').map(Number);
    const total = h * 60 + m + duration;
    return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
  })();

  const inp = "w-full px-2.5 py-2 text-sm outline-none transition-all";
  const inpStyle = { background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden">
      <div className="p-4 space-y-3 mt-1" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>
        <div className="flex items-center justify-between">
          <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>EDIT TASK</span>
          <div className="flex gap-1.5">
            <button onClick={() => { onSave({ title, description: desc, startTime, endTime, estimatedMinutes: duration }); onClose(); }}
              className="flex items-center gap-1 mono text-[9px] px-2.5 py-1.5 font-bold"
              style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
              <Save className="w-3 h-3" /> SAVE & SYNC
            </button>
            <button onClick={onClose} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)} className={inp} style={inpStyle}
          onFocus={e => (e.target.style.borderColor = 'var(--acid)')} onBlur={e => (e.target.style.borderColor = 'var(--border-mid)')} />

        <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..."
          className="w-full px-2.5 py-2 text-xs outline-none resize-none"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', color: 'var(--tx-secondary)' }} />

        {/* Time allocation */}
        <div className="grid grid-cols-3 gap-2 items-end">
          <div>
            <label className="mono text-[8px] tracking-widest block mb-1" style={{ color: 'var(--tx-muted)' }}>START TIME</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inp} style={inpStyle} />
          </div>
          <div>
            <label className="mono text-[8px] tracking-widest block mb-1" style={{ color: 'var(--tx-muted)' }}>DURATION</label>
            <div className="flex gap-1">
              {[25, 45, 60, 90].map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className="flex-1 py-2 mono text-[8px] transition-all"
                  style={{ background: duration === d ? 'rgba(212,245,60,0.1)' : 'var(--bg-raised)', border: `1px solid ${duration === d ? 'var(--acid)' : 'var(--border-dim)'}`, color: duration === d ? 'var(--acid)' : 'var(--tx-ghost)' }}>
                  {d}m
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mono text-[8px] tracking-widest block mb-1" style={{ color: 'var(--tx-muted)' }}>ENDS AT</label>
            <div className="px-2.5 py-2 mono text-sm" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', color: 'var(--tx-muted)' }}>{endTime}</div>
          </div>
        </div>

        {/* Custom duration slider */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="mono text-[8px]" style={{ color: 'var(--tx-muted)' }}>CUSTOM DURATION</label>
            <span className="mono text-[9px] font-bold" style={{ color: 'var(--acid)' }}>{duration}m</span>
          </div>
          <input type="range" min={10} max={180} step={5} value={duration} onChange={e => setDuration(+e.target.value)} className="w-full" />
        </div>

        <div className="flex items-center gap-2 pt-1 px-2 py-2"
          style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <Link2 className="w-3 h-3 shrink-0" style={{ color: '#60a5fa' }} />
          <p className="mono text-[8px]" style={{ color: '#60a5fa' }}>
            Saving will sync this task's time slot to your Day Planner automatically.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({
  task, onToggle, onDelete, onUpdate
}: {
  task: Task; onToggle: () => void; onDelete: () => void; onUpdate: (updates: Partial<Task>) => void;
}) {
  const theme = getPillarTheme(task.pillarId);
  const done = task.status === 'completed';
  const [editing, setEditing] = useState(false);

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <div className="transition-all"
        style={{
          background: 'var(--bg-raised)',
          border: `1px solid ${done ? 'var(--border-dim)' : theme.border}`,
          borderLeft: `3px solid ${done ? 'var(--border-mid)' : theme.accent}`,
          opacity: done ? 0.6 : 1,
        }}>
        <div className="flex items-start gap-3 p-4 group">
          {/* Complete toggle */}
          <button onClick={onToggle}
            className="mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center transition-all"
            style={{ background: done ? theme.accent : 'transparent', border: `1px solid ${done ? theme.accent : 'var(--border-mid)'}` }}>
            {done && <span style={{ color: 'var(--bg-void)', fontSize: 9, fontWeight: 'bold' }}>✓</span>}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${done ? 'line-through' : ''}`}
              style={{ color: done ? 'var(--tx-muted)' : 'var(--tx-primary)' }}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--tx-muted)' }}>{task.description}</p>
            )}

            {/* Time slot display */}
            {task.startTime && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 w-fit"
                style={{ background: `${theme.accent}10`, border: `1px solid ${theme.accent}25` }}>
                <Clock className="w-2.5 h-2.5" style={{ color: theme.accent }} />
                <span className="mono text-[9px] font-bold" style={{ color: theme.accent }}>
                  {task.startTime} → {task.endTime ?? minsToTime(timeToMins(task.startTime) + task.estimatedMinutes)}
                </span>
                <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>
                  · {task.estimatedMinutes >= 60 ? `${Math.floor(task.estimatedMinutes/60)}h${task.estimatedMinutes%60>0?task.estimatedMinutes%60+'m':''}` : `${task.estimatedMinutes}m`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2.5 mt-2 flex-wrap">
              <span className="mono text-[9px] px-1.5 py-0.5"
                style={{ color: theme.accent, background: theme.bg, border: `1px solid ${theme.border}` }}>
                {task.pillarId}
              </span>
              {!task.startTime && (
                <span className="mono text-[9px] flex items-center gap-1" style={{ color: 'var(--tx-ghost)' }}>
                  <Clock className="w-2.5 h-2.5" />{task.estimatedMinutes}m · no time slot
                </span>
              )}
              {task.isAIGenerated && (
                <span className="mono text-[9px] flex items-center gap-1" style={{ color: 'var(--acid)', opacity: 0.7 }}>
                  <Zap className="w-2.5 h-2.5" />AI
                </span>
              )}
              {task.aiContext && (
                <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>· {task.aiContext.slice(0, 40)}...</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(!editing)}
              className="p-1.5 transition-all opacity-0 group-hover:opacity-100"
              style={{ color: 'var(--tx-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--acid)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx-muted)')}>
              {editing ? <ChevronUp className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onDelete}
              className="p-1.5 transition-all opacity-0 group-hover:opacity-100"
              style={{ color: 'var(--tx-ghost)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ff4444')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx-ghost)')}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline editor */}
        <AnimatePresence>
          {editing && (
            <div className="px-4 pb-4">
              <TaskEditor task={task} onSave={onUpdate} onClose={() => setEditing(false)} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Tasks page ──────────────────────────────────────────────────────────
export default function Tasks() {
  const { dailyData, toggleTask, deleteTask, addTask, updateTask, generateTasks, dailyLoading, goals } = useStore();
  const [pillarFilter, setPillarFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPillar, setNewPillar] = useState('BUILD');
  const [newDesc, setNewDesc] = useState('');
  const [newMins, setNewMins] = useState(30);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [showGoalSpread, setShowGoalSpread] = useState(false);
  const [now] = useState(() => Date.now());

  // Compute goal stats BEFORE early return
  const goalStats = useMemo(() => {
    return goals.map(goal => ({
      goal,
      theme: getPillarTheme(goal.pillarId),
      daysLeft: Math.ceil((new Date(goal.targetDate).getTime() - now) / 86400000),
      tasksNeeded: Math.ceil((100 - goal.progress) / 5),
    }));
  }, [goals, now]);

  if (!dailyData) return null;

  const tasks = dailyData.tasks.filter(t => {
    const pOk = pillarFilter === 'ALL' || t.pillarId === pillarFilter;
    const sOk = statusFilter === 'all' || t.status === statusFilter;
    return pOk && sOk;
  });

  // Calculate timeline coverage
  const scheduledMins = dailyData.tasks.filter(t => t.startTime).reduce((s, t) => s + t.estimatedMinutes, 0);
  const unscheduledCount = dailyData.tasks.filter(t => !t.startTime).length;

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const endMins = timeToMins(newStartTime) + newMins;
    addTask({
      pillarId: newPillar, title: newTitle, description: newDesc,
      estimatedMinutes: newMins, status: 'pending', isAIGenerated: false,
      dateKey: format(new Date(), 'yyyy-MM-dd'),
      startTime: newStartTime,
      endTime: minsToTime(endMins),
    });
    setNewTitle(''); setNewDesc(''); setShowModal(false);
  };

  const inp = "w-full px-3 py-2.5 text-sm outline-none transition-all";
  const inpStyle = { background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-6 pb-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>
            {format(new Date(), 'EEE MMM d').toUpperCase()} · TASK BOARD
          </p>
          <h1 className="text-2xl font-black">Tasks</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm" style={{ color: 'var(--tx-secondary)' }}>
              {dailyData.tasks.filter(t => t.status === 'completed').length}/{dailyData.tasks.length} completed
            </p>
            {scheduledMins > 0 && (
              <span className="mono text-[9px] px-2 py-0.5 flex items-center gap-1"
                style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <Clock className="w-2.5 h-2.5" />
                {Math.floor(scheduledMins/60)}h{scheduledMins%60>0?` ${scheduledMins%60}m`:''} scheduled in planner
              </span>
            )}
            {unscheduledCount > 0 && (
              <span className="mono text-[9px] px-2 py-0.5" style={{ color: '#f5c842', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)' }}>
                {unscheduledCount} without time slot
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => generateTasks()} disabled={dailyLoading}
            className="flex items-center gap-2 px-3 py-2 mono text-[9px] tracking-widest transition-all disabled:opacity-40"
            style={{ background: 'rgba(212,245,60,0.06)', border: '1px solid rgba(212,245,60,0.2)', color: 'var(--acid)' }}>
            <RefreshCw className={`w-3 h-3 ${dailyLoading ? 'animate-spin' : ''}`} />
            {dailyLoading ? 'GENERATING...' : 'AI GENERATE'}
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 mono text-[9px] tracking-widest font-bold"
            style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
            <Plus className="w-3 h-3" /> ADD TASK
          </button>
        </div>
      </motion.div>

      {/* Goal-to-task spread banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
        className="mb-5 p-4 flex items-start gap-3"
        style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.2)', borderLeft: '2px solid #60a5fa' }}>
        <Link2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#60a5fa' }} />
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--tx-primary)' }}>Goal-to-Task Intelligence</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--tx-secondary)' }}>
            Ryna spreads your {goals.length} active goals across daily tasks — balancing workload, respecting sleep (6–8h), and building toward your 90-day targets without overworking you. Each task is allocated a Pomodoro-style time slot in the planner.
          </p>
        </div>
        <button onClick={() => setShowGoalSpread(!showGoalSpread)}
          className="mono text-[9px] px-2.5 py-1.5 shrink-0 transition-all"
          style={{ border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
          {showGoalSpread ? 'HIDE' : 'VIEW SPREAD'}
        </button>
      </motion.div>

      <AnimatePresence>
        {showGoalSpread && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5">
            <div className="p-4 space-y-3" style={{ background: 'var(--bg-raised)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <p className="mono text-[9px] tracking-widest font-bold" style={{ color: '#60a5fa' }}>GOAL TASK SPREAD — THIS WEEK</p>
              <div className="grid grid-cols-2 gap-2">
                {goalStats.map(({ goal, theme, daysLeft, tasksNeeded }) => (
                    <div key={goal.id} className="p-3" style={{ background: 'var(--bg-overlay)', border: `1px solid ${theme.border}`, borderLeft: `2px solid ${theme.accent}` }}>
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--tx-primary)' }}>{goal.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="mono text-[8px]" style={{ color: theme.accent }}>{goal.progress}% done</span>
                        <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>{daysLeft}d left</span>
                      </div>
                      <div className="mt-1.5 h-1" style={{ background: 'var(--border-dim)' }}>
                        <div className="h-full transition-all" style={{ width: `${goal.progress}%`, background: theme.accent }} />
                      </div>
                      <p className="mono text-[8px] mt-1.5" style={{ color: 'var(--tx-ghost)' }}>
                        ~{Math.min(tasksNeeded, 3)} tasks/day needed to stay on track
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pillar summary */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="grid grid-cols-4 gap-2 mb-5">
        {DEFAULT_PILLARS.map(p => {
          const theme = getPillarTheme(p.id);
          const pts = dailyData.tasks.filter(t => t.pillarId === p.id);
          const d = pts.filter(t => t.status === 'completed').length;
          const pct = pts.length > 0 ? Math.round((d / pts.length) * 100) : 0;
          const totalMins = pts.reduce((s, t) => s + t.estimatedMinutes, 0);
          return (
            <button key={p.id} onClick={() => setPillarFilter(pillarFilter === p.id ? 'ALL' : p.id)}
              className="p-3 text-left transition-all"
              style={{ background: pillarFilter === p.id ? theme.bg : 'var(--bg-raised)', border: `1px solid ${pillarFilter === p.id ? theme.border : 'var(--border-dim)'}`, borderTop: `2px solid ${pillarFilter === p.id ? theme.accent : 'var(--border-dim)'}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="mono text-[10px] font-bold tracking-widest" style={{ color: pillarFilter === p.id ? theme.accent : 'var(--tx-secondary)' }}>{p.label}</span>
                <span className="mono text-[9px]" style={{ color: theme.accent }}>{d}/{pts.length}</span>
              </div>
              <SegBar value={pct} color={theme.accent} segments={8} height={3} />
              <p className="mono text-[8px] mt-1.5" style={{ color: 'var(--tx-ghost)' }}>
                {Math.floor(totalMins/60)}h{totalMins%60>0?` ${totalMins%60}m`:''} total
              </p>
            </button>
          );
        })}
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {STATUS_OPTS.map(({ v, label }) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className="mono text-[9px] px-3 py-1.5 tracking-widest transition-all"
            style={{ background: statusFilter === v ? 'rgba(212,245,60,0.08)' : 'var(--bg-raised)', border: `1px solid ${statusFilter === v ? 'var(--acid)' : 'var(--border-dim)'}`, color: statusFilter === v ? 'var(--acid)' : 'var(--tx-muted)' }}>
            {label}
          </button>
        ))}
        <span className="ml-auto mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>{tasks.length} TASKS · CLICK TO EDIT TIME</span>
      </div>

      {/* Task list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-2">
        <AnimatePresence>
          {tasks.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              onToggle={() => toggleTask(t.id)}
              onDelete={() => deleteTask(t.id)}
              onUpdate={(updates) => updateTask(t.id, updates)}
            />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="py-16 text-center" style={{ border: '1px solid var(--border-dim)' }}>
            <p className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-ghost)' }}>NO TASKS MATCH FILTERS</p>
            <button onClick={() => { setPillarFilter('ALL'); setStatusFilter('all'); }}
              className="mono text-[9px] mt-3 underline" style={{ color: 'var(--acid)' }}>CLEAR FILTERS</button>
          </div>
        )}
      </motion.div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md p-6 space-y-4"
              style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>
              <div className="flex items-center justify-between">
                <p className="mono text-[10px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>// ADD TASK</p>
                <button onClick={() => setShowModal(false)} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
              </div>

              {/* Pillar */}
              <div className="space-y-1.5">
                <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>PILLAR</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DEFAULT_PILLARS.map(p => {
                    const theme = getPillarTheme(p.id);
                    return (
                      <button key={p.id} onClick={() => setNewPillar(p.id)}
                        className="py-2 mono text-[9px] tracking-widest font-bold transition-all"
                        style={{ background: newPillar === p.id ? theme.bg : 'var(--bg-raised)', border: `1px solid ${newPillar === p.id ? theme.accent : 'var(--border-dim)'}`, color: newPillar === p.id ? theme.accent : 'var(--tx-muted)' }}>
                        {p.label.toUpperCase().slice(0,4)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>TITLE *</label>
                <input autoFocus type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="What needs to be done?"
                  className={inp} style={{ ...inpStyle, borderColor: 'var(--acid)' }} />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>DESCRIPTION</label>
                <textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="Optional context..."
                  className="w-full px-3 py-2 text-sm outline-none resize-none"
                  style={inpStyle} />
              </div>

              {/* Time allocation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>START TIME</label>
                  <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)}
                    className={inp} style={inpStyle} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>DURATION</label>
                    <span className="mono text-[9px]" style={{ color: 'var(--acid)' }}>{newMins}m</span>
                  </div>
                  <input type="range" min={5} max={180} step={5} value={newMins} onChange={e => setNewMins(+e.target.value)} className="w-full mt-3" />
                </div>
              </div>

              {/* Pomodoro presets */}
              <div className="space-y-1.5">
                <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>POMODORO PRESETS</label>
                <div className="flex gap-2">
                  {[{ mins: 25, label: '25m Pomodoro' }, { mins: 45, label: '45m Focus' }, { mins: 60, label: '1h Deep' }, { mins: 90, label: '90m Flow' }].map(p => (
                    <button key={p.mins} onClick={() => setNewMins(p.mins)}
                      className="flex-1 py-2 mono text-[8px] flex items-center justify-center gap-1 transition-all"
                      style={{ background: newMins === p.mins ? 'rgba(212,245,60,0.1)' : 'var(--bg-raised)', border: `1px solid ${newMins === p.mins ? 'var(--acid)' : 'var(--border-dim)'}`, color: newMins === p.mins ? 'var(--acid)' : 'var(--tx-ghost)' }}>
                      <Timer className="w-2.5 h-2.5" />{p.mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 px-2 py-2" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <Link2 className="w-3 h-3 shrink-0" style={{ color: '#60a5fa' }} />
                <p className="mono text-[8px]" style={{ color: '#60a5fa' }}>This task will be added to your Day Planner at the specified time.</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 mono text-[10px] tracking-widest"
                  style={{ border: '1px solid var(--border-mid)', color: 'var(--tx-muted)' }}>CANCEL</button>
                <button onClick={handleAdd}
                  className="flex-1 py-2.5 mono text-[10px] tracking-widest font-bold"
                  style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>ADD & SYNC TO PLANNER</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
