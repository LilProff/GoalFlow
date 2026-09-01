import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Plus, X, Zap, Send, Upload, Copy, FileText, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { useStore } from '../lib/store';
import { DEFAULT_PILLARS, LIFE_CATEGORIES, COACH_STYLES, TIMEZONES, OCCUPATION_PRESETS, GOAL_TYPES, TIMELINE_TYPES, IMPORT_HANDOFF_PROMPT } from '../lib/constants';
import type { PillarId, CategoryId, CoachStyle, ChatMessage, ImportDraftGoal } from '../types';

// ─── Shared input style ───────────────────────────────────────────────────────
const inp = "w-full px-3 py-2.5 text-sm outline-none transition-all";
const inpStyle = { background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' };
const focusAcid = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.target.style.borderColor = 'var(--acid)');
const blurMid   = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => (e.target.style.borderColor = 'var(--border-mid)');

// ─── Chat-based onboarding ────────────────────────────────────────────────────
const CHAT_SCRIPT = [
  { id: 'q1', role: 'assistant' as const, content: "Hey! I'm Ryna, your AI execution coach 👋\n\nBefore we build your personalised system, I need to understand you. Let's start simple:\n\n**What's your name?**" },
  { id: 'q2', role: 'assistant' as const, content: "Great to meet you! Now — be honest with me:\n\n**Do you have a clear direction in life right now, or are you still figuring out what you want to focus on?**", options: ["I have a clear direction", "I'm still figuring it out", "Somewhere in between"] },
  { id: 'q3', role: 'assistant' as const, content: "Got it. **What best describes your current situation?**", options: Object.values(OCCUPATION_PRESETS).map(o => o.label) },
  { id: 'q4', role: 'assistant' as const, content: "Do you have a 9-5 job right now?", options: ["Yes, full-time", "Yes, part-time", "No, I'm fully independent"] },
  { id: 'q5', role: 'assistant' as const, content: "**Which areas of life do you want to actively develop?** (pick all that apply)\n\nThese become your life categories — the foundation of your daily system.", multiSelect: LIFE_CATEGORIES.map(c => ({ id: c.id, label: c.label, icon: c.icon })) },
  { id: 'q6', role: 'assistant' as const, content: "Now let's define your **execution pillars** — these are the core areas where you take daily action.\n\nWhich of these resonate with where you want to focus?", multiSelect: DEFAULT_PILLARS.map(p => ({ id: p.id, label: p.label, icon: p.icon })) },
  { id: 'q7', role: 'assistant' as const, content: "**What's your single biggest goal right now?** The one thing that, if you achieved it, would change everything.\n\nBe specific — vague goals get vague results." },
  { id: 'q8', role: 'assistant' as const, content: "Last question: **How do you want me to coach you?**\n\nI can adapt my style based on your performance, but what's your default preference?", options: COACH_STYLES.map(c => `${c.symbol} ${c.label} — ${c.tagline}`) },
];

