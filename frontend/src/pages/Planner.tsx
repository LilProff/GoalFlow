import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Bell, RefreshCw, Zap, Moon, Dumbbell, BookOpen,
  Car, Coffee, Briefcase, Clock, AlertTriangle, CheckCircle2,
  Play, SkipForward, Plus, X, Edit3, Save, Trash2, Timer, Link2, BarChart3
} from 'lucide-react';
import { useStore, minsToTime, timeToMins } from '../lib/store';
import type { TimeBlock, BlockCategory } from '../types';

// ─── Category config ──────────────────────────────────────────────────────────
const CAT: Record<BlockCategory, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  sleep:    { color:'#64748B', bg:'rgba(100,116,139,0.08)', border:'rgba(100,116,139,0.25)', icon:Moon,      label:'Sleep'      },
  spiritual:{ color:'#8B5CF6', bg:'rgba(139,92,246,0.07)',  border:'rgba(139,92,246,0.22)',  icon:BookOpen,  label:'Spiritual'  },
  exercise: { color:'#F97316', bg:'rgba(249,115,22,0.08)',  border:'rgba(249,115,22,0.25)', icon:Dumbbell,  label:'Exercise'   },
  transit:  { color:'#a78bfa', bg:'rgba(167,139,250,0.08)', border:'rgba(167,139,250,0.25)',icon:Car,       label:'Transit'    },
  deepwork: { color:'#F97316', bg:'rgba(249,115,22,0.1)',   border:'rgba(249,115,22,0.3)',  icon:Briefcase, label:'Deep Work'  },
  meals:    { color:'#FACC15', bg:'rgba(250,204,21,0.07)',  border:'rgba(250,204,21,0.22)', icon:Coffee,    label:'Meals'      },
  admin:    { color:'#94a3b8', bg:'rgba(148,163,184,0.07)', border:'rgba(148,163,184,0.2)', icon:Clock,     label:'Admin'      },
  show:     { color:'#14B8A6', bg:'rgba(20,184,166,0.08)',   border:'rgba(20,184,166,0.25)',  icon:Zap,       label:'Show'       },
  earn:     { color:'#FACC15', bg:'rgba(250,204,21,0.08)',  border:'rgba(250,204,21,0.25)', icon:Zap,       label:'Earn'       },
  buffer:   { color:'#475569', bg:'rgba(71,85,105,0.06)',   border:'rgba(71,85,105,0.18)',  icon:Coffee,    label:'Buffer'     },
  personal: { color:'#c084fc', bg:'rgba(192,132,252,0.07)', border:'rgba(192,132,252,0.22)',icon:BookOpen,  label:'Personal'   },
  learning: { color:'#60a5fa', bg:'rgba(96,165,250,0.08)',  border:'rgba(96,165,250,0.25)', icon:BookOpen,  label:'Learning'   },
  social:   { color:'#14B8A6', bg:'rgba(20,184,166,0.07)',   border:'rgba(20,184,166,0.2)',   icon:Zap,       label:'Social'     },
  health:   { color:'#34d399', bg:'rgba(52,211,153,0.07)',  border:'rgba(52,211,153,0.2)',  icon:Dumbbell,  label:'Health'     },
  work:     { color:'#64748B', bg:'rgba(100,116,139,0.08)', border:'rgba(100,116,139,0.25)',icon:Briefcase, label:'Work'       },
};

const MINS_PER_PX = 2; // 1px = 2 minutes → 720px for 24h
const TOTAL_H = (24 * 60) / MINS_PER_PX; // 720px

function nowMins() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }

