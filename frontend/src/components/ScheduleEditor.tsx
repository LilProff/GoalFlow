import { Plus, X } from 'lucide-react';
import type { ScheduleStep } from '../types';

const inp = "w-full px-3 py-2.5 text-sm outline-none transition-all";
const inpStyle = { background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' };

/**
 * Wake/sleep time + deep-work windows editor. Shared between Onboarding's
 * Schedule step (a fresh account) and Settings' Schedule tab (editing it
 * anytime after) so the two stay in sync automatically — same pattern as
 * ImportGoals.tsx being shared between Onboarding and the Ryna panel.
 * Fully controlled: no internal state, just `value`/`onChange`.
 */
export default function ScheduleEditor({
  value, onChange, hint,
}: {
  value: ScheduleStep;
  onChange: (next: ScheduleStep) => void;
  /** Optional footer note — callers phrase this differently (onboarding vs. settings). */
  hint?: string;
}) {
  const setDeepWork = (windows: ScheduleStep['deepWorkWindows']) => onChange({ ...value, deepWorkWindows: windows });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>WAKE TIME</label>
          <input type="time" value={value.wakeTime} onChange={e => onChange({ ...value, wakeTime: e.target.value })} className={inp} style={inpStyle} />
        </div>
        <div className="space-y-1.5">
          <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>SLEEP TIME</label>
          <input type="time" value={value.sleepTime} onChange={e => onChange({ ...value, sleepTime: e.target.value })} className={inp} style={inpStyle} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>DEEP WORK WINDOWS</label>
          <button onClick={() => setDeepWork([...value.deepWorkWindows, { start: '14:00', end: '16:00' }])}
            className="mono text-[9px] flex items-center gap-1" style={{ color: 'var(--acid)' }}>
            <Plus className="w-3 h-3" /> ADD
          </button>
        </div>
        {value.deepWorkWindows.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="time" value={w.start}
              onChange={e => setDeepWork(value.deepWorkWindows.map((x, j) => j === i ? { ...x, start: e.target.value } : x))}
              className="flex-1 px-3 py-2 text-sm outline-none" style={inpStyle} />
            <span className="mono text-[10px]" style={{ color: 'var(--tx-muted)' }}>→</span>
            <input type="time" value={w.end}
              onChange={e => setDeepWork(value.deepWorkWindows.map((x, j) => j === i ? { ...x, end: e.target.value } : x))}
              className="flex-1 px-3 py-2 text-sm outline-none" style={inpStyle} />
            {value.deepWorkWindows.length > 1 && (
              <button onClick={() => setDeepWork(value.deepWorkWindows.filter((_, j) => j !== i))} style={{ color: 'var(--tx-muted)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="p-3" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)', borderLeft: '2px solid var(--acid)' }}>
        <p className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>
          {hint ?? 'Ryna uses your wake/sleep times and deep-work windows to build your daily plan and reshuffle blocks — it never schedules outside them.'}
        </p>
      </div>
    </div>
  );
}
