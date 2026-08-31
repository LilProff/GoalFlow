import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, MessageCircle, ChevronRight, Edit3, TrendingUp, Trash2, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { getPillarTheme, DEFAULT_PILLARS, GOAL_TYPES } from '../lib/constants';
import SegBar from '../components/ui/SegBar';
import type { Goal, PillarId } from '../types';

const inp = 'w-full px-3 py-2.5 text-sm outline-none transition-all';
const inpStyle = { background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' } as const;
/** 90 days out — the default sprint horizon, matching onboarding. */
const defaultTarget = () => new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

const PILLAR_SYMS: Record<string, string> = { BUILD: '◈', SHOW: '◎', EARN: '◆', SYSTEMIZE: '◉' };

function GoalCard({ goal, active, onClick, daysLeft }: { goal: Goal; active: boolean; onClick: () => void; daysLeft: number }) {
  const theme = getPillarTheme(goal.pillarId);
  return (
    <motion.button whileHover={{ y: -2 }} onClick={onClick}
      className="p-5 text-left w-full transition-all"
      style={{
        background: active ? theme.bg : 'var(--bg-raised)',
        border: `1px solid ${active ? theme.border : 'var(--border-dim)'}`,
        borderLeft: `3px solid ${theme.accent}`,
      }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl" style={{ color: theme.accent }}>{PILLAR_SYMS[goal.pillarId] || '◈'}</span>
        <span className="mono text-[9px] px-2 py-1" style={{ color: theme.accent, background: theme.bg, border: `1px solid ${theme.border}` }}>
          {goal.pillarId}
        </span>
      </div>
      <h3 className="font-bold text-sm mb-1.5 leading-snug" style={{ color: 'var(--tx-primary)' }}>{goal.title}</h3>
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--tx-secondary)' }}>{goal.description}</p>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>PROGRESS</span>
          <span className="mono text-[9px] font-bold" style={{ color: theme.accent }}>{goal.progress}%</span>
        </div>
        <SegBar value={goal.progress} color={theme.accent} segments={16} height={4} />
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>
          {daysLeft > 0 ? `${daysLeft}d LEFT` : 'OVERDUE'}
        </span>
        <span className="mono text-[9px] flex items-center gap-1" style={{ color: 'var(--tx-muted)' }}>
          {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} MILESTONES
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.button>
  );
}

export default function Goals() {
  const { goals, updateGoal, addGoal, deleteGoal, setChatOpen } = useStore();
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    title: '', description: '', pillarId: 'BUILD' as PillarId,
    type: 'project' as Goal['type'], targetDate: defaultTarget(),
  });
  const [selected, setSelected] = useState<Goal | null>(null);
  const [pillarFilter, setPillarFilter] = useState('ALL');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiMsgs, setAiMsgs] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "I'm your AI Goal Planner. Ask me to review goals, suggest milestones, or plan this week's execution." }
  ]);
  const [now] = useState(() => Date.now());

  const filtered = pillarFilter === 'ALL' ? goals : goals.filter(g => g.pillarId === pillarFilter);

  const handleAiChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput; setChatInput('');
    setAiMsgs(p => [...p, { role: 'user', content: msg }]);
    setChatLoading(true);
    await new Promise(r => setTimeout(r, 1100));
    const rs = [
      `BUILD goal at ${goals.find(g => g.pillarId === 'BUILD')?.progress ?? 0}% — you need to accelerate this week. What's the single biggest blocker?`,
      "EARN gap vs BUILD suggests you're building without monetizing. Recommend pairing every 3 BUILD tasks with 1 EARN task.",
      "You have 3 milestone deadlines in 30 days. Let's break the most critical one into daily tasks right now.",
      "Strong BUILD momentum. Pair each session with a SHOW task for compounding visibility.",
    ];
    setAiMsgs(p => [...p, { role: 'ai', content: rs[Math.floor(Math.random() * rs.length)] }]);
    setChatLoading(false);
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 pb-5"
        style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>90-DAY SPRINT GOALS</p>
          <h1 className="text-2xl font-black">Goals</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-3 py-2 mono text-[10px] tracking-widest transition-all"
            style={{ background: 'rgba(0,212,180,0.06)', border: '1px solid rgba(0,212,180,0.2)', color: '#00d4b4' }}>
            <MessageCircle className="w-3 h-3" /> AI PLANNER
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3 py-2 mono text-[10px] tracking-widest font-bold"
            style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
            <Plus className="w-3 h-3" /> NEW GOAL
          </button>
        </div>
      </motion.div>

      {/* Pillar filter */}
      <div className="flex items-center gap-1.5 mb-5">
        {['ALL', ...DEFAULT_PILLARS.map(p => p.id)].map(f => (
          <button key={f} onClick={() => setPillarFilter(f)}
            className="mono text-[9px] px-3 py-1.5 tracking-widest transition-all"
            style={{
              background: pillarFilter === f ? 'rgba(212,245,60,0.08)' : 'var(--bg-raised)',
              border: `1px solid ${pillarFilter === f ? 'var(--acid)' : 'var(--border-dim)'}`,
              color: pillarFilter === f ? 'var(--acid)' : 'var(--tx-muted)',
            }}>
            {f === 'ALL' ? 'ALL PILLARS' : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Goals grid */}
        <div className="col-span-12 lg:col-span-7">
          {filtered.length === 0 ? (
            <div className="p-10 text-center" style={{ background: 'var(--bg-raised)', border: '1px dashed var(--border-mid)' }}>
              <p className="text-2xl mb-3" style={{ color: 'var(--tx-ghost)' }}>◈</p>
              <p className="font-bold text-sm mb-1.5" style={{ color: 'var(--tx-primary)' }}>
                {goals.length === 0 ? 'No goals yet' : `Nothing under ${pillarFilter}`}
              </p>
              <p className="text-xs mb-5 max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>
                {goals.length === 0
                  ? 'A 90-day goal gives Ryna something to plan your days around. Add your first one.'
                  : 'Try another pillar, or add a goal here.'}
              </p>
              <button onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 mono text-[10px] tracking-widest font-bold"
                style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                <Plus className="w-3 h-3" /> NEW GOAL
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(g => {
                const daysLeft = Math.ceil((new Date(g.targetDate).getTime() - now) / 86400000);
                return <GoalCard key={g.id} goal={g} active={selected?.id === g.id} onClick={() => setSelected(selected?.id === g.id ? null : g)} daysLeft={daysLeft} />;
              })}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
              {(() => {
                const theme = getPillarTheme(selected.pillarId);
                return (
                  <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: `2px solid ${theme.accent}` }}>
                    {/* Header */}
                    <div className="p-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <span className="mono text-[9px] px-2 py-1" style={{ color: theme.accent, background: theme.bg, border: `1px solid ${theme.border}` }}>
                          {selected.pillarId}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            title="Delete goal"
                            onClick={async () => {
                              if (!window.confirm(`Delete "${selected.title}"? Its milestones go with it. This cannot be undone.`)) return;
                              const id = selected.id;
                              setSelected(null);
                              await deleteGoal(id);
                            }}
                            style={{ color: 'var(--tx-muted)' }}
                            className="transition-colors hover:opacity-80">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setSelected(null)} style={{ color: 'var(--tx-muted)' }}>
                            <span className="mono text-lg">×</span>
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold mb-1" style={{ color: 'var(--tx-primary)' }}>{selected.title}</h3>
                      <p className="text-sm" style={{ color: 'var(--tx-secondary)' }}>{selected.description}</p>
                      {/* Progress */}
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>PROGRESS</span>
                          <span className="mono text-[9px] font-bold" style={{ color: theme.accent }}>{selected.progress}%</span>
                        </div>
                        <SegBar value={selected.progress} color={theme.accent} segments={20} height={5} />
                        <input type="range" min={0} max={100} value={selected.progress}
                          onChange={e => updateGoal(selected.id, { progress: +e.target.value })}
                          className="w-full" />
                      </div>
                    </div>

                    {/* Milestones */}
                    <div className="p-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--tx-muted)' }}>MILESTONES</span>
                        <button className="mono text-[9px] flex items-center gap-1" style={{ color: theme.accent }}>
                          <Plus className="w-3 h-3" /> ADD
                        </button>
                      </div>
                      <div className="space-y-0">
                        {selected.milestones.map(m => (
                          <div key={m.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                            <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0"
                              style={{ background: m.completed ? theme.accent : 'transparent', border: `1px solid ${m.completed ? theme.accent : 'var(--border-mid)'}` }}>
                              {m.completed && <span style={{ color: 'var(--bg-void)', fontSize: 8, fontWeight: 'bold' }}>✓</span>}
                            </div>
                            <span className={`text-xs flex-1 ${m.completed ? 'line-through' : ''}`}
                              style={{ color: m.completed ? 'var(--tx-muted)' : 'var(--tx-primary)' }}>
                              {m.title}
                            </span>
                            <span className="mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>
                              {format(new Date(m.dueDate), 'MMM d')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weekly plan */}
                    {selected.weeklyPlan && (
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                          <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--tx-muted)' }}>THIS WEEK'S PLAN</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>{selected.weeklyPlan}</p>
                        <button className="mt-3 mono text-[9px] flex items-center gap-1 transition-colors" style={{ color: theme.accent }}>
                          <Edit3 className="w-3 h-3" /> EDIT PLAN
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            /* Overview */
            <div className="p-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)' }}>
              <p className="mono text-[9px] tracking-widest mb-4 font-bold" style={{ color: 'var(--tx-muted)' }}>GOAL OVERVIEW</p>
              <div className="space-y-4">
                {DEFAULT_PILLARS.map(p => {
                  const g = goals.find(x => x.pillarId === p.id);
                  const theme = getPillarTheme(p.id);
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--tx-secondary)' }}>
                          <span style={{ color: theme.accent }}>{PILLAR_SYMS[p.id]}</span> {p.label}
                        </span>
                        <span className="mono text-[9px] font-bold" style={{ color: theme.accent }}>{g?.progress ?? 0}%</span>
                      </div>
                      <SegBar value={g?.progress ?? 0} color={theme.accent} segments={16} height={3} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Goal Chat */}
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: '2px solid rgba(0,212,180,0.4)' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <div className="w-5 h-5 flex items-center justify-center mono text-[9px] font-black" style={{ background: 'rgba(0,212,180,0.15)', border: '1px solid rgba(0,212,180,0.3)', color: '#00d4b4' }}>R</div>
              <span className="mono text-[10px] tracking-widest font-bold" style={{ color: '#00d4b4' }}>RYNA — GOAL PLANNER</span>
            </div>
            <div className="h-48 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {aiMsgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[88%] px-3 py-2 text-xs leading-relaxed"
                    style={{
                      background: m.role === 'user' ? 'rgba(212,245,60,0.08)' : 'var(--bg-overlay)',
                      border: `1px solid ${m.role === 'user' ? 'rgba(212,245,60,0.2)' : 'var(--border-dim)'}`,
                      color: m.role === 'user' ? 'var(--acid)' : 'var(--tx-secondary)',
                    }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)' }}>
                    <div className="flex gap-1">
                      {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: '#00d4b4', animationDelay: `${i*0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
              <div className="flex gap-2">
                <input type="text" placeholder="Ask about your goals..." value={chatInput}
                  onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiChat()}
                  className="flex-1 px-3 py-2 text-xs outline-none transition-all"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)', color: 'var(--tx-primary)' }}
                  onFocus={e => (e.target.style.borderColor = '#00d4b4')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
                <button onClick={handleAiChat} disabled={chatLoading}
                  className="px-3 py-2 mono text-[9px] font-bold disabled:opacity-40"
                  style={{ background: 'rgba(0,212,180,0.1)', border: '1px solid rgba(0,212,180,0.25)', color: '#00d4b4' }}>
                  SEND
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create goal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          onClick={() => !saving && setShowNew(false)}>
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto no-scrollbar"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: '3px solid var(--acid)' }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>NEW 90-DAY GOAL</p>
                <h2 className="text-lg font-black" style={{ color: 'var(--tx-primary)' }}>What are you committing to?</h2>
              </div>
              <button onClick={() => setShowNew(false)} style={{ color: 'var(--tx-muted)' }}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>GOAL</label>
                <input autoFocus className={inp} style={inpStyle}
                  placeholder="Ship the GoalFlow mobile app"
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
              </div>

              <div>
                <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>WHY IT MATTERS <span style={{ color: 'var(--tx-ghost)' }}>(OPTIONAL)</span></label>
                <textarea className={inp} style={{ ...inpStyle, minHeight: 70, resize: 'vertical' }}
                  placeholder="What changes when this is done?"
                  value={draft.description}
                  onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
              </div>

              <div>
                <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>PILLAR</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_PILLARS.map(p => {
                    const on = draft.pillarId === p.id;
                    const t = getPillarTheme(p.id);
                    return (
                      <button key={p.id} onClick={() => setDraft(d => ({ ...d, pillarId: p.id as PillarId }))}
                        className="mono text-[9px] px-3 py-2 tracking-widest transition-all"
                        style={{ background: on ? t.bg : 'var(--bg-overlay)', border: `1px solid ${on ? t.accent : 'var(--border-dim)'}`, color: on ? t.accent : 'var(--tx-muted)' }}>
                        {p.icon} {p.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>TYPE</label>
                <div className="flex flex-wrap gap-1.5">
                  {GOAL_TYPES.map(t => {
                    const on = draft.type === t.id;
                    return (
                      <button key={t.id} onClick={() => setDraft(d => ({ ...d, type: t.id as Goal['type'] }))}
                        title={t.description}
                        className="mono text-[9px] px-3 py-2 tracking-widest transition-all"
                        style={{ background: on ? 'rgba(212,245,60,0.08)' : 'var(--bg-overlay)', border: `1px solid ${on ? 'var(--acid)' : 'var(--border-dim)'}`, color: on ? 'var(--acid)' : 'var(--tx-muted)' }}>
                        {t.label.replace(' Goal', '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>TARGET DATE</label>
                <input type="date" className={inp} style={inpStyle}
                  value={draft.targetDate}
                  onChange={e => setDraft(d => ({ ...d, targetDate: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-dim)' }}>
              <button onClick={() => setShowNew(false)} disabled={saving}
                className="mono text-[10px] tracking-widest px-4 py-2.5 disabled:opacity-50"
                style={{ color: 'var(--tx-muted)', border: '1px solid var(--border-mid)' }}>
                CANCEL
              </button>
              <button
                disabled={!draft.title.trim() || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await addGoal({
                      userId: '',
                      pillarId: draft.pillarId,
                      title: draft.title.trim(),
                      description: draft.description.trim(),
                      targetDate: draft.targetDate,
                      status: 'active',
                      progress: 0,
                      type: draft.type,
                      weeklyKPIs: [],
                      milestones: [],
                    });
                    setShowNew(false);
                    setDraft({ title: '', description: '', pillarId: 'BUILD', type: 'project', targetDate: defaultTarget() });
                  } finally {
                    setSaving(false);
                  }
                }}
                className="mono text-[10px] tracking-widest px-4 py-2.5 font-bold disabled:opacity-40"
                style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                {saving ? 'CREATING…' : 'CREATE GOAL'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
