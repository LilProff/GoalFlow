import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Trash2, Edit3, Star, Zap, RefreshCw, Upload, FileText,
  Check, Loader2, ChevronRight, AlertTriangle, Clock, CalendarDays, Target,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { DEFAULT_PILLARS } from '../lib/constants';
import type { Project, RoutineBlock, ProjectKind, CadenceType, SlotType, LifeStructureDraftProject, LifeStructureDraftRoutineBlock } from '../types';

const inp = "w-full px-3 py-2.5 text-sm outline-none transition-all";
const inpStyle = { background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' };

const KIND_LABELS: Record<ProjectKind, string> = {
  work: 'Work', startup: 'Startup', personal_build: 'Personal build', learning: 'Learning',
  content: 'Content', outreach: 'Outreach', health: 'Health', relationships: 'Relationships', other: 'Other',
};
const SLOT_LABELS: Record<SlotType, string> = {
  sleep: 'Sleep', routine: 'Routine', transit: 'Transit', deep_work: 'Deep work',
  open: 'Open', evening_build: 'Evening build', night_study: 'Night study', buffer: 'Buffer',
};
const SLOT_TYPES: SlotType[] = ['deep_work', 'open', 'evening_build', 'night_study', 'buffer', 'transit', 'routine'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function minsToClock(m: number): string {
  const h = Math.floor(m / 60) % 24, mm = m % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')}${period}`;
}

function cadenceLabel(p: { cadenceType: CadenceType; sessionsPerWeek: number; cadenceDays: number[] }): string {
  if (p.cadenceType === 'daily') return 'Daily';
  if (p.cadenceType === 'fixed_day') return p.cadenceDays.map(d => DAY_LABELS[d]).join('/') || 'Fixed day';
  if (p.cadenceType === 'weekly') return `${p.sessionsPerWeek}x/week`;
  return 'Flexible';
}

// ─── Next-action banner ─────────────────────────────────────────────────────
function NextActionBanner() {
  const { nextAction, nextActionLoading, loadNextAction } = useStore();
  useEffect(() => { loadNextAction(); }, [loadNextAction]);

  return (
    <div className="p-4 mb-5 flex items-center gap-4" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.25)', borderLeft: '3px solid var(--acid)' }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
        <Zap className="w-4 h-4" style={{ color: 'var(--acid)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="mono text-[9px] tracking-widest font-bold mb-0.5" style={{ color: 'var(--acid)' }}>
          RIGHT NOW · {nextAction?.slotLabel?.toUpperCase() ?? '—'}
        </p>
        {nextActionLoading ? (
          <p className="text-sm" style={{ color: 'var(--tx-muted)' }}>Working out what's next…</p>
        ) : (
          <p className="text-sm font-medium" style={{ color: 'var(--tx-primary)' }}>
            {nextAction?.recommendation ?? 'Set up your routine below so Ryna knows what each hour is for.'}
          </p>
        )}
      </div>
      <button onClick={() => loadNextAction()} disabled={nextActionLoading}
        className="shrink-0 p-2 transition-all disabled:opacity-50" style={{ color: 'var(--tx-muted)' }}>
        <RefreshCw className={`w-3.5 h-3.5 ${nextActionLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

// ─── Project card ───────────────────────────────────────────────────────────
function ProjectCard({ project, onEdit }: { project: Project; onEdit: () => void }) {
  const { deleteProject, logProjectUpdate, goals } = useStore();
  const linkedGoal = project.goalId ? goals.find(g => g.id === project.goalId) : undefined;
  const [logging, setLogging] = useState(false);
  const [note, setNote] = useState('');
  const [minutes, setMinutes] = useState(project.sessionMinutes);
  const [saving, setSaving] = useState(false);

  const theme = DEFAULT_PILLARS.find(p => p.id === project.pillarId);
  const color = theme?.color ?? '#8B5CF6';
  const target = project.sessionsTarget;
  const pct = target > 0 ? Math.min((project.sessionsThisWeek / target) * 100, 100) : 0;
  const behind = target > 0 && project.sessionsThisWeek < target;

  const handleLog = async () => {
    setSaving(true);
    try {
      await logProjectUpdate(project.id, { note: note || undefined, minutesSpent: minutes, countsAsSession: true });
      setNote(''); setLogging(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderTop: `2px solid ${color}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {project.isMainQuest && <Star className="w-3.5 h-3.5 shrink-0" style={{ color: '#FACC15', fill: '#FACC15' }} />}
            <p className="text-sm font-bold truncate" style={{ color: 'var(--tx-primary)' }}>{project.name}</p>
            <span className="mono text-[8px] px-1.5 py-0.5" style={{ background: `${color}20`, color }}>{KIND_LABELS[project.kind]}</span>
          </div>
          {project.description && <p className="text-xs mb-2" style={{ color: 'var(--tx-muted)' }}>{project.description}</p>}
          <div className="flex items-center gap-3 flex-wrap mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>
            <span className="flex items-center gap-1"><CalendarDays className="w-2.5 h-2.5" /> {cadenceLabel(project)}</span>
            <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {project.sessionMinutes}m/session</span>
            {project.slotTypes.length > 0 && <span>{project.slotTypes.map(s => SLOT_LABELS[s as SlotType] ?? s).join(', ')}</span>}
          </div>
          {linkedGoal && (
            <div className="mt-1.5 flex items-center gap-1 mono text-[9px]" style={{ color }}>
              <Target className="w-2.5 h-2.5" /> {linkedGoal.title}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} style={{ color: 'var(--tx-muted)' }}><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={() => deleteProject(project.id)} style={{ color: 'var(--tx-muted)' }}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {target > 0 && (
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span className="mono text-[8px]" style={{ color: behind ? '#FACC15' : 'var(--success)' }}>
              {project.sessionsThisWeek}/{target} SESSIONS THIS WEEK
            </span>
            {project.lastWorkedOn && <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>Last: {project.lastWorkedOn}</span>}
          </div>
          <div className="h-1.5 w-full" style={{ background: 'var(--border-dim)' }}>
            <div className="h-full transition-all" style={{ width: `${pct}%`, background: behind ? '#FACC15' : 'var(--success)' }} />
          </div>
        </div>
      )}

      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
        {!logging ? (
          <button onClick={() => setLogging(true)} className="mono text-[9px] tracking-widest flex items-center gap-1" style={{ color: 'var(--acid)' }}>
            <Plus className="w-3 h-3" /> LOG UPDATE
          </button>
        ) : (
          <div className="space-y-2">
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="What did you get done? (optional)"
              className="w-full px-2.5 py-2 text-xs outline-none resize-none" style={inpStyle} />
            <div className="flex items-center gap-2">
              <input type="number" value={minutes} onChange={e => setMinutes(+e.target.value)} min={0}
                className="w-20 px-2 py-1.5 text-xs outline-none" style={inpStyle} />
              <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>MIN</span>
              <button onClick={handleLog} disabled={saving}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 mono text-[9px] font-bold disabled:opacity-50" style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} SAVE
              </button>
              <button onClick={() => setLogging(false)} style={{ color: 'var(--tx-muted)' }}><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add/edit project form ──────────────────────────────────────────────────
function ProjectForm({ initial, onClose }: { initial?: Project; onClose: () => void }) {
  const { createProject, updateProject } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [pillarId, setPillarId] = useState(initial?.pillarId ?? 'BUILD');
  const [kind, setKind] = useState<ProjectKind>(initial?.kind ?? 'work');
  const [cadenceType, setCadenceType] = useState<CadenceType>(initial?.cadenceType ?? 'weekly');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(initial?.sessionsPerWeek ?? 2);
  const [cadenceDays, setCadenceDays] = useState<number[]>(initial?.cadenceDays ?? []);
  const [slotTypes, setSlotTypes] = useState<string[]>(initial?.slotTypes ?? []);
  const [sessionMinutes, setSessionMinutes] = useState(initial?.sessionMinutes ?? 60);
  const [isMainQuest, setIsMainQuest] = useState(initial?.isMainQuest ?? false);
  const [priority, setPriority] = useState(initial?.priority ?? 2);
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: number) => setCadenceDays(days => days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort());
  const toggleSlot = (s: string) => setSlotTypes(types => types.includes(s) ? types.filter(x => x !== s) : [...types, s]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), description: description.trim() || undefined, pillarId, kind,
        status: 'active' as const, cadenceType, sessionsPerWeek, cadenceDays, slotTypes,
        sessionMinutes, isMainQuest, priority,
      };
      if (initial) await updateProject(initial.id, payload);
      else await createProject(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-4 space-y-3 mb-4" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>
      <div className="flex items-center justify-between">
        <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>{initial ? '// EDIT PROJECT' : '// ADD PROJECT'}</span>
        <button onClick={onClose} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
      </div>

      <input placeholder="Project name — e.g. Ndara AI" value={name} onChange={e => setName(e.target.value)} className={inp} style={{ ...inpStyle, borderColor: 'var(--acid)' }} autoFocus />
      <textarea placeholder="What is this? (optional)" rows={2} value={description} onChange={e => setDescription(e.target.value)} className={`${inp} resize-none`} style={inpStyle} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>PILLAR</label>
          <select value={pillarId} onChange={e => setPillarId(e.target.value)} className={`${inp} mt-1`} style={inpStyle}>
            {DEFAULT_PILLARS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>KIND</label>
          <select value={kind} onChange={e => setKind(e.target.value as ProjectKind)} className={`${inp} mt-1`} style={inpStyle}>
            {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mono text-[8px] tracking-widest mb-1 block" style={{ color: 'var(--tx-muted)' }}>CADENCE</label>
        <div className="flex gap-1 mb-2">
          {(['daily', 'weekly', 'fixed_day', 'flexible'] as CadenceType[]).map(c => (
            <button key={c} onClick={() => setCadenceType(c)}
              className="flex-1 py-1.5 mono text-[8px] tracking-widest transition-all"
              style={{ background: cadenceType === c ? 'rgba(139,92,246,0.1)' : 'var(--bg-raised)', border: `1px solid ${cadenceType === c ? 'var(--acid)' : 'var(--border-dim)'}`, color: cadenceType === c ? 'var(--acid)' : 'var(--tx-ghost)' }}>
              {c.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
        {cadenceType === 'weekly' && (
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={21} value={sessionsPerWeek} onChange={e => setSessionsPerWeek(+e.target.value)} className="w-20 px-2 py-1.5 text-xs outline-none" style={inpStyle} />
            <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>SESSIONS / WEEK</span>
          </div>
        )}
        {cadenceType === 'fixed_day' && (
          <div className="flex gap-1">
            {DAY_LABELS.map((d, i) => (
              <button key={d} onClick={() => toggleDay(i)}
                className="flex-1 py-1.5 mono text-[8px] transition-all"
                style={{ background: cadenceDays.includes(i) ? 'rgba(139,92,246,0.1)' : 'var(--bg-raised)', border: `1px solid ${cadenceDays.includes(i) ? 'var(--acid)' : 'var(--border-dim)'}`, color: cadenceDays.includes(i) ? 'var(--acid)' : 'var(--tx-ghost)' }}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mono text-[8px] tracking-widest mb-1 block" style={{ color: 'var(--tx-muted)' }}>FITS INTO (leave blank for "anywhere")</label>
        <div className="flex flex-wrap gap-1">
          {SLOT_TYPES.map(s => (
            <button key={s} onClick={() => toggleSlot(s)}
              className="mono text-[8px] px-2 py-1 transition-all"
              style={{ background: slotTypes.includes(s) ? 'rgba(139,92,246,0.1)' : 'var(--bg-raised)', border: `1px solid ${slotTypes.includes(s) ? 'var(--acid)' : 'var(--border-dim)'}`, color: slotTypes.includes(s) ? 'var(--acid)' : 'var(--tx-ghost)' }}>
              {SLOT_LABELS[s].toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>SESSION LENGTH (MIN)</label>
          <input type="number" min={5} max={480} value={sessionMinutes} onChange={e => setSessionMinutes(+e.target.value)} className={`${inp} mt-1`} style={inpStyle} />
        </div>
        <div>
          <label className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>PRIORITY (1=HIGHEST)</label>
          <input type="number" min={1} max={5} value={priority} onChange={e => setPriority(+e.target.value)} className={`${inp} mt-1`} style={inpStyle} />
        </div>
      </div>

      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--tx-secondary)' }}>Main quest</p>
          <p className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>The one thing to protect first when the week is tight</p>
        </div>
        <button onClick={() => setIsMainQuest(!isMainQuest)} style={{ width: 36, height: 20, background: isMainQuest ? '#FACC15' : 'var(--border-mid)', borderRadius: 10, position: 'relative' }}>
          <span style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, background: isMainQuest ? 'var(--bg-void)' : 'var(--tx-muted)', borderRadius: '50%', transition: 'transform 0.2s', transform: isMainQuest ? 'translateX(16px)' : 'none' }} />
        </button>
      </div>

      <button onClick={handleSave} disabled={saving || !name.trim()} className="w-full py-2.5 mono text-[10px] tracking-widest font-bold disabled:opacity-50" style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
        {saving ? 'SAVING…' : initial ? 'SAVE CHANGES' : 'ADD PROJECT'}
      </button>
    </motion.div>
  );
}

// ─── Add/edit routine block form ────────────────────────────────────────────
function RoutineForm({ initial, onClose }: { initial?: RoutineBlock; onClose: () => void }) {
  const { createRoutineBlock, updateRoutineBlock } = useStore();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [start, setStart] = useState(initial ? minsToTimeInput(initial.startMinute) : '09:00');
  const [end, setEnd] = useState(initial ? minsToTimeInput(initial.endMinute) : '17:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
  const [slotType, setSlotType] = useState<SlotType>(initial?.slotType ?? 'open');
  const [isSchedulable, setIsSchedulable] = useState(initial?.isSchedulable ?? true);
  const [saving, setSaving] = useState(false);

  const toggleDay = (d: number) => setDaysOfWeek(days => days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort());
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  const handleSave = async () => {
    if (!label.trim()) return;
    const startMinute = toMin(start), endMinute = toMin(end);
    if (endMinute <= startMinute) return;
    setSaving(true);
    try {
      const payload = { label: label.trim(), startMinute, endMinute, daysOfWeek, slotType, isSchedulable, category: initial?.category ?? 'admin' };
      if (initial) await updateRoutineBlock(initial.id, payload);
      else await createRoutineBlock(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-4 space-y-3 mb-4" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>
      <div className="flex items-center justify-between">
        <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>{initial ? '// EDIT ROUTINE BLOCK' : '// ADD ROUTINE BLOCK'}</span>
        <button onClick={onClose} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
      </div>
      <input placeholder="Label — e.g. Deep work (day job)" value={label} onChange={e => setLabel(e.target.value)} className={inp} style={{ ...inpStyle, borderColor: 'var(--acid)' }} autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <div><label className="mono text-[8px]" style={{ color: 'var(--tx-muted)' }}>START</label><input type="time" value={start} onChange={e => setStart(e.target.value)} className={`${inp} mt-1`} style={inpStyle} /></div>
        <div><label className="mono text-[8px]" style={{ color: 'var(--tx-muted)' }}>END</label><input type="time" value={end} onChange={e => setEnd(e.target.value)} className={`${inp} mt-1`} style={inpStyle} /></div>
      </div>
      <div>
        <label className="mono text-[8px] tracking-widest mb-1 block" style={{ color: 'var(--tx-muted)' }}>DAYS</label>
        <div className="flex gap-1">
          {DAY_LABELS.map((d, i) => (
            <button key={d} onClick={() => toggleDay(i)} className="flex-1 py-1.5 mono text-[8px] transition-all"
              style={{ background: daysOfWeek.includes(i) ? 'rgba(139,92,246,0.1)' : 'var(--bg-raised)', border: `1px solid ${daysOfWeek.includes(i) ? 'var(--acid)' : 'var(--border-dim)'}`, color: daysOfWeek.includes(i) ? 'var(--acid)' : 'var(--tx-ghost)' }}>
              {d.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mono text-[8px] tracking-widest mb-1 block" style={{ color: 'var(--tx-muted)' }}>TYPE</label>
        <select value={slotType} onChange={e => setSlotType(e.target.value as SlotType)} className={inp} style={inpStyle}>
          {Object.entries(SLOT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--tx-secondary)' }}>Workable time</p>
          <p className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>Off for sleep/transit/prep — Ryna only schedules projects into "on" blocks</p>
        </div>
        <button onClick={() => setIsSchedulable(!isSchedulable)} style={{ width: 36, height: 20, background: isSchedulable ? 'var(--acid)' : 'var(--border-mid)', borderRadius: 10, position: 'relative' }}>
          <span style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, background: isSchedulable ? 'var(--bg-void)' : 'var(--tx-muted)', borderRadius: '50%', transition: 'transform 0.2s', transform: isSchedulable ? 'translateX(16px)' : 'none' }} />
        </button>
      </div>
      <button onClick={handleSave} disabled={saving || !label.trim()} className="w-full py-2.5 mono text-[10px] tracking-widest font-bold disabled:opacity-50" style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
        {saving ? 'SAVING…' : initial ? 'SAVE CHANGES' : 'ADD BLOCK'}
      </button>
    </motion.div>
  );
}

function minsToTimeInput(m: number): string {
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ─── Life-structure import panel ────────────────────────────────────────────
function LifeImportPanel({ onClose }: { onClose: () => void }) {
  const {
    lifeStructureDraft, lifeStructureLoading, lifeStructureError,
    submitLifeStructureImport, updateLifeStructureDraft, confirmLifeStructureImport,
  } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    try { await submitLifeStructureImport(file); } catch { /* lifeStructureError reflects it */ }
  };

  const handleConfirm = async () => {
    setConfirming(true); setConfirmError('');
    try {
      await confirmLifeStructureImport();
      onClose();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setConfirming(false);
    }
  };

  const removeProject = (draftId: string) => {
    if (!lifeStructureDraft) return;
    updateLifeStructureDraft({ ...lifeStructureDraft, projects: lifeStructureDraft.projects.filter(p => p.draftId !== draftId) });
  };
  const removeRoutine = (draftId: string) => {
    if (!lifeStructureDraft) return;
    updateLifeStructureDraft({ ...lifeStructureDraft, routineBlocks: lifeStructureDraft.routineBlocks.filter(r => r.draftId !== draftId) });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
        onClick={e => e.stopPropagation()} className="w-full max-w-2xl max-h-[85vh] overflow-y-auto no-scrollbar p-6"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>

        {!lifeStructureDraft ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>// IMPORT YOUR LIFE PLAN</p>
              <button onClick={onClose} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>
              Upload a document describing your daily routine and the ongoing work that fills it — Ryna extracts your
              routine blocks and cadenced projects from it. Nothing is saved until you review and confirm.
            </p>
            <input type="file" accept=".md,.txt,.docx" className="hidden" id="life-import-file"
              onChange={e => setFile(e.target.files?.[0] || null)} />
            <label htmlFor="life-import-file"
              className="w-full flex flex-col items-center gap-2 py-8 cursor-pointer transition-all"
              style={{ border: '1px dashed var(--border-mid)', background: 'var(--bg-overlay)' }}>
              <FileText className="w-6 h-6" style={{ color: file ? 'var(--acid)' : 'var(--tx-ghost)' }} />
              <span className="text-sm" style={{ color: file ? 'var(--tx-primary)' : 'var(--tx-muted)' }}>
                {file ? file.name : 'Click to choose a .md, .txt, or .docx file'}
              </span>
            </label>
            {lifeStructureError && <p className="text-xs" style={{ color: '#EF4444' }}>{lifeStructureError}</p>}
            <button onClick={handleUpload} disabled={!file || lifeStructureLoading}
              className="w-full flex items-center justify-center gap-2 py-3 font-bold text-sm disabled:opacity-50" style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
              {lifeStructureLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading your plan…</> : <><Upload className="w-4 h-4" /> Extract routine & projects</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>// REVIEW BEFORE SAVING</p>
              <button onClick={onClose} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            {lifeStructureDraft.summary && (
              <div className="p-3" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderLeft: '2px solid var(--acid)' }}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--acid)' }}>{lifeStructureDraft.summary}</p>
              </div>
            )}

            <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>
              ROUTINE ({lifeStructureDraft.routineBlocks.length})
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
              {lifeStructureDraft.routineBlocks.map((r: LifeStructureDraftRoutineBlock) => (
                <div key={r.draftId} className="flex items-center justify-between px-3 py-2 text-xs" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)' }}>
                  <span style={{ color: 'var(--tx-primary)' }}>{r.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>{minsToClock(r.startMinute)}–{minsToClock(r.endMinute)} · {r.daysOfWeek.map(d => DAY_LABELS[d]).join('')}</span>
                    <button onClick={() => removeRoutine(r.draftId)} style={{ color: 'var(--tx-muted)' }}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>

            <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>
              PROJECTS ({lifeStructureDraft.projects.length})
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
              {lifeStructureDraft.projects.map((p: LifeStructureDraftProject) => (
                <div key={p.draftId} className="px-3 py-2" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: 'var(--tx-primary)' }}>{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="mono text-[8px]" style={{ color: 'var(--acid)' }}>{cadenceLabel(p)}</span>
                      <button onClick={() => removeProject(p.draftId)} style={{ color: 'var(--tx-muted)' }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {p.needsClarification && (
                    <p className="mono text-[8px] mt-1 flex items-center gap-1" style={{ color: '#FACC15' }}>
                      <AlertTriangle className="w-2.5 h-2.5" /> {p.needsClarification}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {lifeStructureDraft.openQuestions.length > 0 && (
              <div className="p-3" style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.25)' }}>
                <p className="mono text-[8px] tracking-widest mb-1.5" style={{ color: '#FACC15' }}>WORTH CONFIRMING</p>
                <ul className="space-y-1">
                  {lifeStructureDraft.openQuestions.map((q, i) => (
                    <li key={i} className="text-xs" style={{ color: 'var(--tx-secondary)' }}>· {q}</li>
                  ))}
                </ul>
              </div>
            )}

            {confirmError && <p className="text-xs" style={{ color: '#EF4444' }}>{confirmError}</p>}
            <button onClick={handleConfirm} disabled={confirming}
              className="w-full flex items-center justify-center gap-2 py-3 font-bold text-sm disabled:opacity-50" style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
              {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Confirm & add <Zap className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Projects() {
  const { projects, routineBlocks, loadProjects, loadRoutine, planWeek, weekPlanLoading, weekPlanError, weekPlan, clearLifeStructureDraft } = useStore();
  const [tab, setTab] = useState<'projects' | 'routine'>('projects');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineBlock | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [weekPlanned, setWeekPlanned] = useState(false);

  useEffect(() => { loadProjects(); loadRoutine(); }, [loadProjects, loadRoutine]);

  const handlePlanWeek = async () => {
    setWeekPlanned(false);
    try { await planWeek(); setWeekPlanned(true); } catch { /* weekPlanError reflects it */ }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 pb-5 flex items-start justify-between flex-wrap gap-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>ONGOING WORK · CADENCE · WEEKLY CONTAINER</p>
          <h1 className="text-2xl font-black">Projects</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { clearLifeStructureDraft(); setShowImport(true); }}
            className="flex items-center gap-1.5 px-3 py-2 mono text-[9px] tracking-widest font-bold" style={{ border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)', background: 'var(--bg-raised)' }}>
            <Upload className="w-3.5 h-3.5" /> IMPORT LIFE PLAN
          </button>
          <button onClick={handlePlanWeek} disabled={weekPlanLoading}
            className="flex items-center gap-2 px-3 py-2 mono text-[9px] tracking-widest font-bold transition-all disabled:opacity-50" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--acid)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${weekPlanLoading ? 'animate-spin' : ''}`} /> {weekPlanLoading ? 'PLANNING…' : 'PLAN MY WEEK'}
          </button>
        </div>
      </motion.div>

      <NextActionBanner />

      {weekPlanError && (
        <div className="p-3 mb-4 text-xs" style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.25)', color: '#EF4444' }}>{weekPlanError}</div>
      )}
      {weekPlanned && weekPlan && (
        <div className="p-3 mb-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <p className="text-xs" style={{ color: 'var(--success)' }}>
            Week planned from {weekPlan.weekStart}{weekPlan.protectedMainQuest && ` — ${weekPlan.protectedMainQuest} protected as main quest`}.
            {' '}Open <a href="/planner" className="underline">Planner</a> to see today, or check other days from there.
          </p>
          {weekPlan.atRiskProjects.length > 0 && (
            <p className="mono text-[9px] mt-1.5 flex items-center gap-1" style={{ color: '#FACC15' }}>
              <AlertTriangle className="w-3 h-3" /> Couldn't fit this week: {weekPlan.atRiskProjects.join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-px mb-4" style={{ border: '1px solid var(--border-dim)', width: 'fit-content' }}>
        {(['projects', 'routine'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="mono text-[9px] px-4 py-2 tracking-widest capitalize transition-all"
            style={{ background: tab === t ? 'var(--acid)' : 'var(--bg-raised)', color: tab === t ? 'var(--bg-void)' : 'var(--tx-muted)' }}>
            {t.toUpperCase()} {t === 'projects' ? `(${projects.length})` : `(${routineBlocks.length})`}
          </button>
        ))}
      </div>

      {tab === 'projects' ? (
        <div className="space-y-3">
          <AnimatePresence>
            {(showProjectForm || editingProject) && (
              <ProjectForm initial={editingProject ?? undefined} onClose={() => { setShowProjectForm(false); setEditingProject(null); }} />
            )}
          </AnimatePresence>
          {!showProjectForm && !editingProject && (
            <button onClick={() => setShowProjectForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 mono text-[9px] tracking-widest font-bold mb-1" style={{ border: '1px dashed var(--border-mid)', color: 'var(--tx-muted)' }}>
              <Plus className="w-3.5 h-3.5" /> ADD PROJECT
            </button>
          )}
          {projects.length === 0 && !showProjectForm && (
            <p className="text-xs text-center py-8" style={{ color: 'var(--tx-ghost)' }}>
              No projects yet — add one above, or import your whole life plan in one go.
            </p>
          )}
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onEdit={() => setEditingProject(p)} />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {(showRoutineForm || editingRoutine) && (
              <RoutineForm initial={editingRoutine ?? undefined} onClose={() => { setShowRoutineForm(false); setEditingRoutine(null); }} />
            )}
          </AnimatePresence>
          {!showRoutineForm && !editingRoutine && (
            <button onClick={() => setShowRoutineForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 mono text-[9px] tracking-widest font-bold mb-2" style={{ border: '1px dashed var(--border-mid)', color: 'var(--tx-muted)' }}>
              <Plus className="w-3.5 h-3.5" /> ADD ROUTINE BLOCK
            </button>
          )}
          {routineBlocks.length === 0 && !showRoutineForm && (
            <p className="text-xs text-center py-8" style={{ color: 'var(--tx-ghost)' }}>
              No routine set up yet — this is the container Ryna schedules projects into. Add blocks above, or import your life plan.
            </p>
          )}
          {routineBlocks.map(r => (
            <div key={r.id} onClick={() => setEditingRoutine(r)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
              <span className="mono text-[9px] w-28 shrink-0" style={{ color: 'var(--tx-muted)' }}>{minsToClock(r.startMinute)}–{minsToClock(r.endMinute)}</span>
              <span className="text-sm flex-1 font-medium" style={{ color: 'var(--tx-primary)' }}>{r.label}</span>
              <span className="mono text-[8px] px-1.5 py-0.5" style={{ background: r.isSchedulable ? 'rgba(139,92,246,0.1)' : 'var(--bg-overlay)', color: r.isSchedulable ? 'var(--acid)' : 'var(--tx-ghost)' }}>
                {r.isSchedulable ? 'WORKABLE' : SLOT_LABELS[r.slotType].toUpperCase()}
              </span>
              <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>{r.daysOfWeek.map(d => DAY_LABELS[d]).join('')}</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--tx-ghost)' }} />
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showImport && <LifeImportPanel onClose={() => setShowImport(false)} />}
      </AnimatePresence>
    </div>
  );
}
