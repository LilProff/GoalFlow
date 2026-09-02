import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, MessageCircle, ChevronRight, Edit3, TrendingUp, Trash2, X, Wand2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { getPillarTheme, DEFAULT_PILLARS, GOAL_TYPES, TIMELINE_TYPES, PACE_LABELS } from '../lib/constants';
import SegBar from '../components/ui/SegBar';
import type { Goal, PillarId } from '../types';

const inp = 'w-full px-3 py-2.5 text-sm outline-none transition-all';
const inpStyle = { background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' } as const;

const PILLAR_SYMS: Record<string, string> = { BUILD: '◈', SHOW: '◎', EARN: '◆', SYSTEMIZE: '◉' };

function PaceTag({ goal }: { goal: Goal }) {
  const daysLeft = Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000);
  if (!goal.pace) {
    return (
      <span className="mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>
        {daysLeft > 0 ? `${daysLeft}d LEFT` : 'PAST TARGET'}
      </span>
    );
  }
  const info = PACE_LABELS[goal.pace.status];
  const color = goal.pace.status === 'behind' ? 'var(--warning)' : goal.pace.status === 'ahead' ? 'var(--success)' : 'var(--tx-muted)';
  return (
    <span className="mono text-[9px] flex items-center gap-1" style={{ color }}>
      {info.symbol} {info.label.toUpperCase()}
    </span>
  );
}

function GoalCard({ goal, active, onClick, nested }: { goal: Goal; active: boolean; onClick: () => void; nested?: boolean }) {
  const theme = getPillarTheme(goal.pillarId);
  return (
    <motion.button whileHover={{ y: -2 }} onClick={onClick}
      className="p-5 text-left w-full transition-all"
      style={{
        background: active ? theme.bg : 'var(--bg-raised)',
        border: `1px solid ${active ? theme.border : 'var(--border-dim)'}`,
        borderLeft: `3px solid ${theme.accent}`,
        opacity: nested ? 0.94 : 1,
      }}>
      <div className="flex items-start justify-between mb-3">
        <span className={nested ? 'text-lg' : 'text-2xl'} style={{ color: theme.accent }}>{PILLAR_SYMS[goal.pillarId] || '◈'}</span>
        <div className="flex items-center gap-1.5">
          <span className="mono text-[8px] px-1.5 py-0.5 tracking-widest" style={{ color: 'var(--tx-ghost)', border: '1px solid var(--border-dim)' }}>
            {goal.timelineType === 'long-term' ? 'LONG-TERM' : 'SHORT-TERM'}
          </span>
          <span className="mono text-[9px] px-2 py-1" style={{ color: theme.accent, background: theme.bg, border: `1px solid ${theme.border}` }}>
            {goal.pillarId}
          </span>
        </div>
      </div>
      <h3 className="font-bold text-sm mb-1.5 leading-snug" style={{ color: 'var(--tx-primary)' }}>{goal.title}</h3>
      <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--tx-secondary)' }}>{goal.description}</p>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>PROGRESS</span>
          <span className="mono text-[9px] font-bold" style={{ color: theme.accent }}>{goal.progress}%</span>
        </div>
        <SegBar value={goal.progress} color={theme.accent} segments={nested ? 12 : 16} height={4} />
      </div>
      <div className="flex items-center justify-between mt-3">
        <PaceTag goal={goal} />
        <span className="mono text-[9px] flex items-center gap-1" style={{ color: 'var(--tx-muted)' }}>
          {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} MILESTONES
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.button>
  );
}