// ─── Inline block editor ──────────────────────────────────────────────────────
function BlockEditor({
  block, onSave, onDelete, onClose
}: {
  block: TimeBlock;
  onSave: (updates: Partial<TimeBlock>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(block.label);
  const [startTime, setStartTime] = useState(minsToTime(block.startMinute));
  const [duration, setDuration] = useState(block.durationMinutes);
  const [category, setCategory] = useState<BlockCategory>(block.category);
  const [flexible, setFlexible] = useState(block.flexible);
  const [notes, setNotes] = useState(block.notes ?? '');
  const [assignedBy, setAssignedBy] = useState(block.assignedBy ?? '');

  const endTime = minsToTime(timeToMins(startTime) + duration);
  const isTaskBlock = block.id.startsWith('task-');

  const handleSave = () => {
    onSave({
      label,
      startMinute: timeToMins(startTime),
      durationMinutes: duration,
      category,
      flexible,
      notes,
      assignedBy: flexible ? undefined : (assignedBy.trim() || undefined),
    });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="p-4 space-y-3"
      style={{ background: 'var(--bg-overlay)', border: `1px solid ${CAT[category]?.border || 'var(--border-mid)'}`, borderTop: `2px solid ${CAT[category]?.color || 'var(--acid)'}` }}>

      <div className="flex items-center justify-between">
        <span className="mono text-[9px] tracking-widest font-bold" style={{ color: CAT[category]?.color || 'var(--acid)' }}>
          {isTaskBlock ? '⚡ TASK BLOCK' : 'EDIT BLOCK'}
        </span>
        <div className="flex gap-1">
          <button onClick={handleSave} className="flex items-center gap-1 mono text-[9px] px-2 py-1 font-bold" style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
            <Save className="w-3 h-3" /> SAVE
          </button>
          <button onClick={onClose} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>LABEL</label>
        <input value={label} onChange={e => setLabel(e.target.value)}
          className="w-full px-2.5 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--acid)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-mid)')} />
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>START TIME</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full px-2.5 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' }} />
        </div>
        <div className="space-y-1">
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>END (auto)</label>
          <div className="px-2.5 py-2 text-sm mono" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', color: 'var(--tx-muted)' }}>{endTime}</div>
        </div>
      </div>

      {/* Duration slider */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>DURATION</label>
          <span className="mono text-[9px] font-bold" style={{ color: 'var(--acid)' }}>
            {duration >= 60 ? `${Math.floor(duration/60)}h${duration%60>0?` ${duration%60}m`:''}` : `${duration}m`}
          </span>
        </div>
        <input type="range" min={10} max={240} step={5} value={duration} onChange={e => setDuration(+e.target.value)} className="w-full" />
        <div className="flex justify-between mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>
          <span>10m</span><span>1h</span><span>2h</span><span>4h</span>
        </div>
        {/* Pomodoro presets */}
        <div className="flex gap-1.5 mt-1">
          {[25, 45, 60, 90].map(d => (
            <button key={d} onClick={() => setDuration(d)}
              className="flex items-center gap-1 mono text-[8px] px-2 py-1 transition-all"
              style={{ background: duration === d ? 'rgba(139,92,246,0.1)' : 'var(--bg-raised)', border: `1px solid ${duration === d ? 'var(--acid)' : 'var(--border-dim)'}`, color: duration === d ? 'var(--acid)' : 'var(--tx-ghost)' }}>
              <Timer className="w-2.5 h-2.5" />{d}m
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      {!isTaskBlock && (
        <div className="space-y-1">
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>CATEGORY</label>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(CAT) as BlockCategory[]).map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className="mono text-[8px] px-2 py-1 transition-all"
                style={{ background: category === c ? `${CAT[c].color}20` : 'var(--bg-raised)', border: `1px solid ${category === c ? CAT[c].color : 'var(--border-dim)'}`, color: category === c ? CAT[c].color : 'var(--tx-ghost)' }}>
                {CAT[c].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Flexible toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--tx-secondary)' }}>AI can reshuffle this block</p>
          <p className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>Fixed blocks are never moved</p>
        </div>
        <button onClick={() => setFlexible(!flexible)}
          className="transition-colors"
          style={{ width: 36, height: 20, background: flexible ? 'var(--acid)' : 'var(--border-mid)', borderRadius: 10, position: 'relative' }}>
          <span style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, background: flexible ? 'var(--bg-void)' : 'var(--tx-muted)', borderRadius: '50%', transition: 'transform 0.2s', transform: flexible ? 'translateX(16px)' : 'none' }} />
        </button>
      </div>

      {/* Commitment: who assigned this fixed block (blank = self-scheduled) */}
      {!flexible && (
        <div className="space-y-1">
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>ASSIGNED BY (OPTIONAL)</label>
          <input value={assignedBy} onChange={e => setAssignedBy(e.target.value)} placeholder="e.g. Manager, Client, Self"
            className="w-full px-2.5 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' }} />
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>NOTES</label>
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context for this block..."
          className="w-full px-2.5 py-2 text-xs outline-none resize-none"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', color: 'var(--tx-secondary)' }}
          onFocus={e => (e.target.style.borderColor = 'var(--acid)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
      </div>

      {block.userEditable && (
        <button onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 py-2 mono text-[9px] tracking-widest transition-all"
          style={{ border: '1px solid rgba(255,68,68,0.25)', color: '#EF4444' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,68,68,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Trash2 className="w-3 h-3" /> DELETE BLOCK
        </button>
      )}
    </motion.div>
  );
}

// ─── Timeline block pill ──────────────────────────────────────────────────────
function BlockPill({
  block, isNow, isEditing, onClick
}: {
  block: TimeBlock; isNow: boolean; isEditing: boolean; onClick: () => void;
}) {
  const meta = CAT[block.category] ?? CAT.admin;
  const heightPx = Math.max(block.durationMinutes / MINS_PER_PX, 24);
  const Icon = meta.icon;
  const isTask = block.id.startsWith('task-');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: block.skipped ? 0.3 : 1, x: 0 }}
      onClick={onClick}
      className="absolute left-0 right-0 mx-1 cursor-pointer group overflow-hidden transition-all"
      style={{
        top: block.startMinute / MINS_PER_PX,
        height: heightPx,
        background: isEditing ? `${meta.color}18` : block.completed ? 'rgba(16,185,129,0.08)' : meta.bg,
        border: `1px solid ${isEditing ? meta.color : isNow ? meta.color : block.completed ? 'rgba(16,185,129,0.4)' : meta.border}`,
        borderLeft: `3px solid ${block.completed ? 'var(--success)' : meta.color}`,
        zIndex: isEditing ? 20 : isNow ? 10 : 1,
        boxShadow: isNow ? `0 0 14px ${meta.color}35` : isEditing ? `0 0 0 2px ${meta.color}40` : 'none',
      }}>
      <div className="flex items-center gap-1.5 px-2 h-full">
        <Icon className="w-3 h-3 shrink-0" style={{ color: block.completed ? 'var(--success)' : meta.color, opacity: 0.9 }} />
        {heightPx >= 28 && (
          <div className="flex-1 min-w-0">
            <p className="mono text-[9px] font-bold truncate leading-none"
              style={{ color: block.completed ? 'var(--success)' : meta.color }}>
              {block.label}
            </p>
            {heightPx >= 40 && (
              <p className="mono text-[8px] truncate mt-0.5" style={{ color: 'var(--tx-ghost)' }}>
                {minsToTime(block.startMinute)}–{minsToTime(block.startMinute + block.durationMinutes)}
                {' · '}{block.durationMinutes >= 60 ? `${Math.floor(block.durationMinutes/60)}h${block.durationMinutes%60>0?block.durationMinutes%60+'m':''}` : `${block.durationMinutes}m`}
              </p>
            )}
          </div>
        )}
        {block.completed && <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: 'var(--success)' }} />}
        {isTask && <Link2 className="w-2.5 h-2.5 shrink-0 opacity-50" style={{ color: meta.color }} />}
        {isNow && <span className="w-1.5 h-1.5 rounded-full shrink-0 pulse-dot" style={{ background: meta.color }} />}
        {block.userEditable && !isNow && (
          <Edit3 className="w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: meta.color }} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Add block form ───────────────────────────────────────────────────────────
function AddBlockForm({ onAdd, onClose }: { onAdd: (b: Omit<TimeBlock, 'id'>) => void; onClose: () => void }) {
  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [duration, setDuration] = useState(30);
  const [category, setCategory] = useState<BlockCategory>('buffer');
  const [isCommitment, setIsCommitment] = useState(false);
  const [assignedBy, setAssignedBy] = useState('');

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd({
      label, category,
      startMinute: timeToMins(startTime),
      durationMinutes: duration,
      completed: false, skipped: false,
      flexible: !isCommitment, priority: isCommitment ? 'fixed' : 'medium', userEditable: true,
      assignedBy: isCommitment ? (assignedBy.trim() || undefined) : undefined,
    });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-4 space-y-3 mb-3"
      style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>
      <div className="flex items-center justify-between">
        <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>// ADD BLOCK</span>
        <button onClick={onClose} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
      </div>
      <input placeholder="Block label..." value={label} onChange={e => setLabel(e.target.value)}
        className="w-full px-2.5 py-2 text-sm outline-none"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--acid)', color: 'var(--tx-primary)' }}
        autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      <div className="grid grid-cols-2 gap-2">
        <div><label className="mono text-[8px]" style={{ color: 'var(--tx-muted)' }}>START</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
            className="w-full px-2.5 py-2 text-sm outline-none mt-1"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' }} /></div>
        <div><label className="mono text-[8px]" style={{ color: 'var(--tx-muted)' }}>DURATION</label>
          <div className="flex gap-1 mt-1">
            {[15, 25, 30, 45, 60, 90].map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className="flex-1 py-1.5 mono text-[8px] transition-all"
                style={{ background: duration === d ? 'rgba(139,92,246,0.1)' : 'var(--bg-raised)', border: `1px solid ${duration === d ? 'var(--acid)' : 'var(--border-dim)'}`, color: duration === d ? 'var(--acid)' : 'var(--tx-ghost)' }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(CAT) as BlockCategory[]).slice(0, 8).map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className="mono text-[8px] px-2 py-1 transition-all"
            style={{ background: category === c ? `${CAT[c].color}20` : 'var(--bg-raised)', border: `1px solid ${category === c ? CAT[c].color : 'var(--border-dim)'}`, color: category === c ? CAT[c].color : 'var(--tx-ghost)' }}>
            {CAT[c].label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--tx-secondary)' }}>This is a commitment</p>
          <p className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>Fixed in place — Ryna never reshuffles it</p>
        </div>
        <button onClick={() => setIsCommitment(!isCommitment)}
          className="transition-colors"
          style={{ width: 36, height: 20, background: isCommitment ? 'var(--acid)' : 'var(--border-mid)', borderRadius: 10, position: 'relative' }}>
          <span style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, background: isCommitment ? 'var(--bg-void)' : 'var(--tx-muted)', borderRadius: '50%', transition: 'transform 0.2s', transform: isCommitment ? 'translateX(16px)' : 'none' }} />
        </button>
      </div>
      {isCommitment && (
        <input value={assignedBy} onChange={e => setAssignedBy(e.target.value)} placeholder="Assigned by (optional) — e.g. Manager, Client"
          className="w-full px-2.5 py-2 text-sm outline-none"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' }} />
      )}
      <button onClick={handleAdd} className="w-full py-2.5 mono text-[10px] tracking-widest font-bold" style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
        ADD TO PLANNER
      </button>
    </motion.div>
  );
}

// ─── Main Planner ─────────────────────────────────────────────────────────────
export default function Planner() {
  const {
    timeBlocks, toggleBlock, updateBlock, addBlock, deleteBlock,
    reshuffleDay, setChatOpen, plannerLoading, notifications, dismissNotification,
    addNotification, spreadGoalTasks,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(nowMins());
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  // Right panel (Day Score / Life Metrics / Ryna Says) is always visible
  // side-by-side on desktop; on mobile it'd crush the timeline to nothing,
  // so it's collapsed behind this toggle there instead.
  const [showStatsMobile, setShowStatsMobile] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNowMin(nowMins()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = Math.max(0, (nowMin / MINS_PER_PX) - 140);
    }
  }, [nowMin]);

  const currentBlock = timeBlocks.find(b => nowMin >= b.startMinute && nowMin < b.startMinute + b.durationMinutes);
  const nextBlock = timeBlocks.find(b => b.startMinute > nowMin && !b.completed && !b.skipped);
  const undismissed = notifications.filter(n => !n.dismissed);

  // Life metrics
  const sleepMins = timeBlocks.filter(b => b.category === 'sleep').reduce((s, b) => s + b.durationMinutes, 0);
  const spiritualMins = timeBlocks.filter(b => b.category === 'spiritual').reduce((s, b) => s + b.durationMinutes, 0);
  const exerciseMins = timeBlocks.filter(b => b.category === 'exercise').reduce((s, b) => s + b.durationMinutes, 0);
  const focusMins = timeBlocks.filter(b => ['deepwork','show','earn','learning'].includes(b.category)).reduce((s, b) => s + b.durationMinutes, 0);

  const done = timeBlocks.filter(b => b.completed).length;
  const total = timeBlocks.length;
  const accountabilityPct = total > 0 ? Math.round((done / total) * 100) : 0;

  // 24h allocation
  const allocByCategory = (Object.keys(CAT) as BlockCategory[]).map(cat => ({
    cat, mins: timeBlocks.filter(b => b.category === cat).reduce((s, b) => s + b.durationMinutes, 0),
    color: CAT[cat].color,
  })).filter(x => x.mins > 0).sort((a, b) => b.mins - a.mins);

  const handleBlockSave = (blockId: string, updates: Partial<TimeBlock>) => {
    updateBlock(blockId, updates);
    // Notify AI learned
    addNotification({ type: 'info', title: 'Ryna noted your edit', message: `Time preference saved. Ryna will apply this pattern to future day plans.`, time: format(new Date(), 'HH:mm') });
    setEditingId(null);
  };

  const handleReshuffle = async () => {
    await reshuffleDay();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 px-4 md:px-6 py-3 md:py-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-void)' }}>
        <div>
          <p className="mono text-[9px] tracking-widest mb-0.5" style={{ color: 'var(--tx-muted)' }}>
            {format(new Date(), 'EEEE, MMM d').toUpperCase()} · 24-HOUR EXECUTION PLAN
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-black">Day Planner</h1>
            {currentBlock && (
              <div className="flex items-center gap-2 px-2.5 py-1"
                style={{ background: CAT[currentBlock.category]?.bg, border: `1px solid ${CAT[currentBlock.category]?.border}` }}>
                <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: CAT[currentBlock.category]?.color }} />
                <span className="mono text-[9px] font-bold" style={{ color: CAT[currentBlock.category]?.color }}>
                  NOW: {currentBlock.label.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Icon-only under md (labels reappear at md:+) so 5 actions fit one row on mobile */}
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar">
          {/* Sync from goals */}
          <button onClick={spreadGoalTasks}
            className="shrink-0 flex items-center gap-1.5 px-2.5 md:px-3 py-2 mono text-[9px] tracking-widest transition-all"
            style={{ border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa', background: 'rgba(96,165,250,0.06)' }}>
            <Link2 className="w-3.5 h-3.5 md:w-3 md:h-3" /> <span className="hidden md:inline">SYNC GOALS</span>
          </button>

          {/* Notifications */}
          <button onClick={() => setShowNotifs(!showNotifs)}
            className="shrink-0 relative flex items-center gap-1.5 px-2.5 md:px-3 py-2 mono text-[9px] tracking-widest transition-all"
            style={{ border: '1px solid var(--border-mid)', color: undismissed.length ? '#FACC15' : 'var(--tx-muted)', background: undismissed.length ? 'rgba(250,204,21,0.06)' : 'transparent' }}>
            <Bell className="w-3.5 h-3.5" />
            {undismissed.length > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center mono text-[8px] font-black"
                style={{ background: '#FACC15', color: 'var(--bg-void)' }}>{undismissed.length}</span>
            )}
          </button>

          {/* Add block */}
          <button onClick={() => setShowAddBlock(true)}
            className="shrink-0 flex items-center gap-1.5 px-2.5 md:px-3 py-2 mono text-[9px] tracking-widest font-bold"
            style={{ border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)', background: 'var(--bg-raised)' }}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden md:inline">ADD BLOCK</span>
          </button>

          {/* AI Reshuffle */}
          <button onClick={handleReshuffle} disabled={plannerLoading}
            className="shrink-0 flex items-center gap-2 px-2.5 md:px-3 py-2 mono text-[9px] tracking-widest font-bold transition-all disabled:opacity-50"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', color: 'var(--acid)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${plannerLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{plannerLoading ? 'RESHUFFLING...' : 'AI RESHUFFLE'}</span>
          </button>

          {/* Ask Ryna */}
          <button onClick={() => setChatOpen(true)}
            className="shrink-0 flex items-center gap-2 px-2.5 md:px-3 py-2 mono text-[9px] tracking-widest font-bold"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--acid)' }}>
            <Zap className="w-3.5 h-3.5" /> <span className="hidden md:inline">ASK RYNA</span>
          </button>
        </div>
      </div>

      {/* ── Notification panel ── */}
      <AnimatePresence>
        {showNotifs && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0" style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border-dim)' }}>
            <div className="px-6 py-3 max-h-48 overflow-y-auto no-scrollbar space-y-2">
              <p className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--tx-muted)' }}>NOTIFICATIONS</p>
              {undismissed.length === 0 && (
                <p className="mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>ALL CLEAR · NO PENDING ALERTS</p>
              )}
              {undismissed.map(n => {
                const colors: Record<string, string> = { start:'var(--success)', end:'var(--warning)', warning:'var(--warning)', reshuffle:'var(--acid)', info:'var(--slate)', achievement:'var(--gold)', coach:'var(--acid)' };
                const icons: Record<string, React.ElementType> = { start:Play, end:SkipForward, warning:AlertTriangle, reshuffle:RefreshCw, info:Bell, achievement:CheckCircle2, coach:Zap };
                const Icon = icons[n.type] ?? Bell;
                return (
                  <div key={n.id} className="flex items-start gap-3 px-3 py-2.5"
                    style={{ background: 'var(--bg-overlay)', border: `1px solid ${colors[n.type]}25`, borderLeft: `2px solid ${colors[n.type]}` }}>
                    <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: colors[n.type] }} />
                    <div className="flex-1">
                      <p className="text-xs font-semibold" style={{ color: 'var(--tx-primary)' }}>{n.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--tx-secondary)' }}>{n.message}</p>
                      <p className="mono text-[8px] mt-0.5" style={{ color: 'var(--tx-ghost)' }}>{n.time}</p>
                    </div>
                    <button onClick={() => dismissNotification(n.id)} style={{ color: 'var(--tx-muted)' }}><X className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Body ── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* ── Timeline / List ── */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* View toggle + next block */}
          <div className="flex items-center gap-2 px-4 md:px-5 py-2.5 shrink-0 overflow-x-auto no-scrollbar" style={{ borderBottom: '1px solid var(--border-dim)' }}>
            <div className="flex gap-px shrink-0" style={{ border: '1px solid var(--border-dim)' }}>
              {(['timeline', 'list'] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className="mono text-[9px] px-3 py-1.5 tracking-widest capitalize transition-all"
                  style={{ background: viewMode === v ? 'var(--acid)' : 'var(--bg-raised)', color: viewMode === v ? 'var(--bg-void)' : 'var(--tx-muted)' }}>
                  {v.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Stats panel is docked beside the timeline on desktop — on
                mobile it's collapsed, this reveals it below instead. */}
            <button onClick={() => setShowStatsMobile(!showStatsMobile)}
              className="md:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 mono text-[9px] tracking-widest transition-all"
              style={{ border: `1px solid ${showStatsMobile ? 'var(--acid)' : 'var(--border-dim)'}`, background: showStatsMobile ? 'rgba(139,92,246,0.1)' : 'var(--bg-raised)', color: showStatsMobile ? 'var(--acid)' : 'var(--tx-muted)' }}>
              <BarChart3 className="w-3 h-3" /> STATS
            </button>

            {nextBlock && (
              <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 ml-2"
                style={{ border: '1px solid var(--border-dim)', background: 'var(--bg-raised)' }}>
                <span className="mono text-[8px]" style={{ color: 'var(--tx-muted)' }}>NEXT:</span>
                <span className="mono text-[9px] font-bold" style={{ color: CAT[nextBlock.category]?.color }}>
                  {nextBlock.label}
                </span>
                <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>@ {minsToTime(nextBlock.startMinute)}</span>
              </div>
            )}

            <span className="hidden lg:inline ml-auto shrink-0 mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>
              CLICK ANY BLOCK TO EDIT · AI LEARNS FROM YOUR EDITS
            </span>
          </div>

          {/* Add block form */}
          <AnimatePresence>
            {showAddBlock && (
              <div className="px-4 pt-3 shrink-0">
                <AddBlockForm onAdd={addBlock} onClose={() => setShowAddBlock(false)} />
              </div>
            )}
          </AnimatePresence>

          {viewMode === 'timeline' ? (
            /* ── 24h Timeline ── */
            <div ref={timelineRef} className="flex-1 overflow-y-auto no-scrollbar relative">
              <div className="relative ml-12 mr-2" style={{ height: TOTAL_H }}>
                {/* Hour lines */}
                {Array.from({ length: 25 }, (_, h) => (
                  <div key={h} className="absolute left-0 right-0 flex items-center pointer-events-none"
                    style={{ top: (h * 60) / MINS_PER_PX }}>
                    <span className="mono text-[8px] absolute -left-10 text-right w-8"
                      style={{ color: h < 6 || h >= 22 ? 'var(--tx-ghost)' : 'var(--tx-muted)' }}>
                      {String(h).padStart(2,'0')}:00
                    </span>
                    <div className="w-full h-px" style={{ background: h % 6 === 0 ? 'var(--border-mid)' : 'var(--border-dim)' }} />
                  </div>
                ))}

                {/* Now line */}
                <div className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
                  style={{ top: nowMin / MINS_PER_PX }}>
                  <span className="mono text-[8px] absolute -left-10 text-right w-8" style={{ color: 'var(--acid)' }}>
                    {minsToTime(nowMin)}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--acid)' }} />
                  <div className="w-2 h-2 rounded-full shrink-0 pulse-dot" style={{ background: 'var(--acid)' }} />
                </div>

                {/* Blocks */}
                {timeBlocks.map(b => (
                  <BlockPill
                    key={b.id}
                    block={b}
                    isNow={nowMin >= b.startMinute && nowMin < b.startMinute + b.durationMinutes}
                    isEditing={editingId === b.id}
                    onClick={() => setEditingId(editingId === b.id ? null : b.id)}
                  />
                ))}
              </div>

              {/* Inline editor overlay */}
              <AnimatePresence>
                {editingId && (() => {
                  const block = timeBlocks.find(b => b.id === editingId);
                  if (!block) return null;
                  const topPx = block.startMinute / MINS_PER_PX;
                  return (
                    <div className="absolute left-1 right-1 sm:left-auto sm:right-0 z-30 sm:w-72"
                      style={{ top: Math.min(topPx, TOTAL_H - 480), marginLeft: 4 }}>
                      <BlockEditor
                        block={block}
                        onSave={(updates) => handleBlockSave(editingId, updates)}
                        onDelete={() => { deleteBlock(editingId); setEditingId(null); }}
                        onClose={() => setEditingId(null)}
                      />
                    </div>
                  );
                })()}
              </AnimatePresence>
            </div>
          ) : (
            /* ── List view ── */
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-1.5">
              {timeBlocks.map(b => {
                const meta = CAT[b.category] ?? CAT.admin;
                const Icon = meta.icon;
                const isNow = nowMin >= b.startMinute && nowMin < b.startMinute + b.durationMinutes;
                const isTask = b.id.startsWith('task-');
                const isEditing = editingId === b.id;

                return (
                  <div key={b.id}>
                    <motion.div layout
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
                      onClick={() => setEditingId(isEditing ? null : b.id)}
                      style={{
                        background: isEditing ? `${meta.color}10` : b.completed ? 'rgba(16,185,129,0.05)' : isNow ? meta.bg : 'var(--bg-raised)',
                        border: `1px solid ${isEditing ? meta.color : isNow ? meta.color : b.completed ? 'rgba(16,185,129,0.3)' : 'var(--border-dim)'}`,
                        borderLeft: `3px solid ${b.completed ? 'var(--success)' : meta.color}`,
                        opacity: b.skipped ? 0.4 : 1,
                      }}>
                      <div className="w-16 shrink-0">
                        <p className="mono text-[9px] font-bold" style={{ color: isNow ? meta.color : 'var(--tx-muted)' }}>
                          {minsToTime(b.startMinute)}
                        </p>
                        <p className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>
                          {minsToTime(b.startMinute + b.durationMinutes)}
                        </p>
                      </div>
                      <Icon className="w-4 h-4 shrink-0" style={{ color: b.completed ? 'var(--success)' : meta.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: b.completed ? 'var(--success)' : 'var(--tx-primary)' }}>
                          {b.skipped ? <s>{b.label}</s> : b.label}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>
                            {b.durationMinutes >= 60 ? `${Math.floor(b.durationMinutes/60)}h${b.durationMinutes%60>0?b.durationMinutes%60+'m':''}` : `${b.durationMinutes}m`}
                          </span>
                          {b.flexible && <span className="mono text-[8px] px-1" style={{ color: 'var(--acid)', border: '1px solid rgba(139,92,246,0.2)' }}>FLEX</span>}
                          {!b.flexible && b.assignedBy && <span className="mono text-[8px] px-1" style={{ color: '#FACC15', border: '1px solid rgba(250,204,21,0.25)' }}>@ {b.assignedBy}</span>}
                          {isTask && <span className="mono text-[8px] px-1 flex items-center gap-0.5" style={{ color: meta.color, border: `1px solid ${meta.border}` }}><Link2 className="w-2 h-2" />TASK</span>}
                          {b.pillarId && <span className="mono text-[8px] px-1" style={{ color: meta.color, border: `1px solid ${meta.border}` }}>{b.pillarId}</span>}
                          {isNow && <span className="mono text-[8px] pulse-dot" style={{ color: meta.color }}>● NOW</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={e => { e.stopPropagation(); toggleBlock(b.id, 'completed'); }}
                          className="w-5 h-5 flex items-center justify-center transition-all"
                          style={{ background: b.completed ? 'var(--success)' : 'transparent', border: `1px solid ${b.completed ? 'var(--success)' : 'var(--border-mid)'}` }}>
                          {b.completed && <span style={{ color: 'var(--bg-void)', fontSize: 9, fontWeight: 'bold' }}>✓</span>}
                        </button>
                        <button onClick={e => { e.stopPropagation(); toggleBlock(b.id, 'skipped'); }}
                          className="mono text-[8px] px-1.5 py-0.5 transition-all"
                          style={{ color: b.skipped ? '#EF4444' : 'var(--tx-ghost)', border: `1px solid ${b.skipped ? '#EF444430' : 'var(--border-dim)'}` }}>
                          SKIP
                        </button>
                        {b.userEditable && <Edit3 className="w-3.5 h-3.5" style={{ color: 'var(--tx-muted)' }} />}
                      </div>
                    </motion.div>

                    {/* Inline editor in list view */}
                    <AnimatePresence>
                      {isEditing && (
                        <div className="mt-1 mb-1">
                          <BlockEditor
                            block={b}
                            onSave={(updates) => handleBlockSave(b.id, updates)}
                            onDelete={() => { deleteBlock(b.id); setEditingId(null); }}
                            onClose={() => setEditingId(null)}
                          />
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right Panel ── collapsed behind the STATS toggle on mobile (see
            showStatsMobile above); always visible side-by-side at md:+ */}
        <div className={`${showStatsMobile ? 'flex' : 'hidden'} md:flex w-full md:w-72 shrink-0 max-h-[50vh] md:max-h-none overflow-y-auto no-scrollbar flex-col border-t md:border-t-0 md:border-l border-[color:var(--border-dim)]`}
          style={{ background: 'var(--bg-void)' }}>

          {/* Accountability score */}
          <div className="p-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
            <p className="mono text-[9px] tracking-widest font-bold mb-3" style={{ color: 'var(--tx-muted)' }}>DAY SCORE</p>
            <div className="flex items-end gap-2 mb-2">
              <span className="mono text-4xl font-black" style={{ color: accountabilityPct >= 70 ? 'var(--success)' : accountabilityPct >= 40 ? 'var(--acid)' : 'var(--warning)' }}>
                {accountabilityPct}%
              </span>
              <span className="mono text-[9px] mb-1.5" style={{ color: 'var(--tx-muted)' }}>COMPLETE</span>
            </div>
            <div className="flex gap-0.5 h-2 mb-2">
              <div style={{ flex: done, background: 'var(--success)', minWidth: done > 0 ? 4 : 0 }} />
              <div style={{ flex: timeBlocks.filter(b=>b.skipped).length, background: '#EF444460', minWidth: 0 }} />
              <div style={{ flex: total - done - timeBlocks.filter(b=>b.skipped).length, background: 'var(--border-mid)' }} />
            </div>
            <div className="flex justify-between mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>
              <span>{done} done</span>
              <span>{timeBlocks.filter(b=>b.skipped).length} skipped</span>
              <span>{total - done - timeBlocks.filter(b=>b.skipped).length} left</span>
            </div>
          </div>

          {/* Life KPIs */}
          <div className="p-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
            <p className="mono text-[9px] tracking-widest font-bold mb-3" style={{ color: 'var(--tx-muted)' }}>LIFE METRICS</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label:'SLEEP',      value:`${Math.floor(sleepMins/60)}h`,  color:'#64748B', icon:Moon,      ok:sleepMins>=360 && sleepMins<=480, warn:sleepMins<360, note:sleepMins<360?'Too little':'OK' },
                { label:'SPIRITUAL',  value:`${spiritualMins}m`,             color:'#8B5CF6', icon:BookOpen,  ok:spiritualMins>=30, warn:spiritualMins===0, note:spiritualMins===0?'Missed':'OK' },
                { label:'EXERCISE',   value:`${exerciseMins}m`,              color:'#F97316', icon:Dumbbell,  ok:exerciseMins>=30, warn:exerciseMins===0, note:exerciseMins===0?'None':'OK' },
                { label:'FOCUS',      value:`${Math.floor(focusMins/60)}h${focusMins%60>0?focusMins%60+'m':''}`, color:'var(--acid)', icon:Briefcase, ok:focusMins>=120, warn:focusMins<60, note:focusMins<60?'Low':'OK' },
              ].map(({ label, value, color, icon: Icon, ok, warn }) => (
                <div key={label} className="p-2.5" style={{ background: 'var(--bg-raised)', border: `1px solid ${ok ? color+'30' : warn ? '#EF444430' : 'var(--border-dim)'}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <Icon className="w-3 h-3" style={{ color }} />
                    {ok ? <CheckCircle2 className="w-3 h-3" style={{ color: 'var(--success)' }} /> : <AlertTriangle className="w-3 h-3" style={{ color: warn ? 'var(--danger)' : 'var(--warning)' }} />}
                  </div>
                  <p className="mono text-sm font-black" style={{ color }}>{value}</p>
                  <p className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-ghost)' }}>{label}</p>
                </div>
              ))}
            </div>
            {sleepMins > 480 && (
              <p className="mono text-[8px] mt-2 px-2 py-1.5" style={{ color: '#FACC15', background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)' }}>
                ⚠ Sleep &gt;8h may reduce productive hours. Ryna can optimise.
              </p>
            )}
            {sleepMins < 360 && (
              <p className="mono text-[8px] mt-2 px-2 py-1.5" style={{ color: '#EF4444', background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)' }}>
                ⚠ Sleep &lt;6h detected. Performance will degrade. Ryna recommends 7h minimum.
              </p>
            )}
          </div>

          {/* 24h allocation */}
          <div className="p-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
            <p className="mono text-[9px] tracking-widest font-bold mb-3" style={{ color: 'var(--tx-muted)' }}>24H ALLOCATION</p>
            <div className="space-y-2">
              {allocByCategory.slice(0, 8).map(({ cat, mins, color }) => {
                const pct = (mins / 1440) * 100;
                return (
                  <div key={cat}>
                    <div className="flex justify-between mb-0.5">
                      <span className="mono text-[8px]" style={{ color }}>{CAT[cat].label.toUpperCase()}</span>
                      <span className="mono text-[8px]" style={{ color: 'var(--tx-muted)' }}>
                        {Math.floor(mins/60)}h{mins%60>0?` ${mins%60}m`:''} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full" style={{ background: 'var(--border-dim)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                        className="h-full" style={{ background: color, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ryna advice */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.4)' }}>
                <Zap className="w-3 h-3" style={{ color: 'var(--acid)' }} />
              </div>
              <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>RYNA SAYS</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>
              {plannerLoading
                ? 'Analysing your day and reshuffling blocks for optimal execution...'
                : editingId
                  ? 'Good — editing your schedule. Ryna will remember this preference for future planning.'
                  : currentBlock
                    ? currentBlock.category === 'deepwork'
                      ? `You're in Deep Work. Stay focused — this block is your highest-leverage time.`
                      : currentBlock.category === 'spiritual'
                        ? 'Spiritual time. Be fully present. This anchors everything else.'
                        : currentBlock.category === 'exercise'
                          ? 'Exercise block. Push through — this compounds over time.'
                          : `You're in ${currentBlock.label}. Complete it and move on.`
                    : nextBlock
                      ? `Next: ${nextBlock.label} at ${minsToTime(nextBlock.startMinute)}. Prepare now — transition with intention.`
                      : 'Day complete. Wind down and protect your sleep. Recovery is part of the system.'
              }
            </p>
            <button onClick={() => setChatOpen(true)}
              className="mt-3 w-full py-2 mono text-[9px] tracking-widest font-bold transition-all"
              style={{ border: '1px solid rgba(139,92,246,0.3)', color: 'var(--acid)', background: 'rgba(139,92,246,0.08)' }}>
              SOMETHING CAME UP? TELL RYNA →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