function ChatOnboarding({ onComplete }: { onComplete: (data: Partial<{ name: string; occupation: string; has9to5: boolean; categories: string[]; pillars: string[]; mainGoal: string; coachStyle: string }>) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'start', role: 'assistant', content: CHAT_SCRIPT[0].content, timestamp: new Date().toISOString() }]);
  const [scriptIdx, setScriptIdx] = useState(0);
  const [input, setInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [done, setDone] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const currentQ = CHAT_SCRIPT[scriptIdx];
  const hasOptions = currentQ?.options && !currentQ?.multiSelect;
  const hasMulti = currentQ?.multiSelect;

  const advance = async (answer: string, extraData?: Record<string, unknown>) => {
    const uid = ++msgIdRef.current;
    const userMsg: ChatMessage = { id: `u${uid}`, role: 'user', content: answer, timestamp: new Date().toISOString() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setSelectedOptions([]);
    const newData = { ...collectedData, [`q${scriptIdx + 1}`]: answer, ...extraData };
    setCollectedData(newData);

    if (scriptIdx >= CHAT_SCRIPT.length - 1) {
      setIsTyping(true);
      await new Promise(r => setTimeout(r, 1000));
      setIsTyping(false);
      const finalMsg: ChatMessage = {
        id: 'final', role: 'assistant',
        content: `Perfect, ${newData.q1 || 'friend'}. I have everything I need.\n\nI'm building your personalised execution system now — pillars, categories, goals, and your first week's plan.\n\nThis is where it starts. Let's go. 🚀`,
        timestamp: new Date().toISOString(),
      };
      setMessages(m => [...m, finalMsg]);
      setDone(true);
      await new Promise(r => setTimeout(r, 1500));
      onComplete({
        name: String(newData.q1 || ''),
        occupation: String(newData.q3 || ''),
        has9to5: String(newData.q4 || '').includes('full-time') || String(newData.q4 || '').includes('part-time'),
        categories: (newData.categories as string[]) || [],
        pillars: (newData.pillars as string[]) || ['BUILD', 'SHOW', 'EARN', 'SYSTEMIZE'],
        mainGoal: String(newData.q7 || ''),
        coachStyle: String(newData.q8 || ''),
      });
      return;
    }

    setIsTyping(true);
    await new Promise(r => setTimeout(r, 900 + Math.random() * 400));
    setIsTyping(false);
    const nextQ = CHAT_SCRIPT[scriptIdx + 1];
    const aiId = ++msgIdRef.current;
    const aiMsg: ChatMessage = { id: `a${aiId}`, role: 'assistant', content: nextQ.content, timestamp: new Date().toISOString() };
    setMessages(m => [...m, aiMsg]);
    setScriptIdx(i => i + 1);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    advance(input.trim());
  };

  const handleOption = (opt: string) => advance(opt);

  const handleMultiDone = () => {
    if (selectedOptions.length === 0) return;
    const key = currentQ.multiSelect?.[0]?.id.startsWith('spiritual') ? 'categories' : 'pillars';
    advance(selectedOptions.join(', '), { [key]: selectedOptions });
  };

  const toggleOption = (id: string) =>
    setSelectedOptions(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 shrink-0 flex items-center justify-center mr-2 mt-0.5"
                style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.4)' }}>
                <Zap className="w-3 h-3" style={{ color: 'var(--acid)' }} />
              </div>
            )}
            <div className="max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-line"
              style={{
                background: msg.role === 'user' ? 'rgba(139,92,246,0.08)' : 'var(--bg-overlay)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(139,92,246,0.2)' : 'var(--border-mid)'}`,
                borderLeft: msg.role === 'assistant' ? '2px solid var(--acid)' : undefined,
                color: msg.role === 'user' ? 'var(--acid)' : 'var(--tx-primary)',
              }}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-6 h-6 shrink-0 flex items-center justify-center mr-2"
              style={{ background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.4)' }}>
              <Zap className="w-3 h-3" style={{ color: 'var(--acid)' }} />
            </div>
            <div className="px-4 py-3" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', borderLeft: '2px solid var(--acid)' }}>
              <div className="flex gap-1">{[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--acid)', animationDelay: `${i*0.15}s` }} />)}</div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Options */}
      {!done && !isTyping && (
        <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
          {hasMulti && currentQ.multiSelect && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {currentQ.multiSelect.map(opt => (
                  <button key={opt.id} onClick={() => toggleOption(opt.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: selectedOptions.includes(opt.id) ? 'rgba(139,92,246,0.1)' : 'var(--bg-overlay)',
                      border: `1px solid ${selectedOptions.includes(opt.id) ? 'var(--acid)' : 'var(--border-mid)'}`,
                      color: selectedOptions.includes(opt.id) ? 'var(--acid)' : 'var(--tx-secondary)',
                    }}>
                    <span>{opt.icon}</span>{opt.label}
                    {selectedOptions.includes(opt.id) && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
              <button onClick={handleMultiDone} disabled={selectedOptions.length === 0}
                className="w-full py-2.5 font-bold text-sm disabled:opacity-40"
                style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                Continue with {selectedOptions.length} selected →
              </button>
            </div>
          )}
          {hasOptions && currentQ.options && (
            <div className="flex flex-col gap-1.5">
              {currentQ.options.map(opt => (
                <button key={opt} onClick={() => handleOption(opt)}
                  className="text-left px-4 py-2.5 text-sm transition-all"
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--acid)'; e.currentTarget.style.color = 'var(--acid)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--tx-secondary)'; }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {!hasOptions && !hasMulti && (
            <div className="flex gap-2">
              <input type="text" placeholder="Type your answer..." value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                className={`flex-1 ${inp}`} style={inpStyle} onFocus={focusAcid} onBlur={blurMid} autoFocus />
              <button onClick={handleSend} disabled={!input.trim()}
                className="px-4 py-2.5 disabled:opacity-40"
                style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI-import onboarding ─────────────────────────────────────────────────────
// Third onboarding path: the user takes IMPORT_HANDOFF_PROMPT to their own
// AI assistant, refines the result there (that conversation stays theirs),
// and uploads what it hands back. GoalFlow parses it into a draft below —
// nothing is written until the user reviews/edits it and confirms.
function ImportOnboarding({ onDone }: { onDone: () => void }) {
  const {
    goalImportDraft, goalImportLoading, goalImportError,
    submitGoalImport, updateGoalImportDraft, confirmGoalImport, clearGoalImportDraft,
  } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_HANDOFF_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard permission denied — the textarea below is still selectable/copyable by hand */ }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await submitGoalImport(file);
    } catch { /* goalImportError already reflects this in the store */ }
  };

  const handleConfirm = async () => {
    setConfirming(true); setConfirmError('');
    try {
      await confirmGoalImport();
      onDone();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Could not save your goals. Try again.');
      setConfirming(false);
    }
  };

  const patchGoal = (draftId: string, patch: Partial<ImportDraftGoal>) => {
    if (!goalImportDraft) return;
    updateGoalImportDraft(goalImportDraft.goals.map(g => g.draftId === draftId ? { ...g, ...patch } : g));
  };

  const removeGoal = (draftId: string) => {
    if (!goalImportDraft) return;
    updateGoalImportDraft(goalImportDraft.goals.filter(g => g.draftId !== draftId));
  };

  // ── Review screen: a draft has come back and is waiting for confirmation ──
  if (goalImportDraft) {
    const topLevel = goalImportDraft.goals.filter(g => !g.parentDraftId);
    const childrenOf = (id: string) => goalImportDraft.goals.filter(g => g.parentDraftId === id);

    const renderGoalCard = (g: typeof goalImportDraft.goals[number], nested?: boolean) => (
      <div key={g.draftId} className="p-4 space-y-2.5" style={{ background: nested ? 'var(--bg-void)' : 'var(--bg-overlay)', border: '1px solid var(--border-dim)', marginLeft: nested ? 20 : 0 }}>
        <div className="flex items-start justify-between gap-2">
          <input value={g.title} onChange={e => patchGoal(g.draftId, { title: e.target.value })}
            className="flex-1 bg-transparent text-sm font-semibold outline-none" style={{ color: 'var(--tx-primary)' }} />
          <button onClick={() => removeGoal(g.draftId)} style={{ color: 'var(--tx-ghost)' }}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        <textarea rows={2} value={g.description || ''} onChange={e => patchGoal(g.draftId, { description: e.target.value })}
          placeholder="Description" className="w-full bg-transparent text-xs outline-none resize-none" style={{ color: 'var(--tx-secondary)' }} />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono text-[8px] px-1.5 py-0.5" style={{ background: 'var(--border-dim)', color: 'var(--tx-ghost)' }}>{g.pillarId}</span>
          {TIMELINE_TYPES.map(t => (
            <button key={t.id} onClick={() => patchGoal(g.draftId, { timelineType: t.id })}
              className="mono text-[8px] px-2 py-1 tracking-widest transition-all"
              style={{ background: g.timelineType === t.id ? 'rgba(139,92,246,0.1)' : 'transparent', border: `1px solid ${g.timelineType === t.id ? 'var(--acid)' : 'var(--border-dim)'}`, color: g.timelineType === t.id ? 'var(--acid)' : 'var(--tx-muted)' }}>
              {t.label.toUpperCase()}
            </button>
          ))}
          <input type="date" value={g.targetDate || ''} onChange={e => patchGoal(g.draftId, { targetDate: e.target.value })}
            className="mono text-[8px] bg-transparent outline-none" style={{ color: 'var(--tx-muted)' }} />
        </div>
        {g.tasks.length > 0 && (
          <div className="pt-2" style={{ borderTop: '1px solid var(--border-dim)' }}>
            <p className="mono text-[8px] tracking-widest mb-1" style={{ color: 'var(--tx-ghost)' }}>STARTER TASKS</p>
            <ul className="space-y-0.5">
              {g.tasks.map((t, i) => (
                <li key={i} className="text-xs" style={{ color: 'var(--tx-secondary)' }}>· {t.title} <span className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>({t.estimatedMinutes}m)</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        {goalImportDraft.lifeAreasSummary && (
          <div className="p-3" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderLeft: '2px solid var(--acid)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--acid)' }}>{goalImportDraft.lifeAreasSummary}</p>
          </div>
        )}
        <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>
          {goalImportDraft.goals.length} GOALS EXTRACTED · REVIEW & EDIT BEFORE CONFIRMING
        </p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar pr-1">
          {topLevel.map(g => (
            <div key={g.draftId} className="space-y-2">
              {renderGoalCard(g)}
              {childrenOf(g.draftId).map(c => renderGoalCard(c, true))}
            </div>
          ))}
          {goalImportDraft.goals.length === 0 && (
            <p className="text-xs py-6 text-center" style={{ color: 'var(--tx-ghost)' }}>Every goal was removed — start over or add goals manually after onboarding.</p>
          )}
        </div>
        {confirmError && <p className="text-xs" style={{ color: '#EF4444' }}>{confirmError}</p>}
        <div className="flex items-center justify-between pt-2">
          <button onClick={clearGoalImportDraft} className="mono text-[9px] tracking-widest flex items-center gap-1" style={{ color: 'var(--tx-muted)' }}>
            <ArrowLeft className="w-3 h-3" /> START OVER
          </button>
          <button onClick={handleConfirm} disabled={confirming || goalImportDraft.goals.length === 0}
            className="flex items-center gap-2 font-bold px-5 py-2.5 text-sm disabled:opacity-50"
            style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
            {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Building your system...</> : <>Confirm & launch <Zap className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    );
  }

  // ── Hand-off + upload screen ──
  return (
    <div className="space-y-5">
      <div>
        <p className="mono text-[9px] tracking-widest mb-2" style={{ color: 'var(--acid)' }}>STEP 1 — TALK TO YOUR OWN AI FIRST</p>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--tx-secondary)' }}>
          Copy this prompt into whatever AI assistant you already use. It'll interview you about what you actually
          want across your life — that conversation stays between you and it. When you're done, save its write-up
          as a .md, .txt, or .docx file.
        </p>
        <div className="relative">
          <textarea readOnly value={IMPORT_HANDOFF_PROMPT} rows={7}
            className="w-full px-3 py-2.5 text-xs leading-relaxed outline-none resize-none mono"
            style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)' }} />
          <button onClick={handleCopy}
            className="absolute top-2 right-2 flex items-center gap-1.5 mono text-[9px] font-bold px-2.5 py-1.5 transition-all"
            style={{ background: copied ? 'rgba(139,92,246,0.18)' : 'var(--bg-raised)', color: copied ? 'var(--acid)' : 'var(--tx-secondary)', border: '1px solid var(--border-dim)' }}>
            {copied ? <><Check className="w-3 h-3" /> COPIED</> : <><Copy className="w-3 h-3" /> COPY</>}
          </button>
        </div>
      </div>

      <div>
        <p className="mono text-[9px] tracking-widest mb-2" style={{ color: 'var(--acid)' }}>STEP 2 — UPLOAD WHAT IT WROTE BACK</p>
        <input ref={fileInputRef} type="file" accept=".md,.txt,.docx" className="hidden"
          onChange={e => setFile(e.target.files?.[0] || null)} />
        <button onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-8 transition-all"
          style={{ border: '1px dashed var(--border-mid)', background: 'var(--bg-overlay)' }}>
          <FileText className="w-6 h-6" style={{ color: file ? 'var(--acid)' : 'var(--tx-ghost)' }} />
          <span className="text-sm" style={{ color: file ? 'var(--tx-primary)' : 'var(--tx-muted)' }}>
            {file ? file.name : 'Click to choose a .md, .txt, or .docx file'}
          </span>
        </button>
        {goalImportError && <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{goalImportError}</p>}
      </div>

      <button onClick={handleUpload} disabled={!file || goalImportLoading}
        className="w-full flex items-center justify-center gap-2 py-3 font-bold text-sm disabled:opacity-50"
        style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
        {goalImportLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading your goals...</> : <><Upload className="w-4 h-4" /> Extract my goals</>}
      </button>
    </div>
  );
}

// ─── Form onboarding steps ────────────────────────────────────────────────────
const STEPS = ['Identity', 'Pillars', 'Categories', 'Goals', 'Schedule', 'Coach'];

export default function Onboarding() {
  const { onboarding, updateOnboardingStep, setOnboardingMode, completeOnboarding } = useStore();
  const navigate = useNavigate();
  // Every other field here correctly seeds from the persisted `onboarding`
  // draft (see the store's zustand/persist config) — this one didn't, so a
  // reload always silently bounced a mid-flow user back to step 1 despite
  // the rest of their answers surviving intact.
  const [step, setStep] = useState(() => Math.min(onboarding.step, STEPS.length - 1));
  const [loading, setLoading] = useState(false);
  const [identity, setIdentity] = useState(onboarding.identity);
  const [selectedPillars, setSelectedPillars] = useState<PillarId[]>(onboarding.pillars.selected);
  const [customPillars, setCustomPillars] = useState(onboarding.pillars.customPillars);
  const [newPillarLabel, setNewPillarLabel] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(onboarding.categories.selected);
  const [goals, setGoals] = useState<Record<string, string>>(onboarding.goals.goals);
  const [goalTypes, setGoalTypes] = useState<Record<string, string>>(onboarding.goals.goalTypes as Record<string, string>);
  const [schedule, setSchedule] = useState(onboarding.schedule);
  const [deepWork, setDeepWork] = useState(onboarding.schedule.deepWorkWindows);
  const [coachStyle, setCoachStyle] = useState<CoachStyle>(onboarding.coachStyle.style);

  const allPillars = [...DEFAULT_PILLARS, ...customPillars.map(cp => ({ ...cp, icon: '◈', color: '#5a5448', enabled: true, categories: [], weeklyKPIs: [] }))];

  const finish = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    await completeOnboarding();
    navigate('/dashboard');
  };

  const handleNext = async () => {
    // Always sync the current step's selections into the store first —
    // including on the final step, whose choice (coach style) would
    // otherwise never make it past local state before finish() reads it.
    updateOnboardingStep(step + 1, {
      identity, pillars: { selected: selectedPillars, customPillars },
      categories: { selected: selectedCategories },
      goals: { goals, timelines: {}, goalTypes: goalTypes as Record<string, import('../types').Goal['type']> },
      schedule: { ...schedule, deepWorkWindows: deepWork },
      coachStyle: { style: coachStyle },
    });
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else { await finish(); }
  };

  const handleChatComplete = async (data: Partial<{ name: string; occupation: string; has9to5: boolean; categories: string[]; pillars: string[]; mainGoal: string; coachStyle: string }>) => {
    setLoading(true);

    // Chat mode collects the same information as the form wizard, just
    // conversationally — map it into the same onboarding shape so
    // completeOnboarding() (which reads from the store) persists it too.
    // `coachStyle` here is the full rendered option string (e.g. "⚔ Drill
    // Sergeant — tagline"), so resolve it back to the style id.
    const matchedCoach = COACH_STYLES.find(c => `${c.symbol} ${c.label} — ${c.tagline}` === data.coachStyle);
    const nextIdentity = {
      ...identity,
      name: data.name || identity.name,
      occupation: data.occupation || identity.occupation,
      has9to5: data.has9to5 ?? identity.has9to5,
    };
    const nextPillars = { selected: (data.pillars as PillarId[]) || selectedPillars, customPillars };
    const nextCategories = { selected: (data.categories as CategoryId[]) || selectedCategories };
    const firstPillar = nextPillars.selected[0];
    const nextGoals = firstPillar && data.mainGoal ? { ...goals, [firstPillar]: data.mainGoal } : goals;
    const nextCoachStyle = matchedCoach ? matchedCoach.id : coachStyle;

    setIdentity(nextIdentity);
    updateOnboardingStep(STEPS.length, {
      identity: nextIdentity,
      pillars: nextPillars,
      categories: nextCategories,
      goals: { goals: nextGoals, timelines: {}, goalTypes: goalTypes as Record<string, import('../types').Goal['type']> },
      schedule: { ...schedule, deepWorkWindows: deepWork },
      coachStyle: { style: nextCoachStyle },
    });

    await new Promise(r => setTimeout(r, 1000));
    await completeOnboarding();
    navigate('/dashboard');
  };

  const ModeSwitcher = ({ current }: { current: 'form' | 'chat' | 'import' }) => (
    <div className="flex items-center gap-1.5">
      {([
        { id: 'form' as const,   label: 'FORM' },
        { id: 'chat' as const,   label: 'CHAT WITH RYNA' },
        { id: 'import' as const, label: 'IMPORT FROM MY AI' },
      ]).filter(m => m.id !== current).map(m => (
        <button key={m.id} onClick={() => setOnboardingMode(m.id)}
          className="mono text-[9px] tracking-widest px-3 py-1.5 transition-all"
          style={{ border: '1px solid var(--border-dim)', color: 'var(--tx-muted)' }}>
          {m.label}
        </button>
      ))}
    </div>
  );

  if (onboarding.mode === 'import') {
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-12 grid-bg" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><polygon points="12,2 22,20 2,20" fill="var(--acid)" opacity="0.9" /><polygon points="12,8 18,18 6,18" fill="var(--bg-void)" /></svg>
              <span className="mono text-xs font-bold tracking-widest">GOALFLOW</span>
            </div>
            <ModeSwitcher current="import" />
          </div>
          <div className="mb-6">
            <p className="mono text-[9px] tracking-widest mb-2" style={{ color: 'var(--acid)' }}>IMPORT ONBOARDING</p>
            <h2 className="text-2xl font-black">Bring your own reflection.</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--tx-secondary)' }}>Skip the six-step form — hand this to your own AI, then upload what it gives back.</p>
          </div>
          <div className="p-6" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>
            <ImportOnboarding onDone={() => navigate('/dashboard')} />
          </div>
        </div>
      </div>
    );
  }

  if (onboarding.mode === 'chat') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-dim)' }}>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><polygon points="12,2 22,20 2,20" fill="var(--acid)" opacity="0.9" /><polygon points="12,8 18,18 6,18" fill="var(--bg-void)" /></svg>
            <span className="mono text-xs font-bold tracking-widest">GOALFLOW</span>
          </div>
          <ModeSwitcher current="chat" />
        </div>
        <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col">
          <div className="px-6 py-4">
            <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--acid)' }}>CHAT ONBOARDING · RYNA WILL GUIDE YOU</p>
          </div>
          <div className="flex-1" style={{ minHeight: 0 }}>
            <ChatOnboarding onComplete={handleChatComplete} />
          </div>
        </div>
        {loading && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(12,11,9,0.95)' }}>
            <div className="text-center space-y-4">
              <svg className="animate-spin w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--acid)" strokeWidth="3"/><path className="opacity-75" fill="var(--acid)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              <p className="mono text-[10px] tracking-widest" style={{ color: 'var(--acid)' }}>BUILDING YOUR EXECUTION SYSTEM...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 grid-bg" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>
      <div className="w-full max-w-2xl">
        {/* Logo + mode toggle */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><polygon points="12,2 22,20 2,20" fill="var(--acid)" opacity="0.9" /><polygon points="12,8 18,18 6,18" fill="var(--bg-void)" /></svg>
            <span className="mono text-xs font-bold tracking-widest">GOALFLOW</span>
          </div>
          <ModeSwitcher current="form" />
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="w-6 h-6 flex items-center justify-center mono text-[9px] font-bold transition-all"
                  style={{ background: i < step ? 'var(--acid)' : i === step ? 'transparent' : 'transparent', border: i === step ? '1px solid var(--acid)' : '1px solid var(--border-mid)', color: i < step ? 'var(--bg-void)' : i === step ? 'var(--acid)' : 'var(--tx-ghost)' }}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="mono text-[8px] tracking-widest hidden sm:block" style={{ color: i === step ? 'var(--acid)' : 'var(--tx-ghost)' }}>{s.toUpperCase()}</span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px flex-1 mx-1 transition-all" style={{ background: i < step ? 'var(--acid)' : 'var(--border-dim)' }} />}
            </div>
          ))}
        </div>

        {/* Step header */}
        <div className="mb-6">
          <p className="mono text-[9px] tracking-widest mb-2" style={{ color: 'var(--acid)' }}>STEP {step + 1} / {STEPS.length}</p>
          <h2 className="text-2xl font-black">
            {step === 0 && 'Who are you?'}
            {step === 1 && 'Choose your execution pillars.'}
            {step === 2 && 'Select your life categories.'}
            {step === 3 && 'Define your goals.'}
            {step === 4 && 'Design your schedule.'}
            {step === 5 && 'Choose your coach style.'}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--tx-secondary)' }}>
            {step === 0 && 'Ryna uses this to build your personalised execution system.'}
            {step === 1 && 'These are the core areas where you take daily action.'}
            {step === 2 && 'Select every life area you want to actively develop. This makes you a complete, well-rounded person.'}
            {step === 3 && 'One clear goal per pillar. What does winning look like — and is it a long-term vision or a short-term step?'}
            {step === 4 && 'Your deep work windows define your execution rhythm.'}
            {step === 5 && 'Ryna can auto-switch based on your performance data — or you can lock in a style.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}
            className="p-6 space-y-4 mb-6" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>

            {/* Step 0: Identity */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>FULL NAME</label>
                    <input type="text" value={identity.name} onChange={e => setIdentity(p => ({ ...p, name: e.target.value }))} placeholder="Alex Rivera" className={inp} style={inpStyle} onFocus={focusAcid} onBlur={blurMid} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>EMAIL</label>
                    <input type="email" value={identity.email} onChange={e => setIdentity(p => ({ ...p, email: e.target.value }))} placeholder="alex@example.com" className={inp} style={inpStyle} onFocus={focusAcid} onBlur={blurMid} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>WHAT DO YOU DO?</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(OCCUPATION_PRESETS).map(([key, { label, icon }]) => (
                      <button key={key} onClick={() => setIdentity(p => ({ ...p, occupation: key }))}
                        className="px-2 py-2.5 text-xs font-medium transition-all flex flex-col items-center gap-1"
                        style={{ background: identity.occupation === key ? 'rgba(139,92,246,0.1)' : 'var(--bg-overlay)', border: `1px solid ${identity.occupation === key ? 'var(--acid)' : 'var(--border-dim)'}`, color: identity.occupation === key ? 'var(--acid)' : 'var(--tx-secondary)' }}>
                        <span className="mono text-base">{icon}</span>
                        <span className="mono text-[8px] tracking-wide text-center">{label.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>DO YOU HAVE A 9-5 JOB?</label>
                  <div className="flex gap-2">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} onClick={() => setIdentity(p => ({ ...p, has9to5: opt === 'Yes' }))}
                        className="flex-1 py-2.5 mono text-[10px] tracking-widest font-bold transition-all"
                        style={{ background: (identity.has9to5 ? 'Yes' : 'No') === opt ? 'rgba(139,92,246,0.1)' : 'var(--bg-overlay)', border: `1px solid ${(identity.has9to5 ? 'Yes' : 'No') === opt ? 'var(--acid)' : 'var(--border-dim)'}`, color: (identity.has9to5 ? 'Yes' : 'No') === opt ? 'var(--acid)' : 'var(--tx-muted)' }}>
                        {opt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  {identity.has9to5 && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="space-y-1.5">
                        <label className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>WORK START</label>
                        <input type="time" value={identity.workStartTime} onChange={e => setIdentity(p => ({ ...p, workStartTime: e.target.value }))} className={inp} style={inpStyle} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>WORK END</label>
                        <input type="time" value={identity.workEndTime} onChange={e => setIdentity(p => ({ ...p, workEndTime: e.target.value }))} className={inp} style={inpStyle} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>TIMEZONE</label>
                    <select value={identity.timezone} onChange={e => setIdentity(p => ({ ...p, timezone: e.target.value }))} className={inp} style={inpStyle} onFocus={focusAcid} onBlur={blurMid}>
                      {TIMEZONES.map(tz => <option key={tz} value={tz} style={{ background: 'var(--bg-overlay)' }}>{tz}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>WEEKLY HOURS AVAILABLE</label>
                    <input type="number" min={1} max={80} value={identity.weeklyHours} onChange={e => setIdentity(p => ({ ...p, weeklyHours: +e.target.value }))} className={inp} style={inpStyle} onFocus={focusAcid} onBlur={blurMid} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Pillars */}
            {step === 1 && (
              <div className="space-y-3">
                {allPillars.map(p => {
                  const sel = selectedPillars.includes(p.id);
                  const isCustom = customPillars.some(cp => cp.id === p.id);
                  return (
                    <div key={p.id} onClick={() => setSelectedPillars(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-all relative"
                      style={{ background: sel ? 'rgba(139,92,246,0.05)' : 'var(--bg-overlay)', border: `1px solid ${sel ? 'var(--acid)' : 'var(--border-dim)'}` }}>
                      <span className="mono text-xl" style={{ color: sel ? 'var(--acid)' : 'var(--tx-muted)' }}>{p.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: 'var(--tx-primary)' }}>{p.label}</p>
                        <p className="mono text-[9px] mt-0.5" style={{ color: 'var(--tx-muted)' }}>{p.description.toUpperCase()}</p>
                        {p.weeklyKPIs && p.weeklyKPIs.length > 0 && (
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {p.weeklyKPIs.map(k => <span key={k} className="mono text-[8px] px-1.5 py-0.5" style={{ background: 'var(--border-dim)', color: 'var(--tx-ghost)' }}>{k}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="w-4 h-4 flex items-center justify-center shrink-0" style={{ background: sel ? 'var(--acid)' : 'transparent', border: `1px solid ${sel ? 'var(--acid)' : 'var(--border-mid)'}` }}>
                        {sel && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-void)' }} />}
                      </div>
                      {isCustom && <button onClick={e => { e.stopPropagation(); setCustomPillars(prev => prev.filter(cp => cp.id !== p.id)); setSelectedPillars(prev => prev.filter(x => x !== p.id)); }} className="absolute top-1.5 right-1.5" style={{ color: '#EF4444' }}><X className="w-3 h-3" /></button>}
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <input type="text" placeholder="Add custom pillar (e.g. Health, Academic)" value={newPillarLabel} onChange={e => setNewPillarLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newPillarLabel.trim()) { const id = newPillarLabel.toUpperCase().replace(/\s+/g,'_'); setCustomPillars(p => [...p, { id, label: newPillarLabel, description: `Custom: ${newPillarLabel}` }]); setSelectedPillars(p => [...p, id]); setNewPillarLabel(''); } }}
                    className={`flex-1 ${inp}`} style={inpStyle} onFocus={focusAcid} onBlur={blurMid} />
                  <button onClick={() => { if (!newPillarLabel.trim()) return; const id = newPillarLabel.toUpperCase().replace(/\s+/g,'_'); setCustomPillars(p => [...p, { id, label: newPillarLabel, description: `Custom: ${newPillarLabel}` }]); setSelectedPillars(p => [...p, id]); setNewPillarLabel(''); }}
                    className="px-3 py-2 mono text-[9px] font-bold flex items-center gap-1" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)' }}>
                    <Plus className="w-3.5 h-3.5" /> ADD
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Life Categories */}
            {step === 2 && (
              <div className="space-y-2">
                <p className="text-xs mb-3" style={{ color: 'var(--tx-secondary)' }}>These categories represent every dimension of a complete, high-performing person. Select all that you want to actively develop — not just professionally, but as a whole human.</p>
                <div className="grid grid-cols-2 gap-2">
                  {LIFE_CATEGORIES.map(cat => {
                    const sel = selectedCategories.includes(cat.id);
                    return (
                      <div key={cat.id} onClick={() => setSelectedCategories(p => p.includes(cat.id) ? p.filter(x => x !== cat.id) : [...p, cat.id])}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all"
                        style={{ background: sel ? `${cat.color}10` : 'var(--bg-overlay)', border: `1px solid ${sel ? cat.color + '40' : 'var(--border-dim)'}`, borderLeft: `2px solid ${sel ? cat.color : 'var(--border-dim)'}` }}>
                        <span className="text-base shrink-0">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: sel ? cat.color : 'var(--tx-primary)' }}>{cat.label}</p>
                          <p className="mono text-[8px] truncate" style={{ color: 'var(--tx-muted)' }}>{cat.description.split(',')[0].toUpperCase()}</p>
                        </div>
                        {sel && <Check className="w-3 h-3 shrink-0" style={{ color: cat.color }} />}
                      </div>
                    );
                  })}
                </div>
                <p className="mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>{selectedCategories.length} CATEGORIES SELECTED</p>
              </div>
            )}

            {/* Step 3: Goals */}
            {step === 3 && (
              <div className="space-y-5">
                {selectedPillars.map(pillarId => {
                  const p = allPillars.find(x => x.id === pillarId);
                  if (!p) return null;
                  return (
                    <div key={pillarId} className="space-y-2.5 pb-4" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <label className="mono text-[9px] tracking-widest flex items-center gap-2" style={{ color: 'var(--tx-muted)' }}>
                        <span style={{ color: p.color }}>{p.icon}</span> {p.label.toUpperCase()} — 90-DAY GOAL
                      </label>
                      <input type="text" value={goals[pillarId] ?? ''} onChange={e => setGoals(g => ({ ...g, [pillarId]: e.target.value }))}
                        placeholder={`What does winning look like for ${p.label}?`}
                        className={inp} style={inpStyle} onFocus={focusAcid} onBlur={blurMid} />
                      <div className="flex gap-1.5 flex-wrap">
                        {GOAL_TYPES.map(gt => (
                          <button key={gt.id} onClick={() => setGoalTypes(prev => ({ ...prev, [pillarId]: gt.id }))}
                            className="flex items-center gap-1 mono text-[8px] px-2 py-1 tracking-widest transition-all"
                            style={{ background: goalTypes[pillarId] === gt.id ? 'rgba(139,92,246,0.1)' : 'var(--bg-overlay)', border: `1px solid ${goalTypes[pillarId] === gt.id ? 'var(--acid)' : 'var(--border-dim)'}`, color: goalTypes[pillarId] === gt.id ? 'var(--acid)' : 'var(--tx-muted)' }}>
                            {gt.icon} {gt.label.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 4: Schedule */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>WAKE TIME</label><input type="time" value={schedule.wakeTime} onChange={e => setSchedule(s => ({ ...s, wakeTime: e.target.value }))} className={inp} style={inpStyle} /></div>
                  <div className="space-y-1.5"><label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>SLEEP TIME</label><input type="time" value={schedule.sleepTime} onChange={e => setSchedule(s => ({ ...s, sleepTime: e.target.value }))} className={inp} style={inpStyle} /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>DEEP WORK WINDOWS</label>
                    <button onClick={() => setDeepWork(w => [...w, { start: '14:00', end: '16:00' }])} className="mono text-[9px] flex items-center gap-1" style={{ color: 'var(--acid)' }}><Plus className="w-3 h-3" /> ADD</button>
                  </div>
                  {deepWork.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="time" value={w.start} onChange={e => setDeepWork(dw => dw.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} className="flex-1 px-3 py-2 text-sm outline-none" style={inpStyle} />
                      <span className="mono text-[10px]" style={{ color: 'var(--tx-muted)' }}>→</span>
                      <input type="time" value={w.end} onChange={e => setDeepWork(dw => dw.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} className="flex-1 px-3 py-2 text-sm outline-none" style={inpStyle} />
                      {deepWork.length > 1 && <button onClick={() => setDeepWork(dw => dw.filter((_, j) => j !== i))} style={{ color: 'var(--tx-muted)' }}><X className="w-3.5 h-3.5" /></button>}
                    </div>
                  ))}
                </div>
                <div className="p-3" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)', borderLeft: '2px solid var(--acid)' }}>
                  <p className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>Ryna will use your schedule to build a personalised 24-hour day plan — including spiritual time, exercise, transit, meals, and deep work blocks. You can edit any block after onboarding.</p>
                </div>
              </div>
            )}

            {/* Step 5: Coach */}
            {step === 5 && (
              <div className="space-y-2">
                <div className="p-3 mb-3" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)', borderLeft: '2px solid var(--acid)' }}>
                  <p className="mono text-[9px]" style={{ color: 'var(--acid)' }}>Ryna can automatically switch coaching styles based on your performance data. For example: if you miss 3 days in a row, she switches to Drill Sergeant. If you're burning out, she shifts to Stoic. You can also lock a style.</p>
                </div>
                {COACH_STYLES.map(cs => (
                  <div key={cs.id} onClick={() => setCoachStyle(cs.id)}
                    className="flex items-start gap-4 px-4 py-3 cursor-pointer transition-all"
                    style={{ background: coachStyle === cs.id ? 'rgba(139,92,246,0.05)' : 'var(--bg-overlay)', border: `1px solid ${coachStyle === cs.id ? 'var(--acid)' : 'var(--border-dim)'}` }}>
                    <span className="mono text-xl mt-0.5" style={{ color: coachStyle === cs.id ? 'var(--acid)' : 'var(--tx-muted)' }}>{cs.symbol}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--tx-primary)' }}>{cs.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--tx-secondary)' }}>{cs.description}</p>
                      <p className="mono text-[9px] mt-1 italic" style={{ color: 'var(--tx-muted)' }}>{cs.tagline}</p>
                      <p className="mono text-[8px] mt-1" style={{ color: 'var(--tx-ghost)' }}>AUTO-TRIGGER: {cs.trigger}</p>
                    </div>
                    <div className="w-4 h-4 mt-0.5 flex items-center justify-center shrink-0" style={{ background: coachStyle === cs.id ? 'var(--acid)' : 'transparent', border: `1px solid ${coachStyle === cs.id ? 'var(--acid)' : 'var(--border-mid)'}` }}>
                      {coachStyle === cs.id && <Check className="w-2.5 h-2.5" style={{ color: 'var(--bg-void)' }} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            className="flex items-center gap-2 mono text-[10px] tracking-widest disabled:opacity-20" style={{ color: 'var(--tx-muted)' }}>
            <ChevronLeft className="w-3.5 h-3.5" /> BACK
          </button>
          <button onClick={handleNext} disabled={loading}
            className="flex items-center gap-2 font-bold px-6 py-2.5 text-sm disabled:opacity-50"
            style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
            {loading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Building your system...</> : step === STEPS.length - 1 ? <>Launch GoalFlow <Zap className="w-4 h-4" /></> : <>Continue <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