export default function Goals() {
  const { goals, updateGoal, addGoal, deleteGoal, addMilestone, toggleMilestone, deleteMilestone, replanGoalTimeline, setChatOpen } = useStore();
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState(format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'));
  const [editingPlan, setEditingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replanning, setReplanning] = useState(false);
  const [replanNote, setReplanNote] = useState('');
  const [draft, setDraft] = useState({
    title: '', description: '', pillarId: 'BUILD' as PillarId,
    type: 'project' as Goal['type'], targetDate: '',
    timelineType: 'short-term' as Goal['timelineType'], parentGoalId: '' as string,
  });
  // Holds just the id, not the Goal object — selected.milestones/progress/etc.
  // change whenever the store updates (a toggle, an edit), and a snapshot
  // object taken at click time would never pick that up.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = goals.find(g => g.id === selectedId) ?? null;
  const setSelected = (g: Goal | null) => setSelectedId(g?.id ?? null);

  // Drop in-progress milestone/plan drafts when switching goals, rather than
  // leaving a half-typed milestone from goal A silently attached to goal B.
  useEffect(() => {
    setAddingMilestone(false); setMilestoneTitle(''); setMilestoneDate(format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'));
    setEditingPlan(false); setPlanDraft(selected?.weeklyPlan || ''); setReplanNote('');
  }, [selectedId]);
  const [pillarFilter, setPillarFilter] = useState('ALL');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [aiMsgs, setAiMsgs] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "I'm your AI Goal Planner. Ask me to review goals, suggest milestones, or plan this week's execution." }
  ]);

  // Every goal without a parent is a "top level" card — a long-term goal,
  // or a standalone short-term one that isn't laddering up to anything.
  // Children are found from the full (unfiltered) list so a parent still
  // shows all its short-term goals regardless of the pillar filter.
  const topLevel = goals.filter(g => !g.parentGoalId && (pillarFilter === 'ALL' || g.pillarId === pillarFilter));
  const childrenOf = (parentId: string) => goals.filter(g => g.parentGoalId === parentId);
  const longTermOptions = goals.filter(g => g.timelineType === 'long-term' && g.pillarId === draft.pillarId);

  const handleAiChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput; setChatInput('');
    setAiMsgs(p => [...p, { role: 'user', content: msg }]);
    setChatLoading(true);
    await new Promise(r => setTimeout(r, 1100));
    const rs = [
      `BUILD goal at ${goals.find(g => g.pillarId === 'BUILD')?.progress ?? 0}% — you need to accelerate this week. What's the single biggest blocker?`,
      "EARN gap vs BUILD suggests you're building without monetizing. Recommend pairing every 3 BUILD tasks with 1 EARN task.",
      "You have milestone deadlines coming up. Let's break the most critical one into daily tasks right now.",
      "Strong BUILD momentum. Pair each session with a SHOW task for compounding visibility.",
    ];
    setAiMsgs(p => [...p, { role: 'ai', content: rs[Math.floor(Math.random() * rs.length)] }]);
    setChatLoading(false);
  };

  const handleReplan = async () => {
    if (!selected) return;
    setReplanning(true);
    try {
      const note = await replanGoalTimeline(selected.id);
      setReplanNote(note || 'Timeline reviewed — you were already on track, nothing changed.');
    } catch {
      setReplanNote('Could not adjust the timeline. Try again shortly.');
    } finally {
      setReplanning(false);
    }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 pb-5"
        style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>LONG-TERM & SHORT-TERM · YOUR OWN PACE</p>
          <h1 className="text-2xl font-black">Goals</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-3 py-2 mono text-[10px] tracking-widest transition-all"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--acid)' }}>
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
              background: pillarFilter === f ? 'rgba(139,92,246,0.08)' : 'var(--bg-raised)',
              border: `1px solid ${pillarFilter === f ? 'var(--acid)' : 'var(--border-dim)'}`,
              color: pillarFilter === f ? 'var(--acid)' : 'var(--tx-muted)',
            }}>
            {f === 'ALL' ? 'ALL PILLARS' : f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Goals — a vertical stack of groups, each a top-level (long-term or
            standalone) goal with its laddered short-term goals nested underneath. */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {topLevel.length === 0 ? (
            <div className="glass-panel rounded-xl p-10 text-center" style={{ borderStyle: 'dashed' }}>
              <p className="text-2xl mb-3" style={{ color: 'var(--tx-ghost)' }}>◈</p>
              <p className="font-bold text-sm mb-1.5" style={{ color: 'var(--tx-primary)' }}>
                {goals.length === 0 ? 'No goals yet' : `Nothing under ${pillarFilter}`}
              </p>
              <p className="text-xs mb-5 max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>
                {goals.length === 0
                  ? 'A goal gives Ryna something to plan your days around. Add your first one — long-term or short-term.'
                  : 'Try another pillar, or add a goal here.'}
              </p>
              <button onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 mono text-[10px] tracking-widest font-bold"
                style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                <Plus className="w-3 h-3" /> NEW GOAL
              </button>
            </div>
          ) : (
            topLevel.map(g => {
              const children = childrenOf(g.id);
              return (
                <div key={g.id}>
                  <GoalCard goal={g} active={selected?.id === g.id} onClick={() => setSelected(selected?.id === g.id ? null : g)} />
                  {children.length > 0 && (
                    <div className="ml-5 mt-2 pl-4 space-y-2" style={{ borderLeft: '2px dashed var(--border-dim)' }}>
                      {children.map(c => (
                        <GoalCard key={c.id} goal={c} nested active={selected?.id === c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right panel */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
              {(() => {
                const theme = getPillarTheme(selected.pillarId);
                const parent = selected.parentGoalId ? goals.find(g => g.id === selected.parentGoalId) : null;
                return (
                  <div className="glass-panel rounded-xl overflow-hidden" style={{ borderTop: `2px solid ${theme.accent}` }}>
                    {/* Header */}
                    <div className="p-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="mono text-[9px] px-2 py-1" style={{ color: theme.accent, background: theme.bg, border: `1px solid ${theme.border}` }}>
                            {selected.pillarId}
                          </span>
                          <span className="mono text-[8px] px-1.5 py-0.5 tracking-widest" style={{ color: 'var(--tx-ghost)', border: '1px solid var(--border-dim)' }}>
                            {selected.timelineType === 'long-term' ? 'LONG-TERM' : 'SHORT-TERM'}
                          </span>
                        </div>
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
                      {parent && (
                        <button onClick={() => setSelected(parent)} className="mono text-[9px] mb-2 flex items-center gap-1" style={{ color: 'var(--tx-muted)' }}>
                          ↳ LADDERS UP TO: <span style={{ color: theme.accent }}>{parent.title}</span>
                        </button>
                      )}
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

                      {/* Adaptive timeline */}
                      <div className="mt-4 p-3 flex items-center justify-between" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)' }}>
                        <div>
                          <PaceTag goal={selected} />
                          <p className="mono text-[8px] mt-1" style={{ color: 'var(--tx-ghost)' }}>
                            TARGET {format(new Date(selected.targetDate), 'MMM d, yyyy').toUpperCase()}
                            {selected.timelineHistory.length > 0 && ` · ADJUSTED ${selected.timelineHistory.length}×`}
                          </p>
                        </div>
                        <button onClick={handleReplan} disabled={replanning}
                          className="flex items-center gap-1.5 mono text-[9px] font-bold px-2.5 py-1.5 disabled:opacity-50 transition-all"
                          style={{ color: theme.accent, border: `1px solid ${theme.border}` }}>
                          <Wand2 className="w-3 h-3" /> {replanning ? 'ADJUSTING…' : 'ADJUST TIMELINE'}
                        </button>
                      </div>
                      {replanNote && (
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.accent }}>{replanNote}</p>
                      )}
                    </div>

                    {/* Milestones */}
                    <div className="p-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--tx-muted)' }}>MILESTONES</span>
                        <button onClick={() => setAddingMilestone(v => !v)}
                          className="mono text-[9px] flex items-center gap-1" style={{ color: theme.accent }}>
                          <Plus className="w-3 h-3" /> ADD
                        </button>
                      </div>

                      {addingMilestone && (
                        <div className="flex items-center gap-2 mb-3 p-2.5" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)' }}>
                          <input autoFocus value={milestoneTitle} onChange={e => setMilestoneTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && milestoneTitle.trim() && (async () => {
                              await addMilestone(selected.id, milestoneTitle.trim(), milestoneDate);
                              setAddingMilestone(false);
                            })()}
                            placeholder="Milestone title" className="flex-1 min-w-0 bg-transparent text-xs outline-none" style={{ color: 'var(--tx-primary)' }} />
                          <input type="date" value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)}
                            className="mono text-[9px] bg-transparent outline-none shrink-0" style={{ color: 'var(--tx-muted)' }} />
                          <button
                            disabled={!milestoneTitle.trim()}
                            onClick={async () => { await addMilestone(selected.id, milestoneTitle.trim(), milestoneDate); setAddingMilestone(false); }}
                            className="mono text-[9px] font-bold px-2 py-1 shrink-0 disabled:opacity-30"
                            style={{ background: theme.accent, color: 'var(--bg-void)' }}>
                            ADD
                          </button>
                        </div>
                      )}

                      <div className="space-y-0">
                        {selected.milestones.length === 0 && !addingMilestone && (
                          <p className="text-xs py-2" style={{ color: 'var(--tx-ghost)' }}>No milestones yet.</p>
                        )}
                        {selected.milestones.map(m => (
                          <div key={m.id} className="group flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                            <button onClick={() => toggleMilestone(selected.id, m.id)}
                              className="w-3.5 h-3.5 flex items-center justify-center shrink-0"
                              style={{ background: m.completed ? theme.accent : 'transparent', border: `1px solid ${m.completed ? theme.accent : 'var(--border-mid)'}` }}>
                              {m.completed && <span style={{ color: 'var(--bg-void)', fontSize: 8, fontWeight: 'bold' }}>✓</span>}
                            </button>
                            <span className={`text-xs flex-1 ${m.completed ? 'line-through' : ''}`}
                              style={{ color: m.completed ? 'var(--tx-muted)' : 'var(--tx-primary)' }}>
                              {m.title}
                            </span>
                            <span className="mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>
                              {format(new Date(m.dueDate), 'MMM d')}
                            </span>
                            <button onClick={() => deleteMilestone(selected.id, m.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--tx-ghost)' }}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weekly plan */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                        <span className="mono text-[9px] tracking-widest font-bold" style={{ color: 'var(--tx-muted)' }}>THIS WEEK'S PLAN</span>
                      </div>
                      {editingPlan ? (
                        <div className="space-y-2">
                          <textarea autoFocus rows={4} value={planDraft} onChange={e => setPlanDraft(e.target.value)}
                            placeholder="What's the plan for this goal this week?"
                            className="w-full px-3 py-2 text-sm outline-none resize-none" style={inpStyle} />
                          <div className="flex items-center gap-2">
                            <button onClick={async () => { await updateGoal(selected.id, { weeklyPlan: planDraft }); setEditingPlan(false); }}
                              className="mono text-[9px] font-bold px-3 py-1.5" style={{ background: theme.accent, color: 'var(--bg-void)' }}>
                              SAVE
                            </button>
                            <button onClick={() => { setPlanDraft(selected.weeklyPlan || ''); setEditingPlan(false); }}
                              className="mono text-[9px] px-3 py-1.5" style={{ color: 'var(--tx-muted)' }}>
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : selected.weeklyPlan ? (
                        <>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>{selected.weeklyPlan}</p>
                          <button onClick={() => setEditingPlan(true)}
                            className="mt-3 mono text-[9px] flex items-center gap-1 transition-colors" style={{ color: theme.accent }}>
                            <Edit3 className="w-3 h-3" /> EDIT PLAN
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setEditingPlan(true)}
                          className="mono text-[9px] flex items-center gap-1 transition-colors" style={{ color: 'var(--tx-muted)' }}>
                          <Plus className="w-3 h-3" /> ADD A PLAN FOR THIS WEEK
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            /* Overview */
            <div className="glass-panel rounded-xl p-5">
              <p className="mono text-[9px] tracking-widest mb-4 font-bold" style={{ color: 'var(--tx-muted)' }}>GOAL OVERVIEW</p>
              <div className="space-y-4">
                {DEFAULT_PILLARS.map(p => {
                  const pillarGoals = goals.filter(x => x.pillarId === p.id);
                  const theme = getPillarTheme(p.id);
                  const avgProgress = pillarGoals.length
                    ? Math.round(pillarGoals.reduce((sum, g) => sum + g.progress, 0) / pillarGoals.length)
                    : 0;
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--tx-secondary)' }}>
                          <span style={{ color: theme.accent }}>{PILLAR_SYMS[p.id]}</span> {p.label}
                          <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>({pillarGoals.length})</span>
                        </span>
                        <span className="mono text-[9px] font-bold" style={{ color: theme.accent }}>{avgProgress}%</span>
                      </div>
                      <SegBar value={avgProgress} color={theme.accent} segments={16} height={3} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Goal Chat */}
          <div className="glass-panel" style={{ borderTop: '2px solid rgba(139,92,246,0.5)' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center mono text-[9px] font-black" style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.4)', color: 'var(--acid)' }}>R</div>
              <span className="mono text-[10px] tracking-widest font-bold" style={{ color: 'var(--acid)' }}>RYNA — GOAL PLANNER</span>
            </div>
            <div className="h-48 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {aiMsgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[88%] px-3 py-2 text-xs leading-relaxed"
                    style={{
                      background: m.role === 'user' ? 'rgba(139,92,246,0.08)' : 'var(--bg-overlay)',
                      border: `1px solid ${m.role === 'user' ? 'rgba(139,92,246,0.2)' : 'var(--border-dim)'}`,
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
                      {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: 'var(--acid)', animationDelay: `${i*0.15}s` }} />)}
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
                  onFocus={e => (e.target.style.borderColor = 'var(--acid)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
                <button onClick={handleAiChat} disabled={chatLoading}
                  className="px-3 py-2 mono text-[9px] font-bold disabled:opacity-40"
                  style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)', color: 'var(--acid)' }}>
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
            className="glass-panel rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto no-scrollbar"
            style={{ borderTop: '3px solid var(--acid)' }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>NEW GOAL</p>
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
                <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>TIMELINE</label>
                <div className="flex gap-1.5">
                  {TIMELINE_TYPES.map(t => {
                    const on = draft.timelineType === t.id;
                    return (
                      <button key={t.id} title={t.description}
                        onClick={() => setDraft(d => ({ ...d, timelineType: t.id, parentGoalId: t.id === 'long-term' ? '' : d.parentGoalId }))}
                        className="flex-1 mono text-[9px] px-3 py-2 tracking-widest transition-all"
                        style={{ background: on ? 'rgba(139,92,246,0.08)' : 'var(--bg-overlay)', border: `1px solid ${on ? 'var(--acid)' : 'var(--border-dim)'}`, color: on ? 'var(--acid)' : 'var(--tx-muted)' }}>
                        {t.label.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {draft.timelineType === 'short-term' && (
                <div>
                  <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>
                    LADDERS UP TO <span style={{ color: 'var(--tx-ghost)' }}>(OPTIONAL)</span>
                  </label>
                  <select value={draft.parentGoalId} onChange={e => setDraft(d => ({ ...d, parentGoalId: e.target.value }))}
                    className={inp} style={inpStyle}>
                    <option value="" style={{ background: 'var(--bg-overlay)' }}>— Standalone —</option>
                    {longTermOptions.map(g => (
                      <option key={g.id} value={g.id} style={{ background: 'var(--bg-overlay)' }}>{g.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>PILLAR</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_PILLARS.map(p => {
                    const on = draft.pillarId === p.id;
                    const t = getPillarTheme(p.id);
                    return (
                      <button key={p.id} onClick={() => setDraft(d => ({ ...d, pillarId: p.id as PillarId, parentGoalId: '' }))}
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
                        style={{ background: on ? 'rgba(139,92,246,0.08)' : 'var(--bg-overlay)', border: `1px solid ${on ? 'var(--acid)' : 'var(--border-dim)'}`, color: on ? 'var(--acid)' : 'var(--tx-muted)' }}>
                        {t.label.replace(' Goal', '')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>
                  TARGET DATE <span style={{ color: 'var(--tx-ghost)' }}>(OPTIONAL — RYNA WILL PROPOSE ONE)</span>
                </label>
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
                      parentGoalId: draft.parentGoalId || null,
                      timelineType: draft.timelineType,
                      origin: 'manual',
                      timelineHistory: [],
                    });
                    setShowNew(false);
                    setDraft({ title: '', description: '', pillarId: 'BUILD', type: 'project', targetDate: '', timelineType: 'short-term', parentGoalId: '' });
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
