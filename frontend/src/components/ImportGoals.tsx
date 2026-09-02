import { useState, useRef, useEffect } from 'react';
import { Check, Copy, FileText, Loader2, Trash2, ArrowLeft, Upload, Zap } from 'lucide-react';
import { useStore } from '../lib/store';
import { TIMELINE_TYPES, IMPORT_HANDOFF_PROMPT } from '../lib/constants';
import type { ImportDraftGoal } from '../types';

// Mirrors backend's MAX_IMPORT_BYTES (doc_parser.py) — reject an oversized
// file at selection instead of letting the user wait on a full upload just
// to have it bounce.
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/**
 * AI-import goal training: the user takes IMPORT_HANDOFF_PROMPT to their own
 * AI assistant, refines the result there (that conversation stays theirs),
 * and uploads what it hands back. Parsed into a draft below — nothing is
 * written until the user reviews/edits it and confirms.
 *
 * Used in two places: Onboarding's "Import" mode (a fresh account) and the
 * "Train Ryna" tab in the global Ryna chat panel (an existing user adding
 * more goals later, e.g. because they skipped this during onboarding, or
 * just have more to add). Shared here rather than duplicated so both stay
 * in sync automatically.
 */
export default function ImportGoals({ onDone }: { onDone: (goalsCreated: number) => void }) {
  const {
    goalImportDraft, goalImportLoading, goalImportError,
    submitGoalImport, updateGoalImportDraft, confirmGoalImport, clearGoalImportDraft,
  } = useStore();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [slowHint, setSlowHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Render's free-tier backend can take up to ~60s to wake from a cold
  // start — without this, the extraction spinner reads as hung well before
  // it actually is. Only surface the reassurance once it's been a genuine
  // wait, not on every normal (fast) extraction.
  useEffect(() => {
    if (!goalImportLoading) { setSlowHint(false); return; }
    const t = setTimeout(() => setSlowHint(true), 8000);
    return () => clearTimeout(t);
  }, [goalImportLoading]);

  const handleFileSelect = (f: File | null) => {
    setFileError('');
    if (f && f.size > MAX_IMPORT_BYTES) {
      setFile(null);
      setFileError(`That file is ${(f.size / (1024 * 1024)).toFixed(1)}MB — 2MB max. Try trimming it down.`);
      return;
    }
    setFile(f);
  };

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
    const count = goalImportDraft?.goals.length ?? 0;
    setConfirming(true); setConfirmError('');
    try {
      await confirmGoalImport();
      onDone(count);
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
            <p className="text-xs py-6 text-center" style={{ color: 'var(--tx-ghost)' }}>Every goal was removed — start over, or add goals manually instead.</p>
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
            {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <>Confirm & add <Zap className="w-4 h-4" /></>}
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
          onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
        <button onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 py-8 transition-all"
          style={{ border: '1px dashed var(--border-mid)', background: 'var(--bg-overlay)' }}>
          <FileText className="w-6 h-6" style={{ color: file ? 'var(--acid)' : 'var(--tx-ghost)' }} />
          <span className="text-sm" style={{ color: file ? 'var(--tx-primary)' : 'var(--tx-muted)' }}>
            {file ? file.name : 'Click to choose a .md, .txt, or .docx file'}
          </span>
        </button>
        {fileError && <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{fileError}</p>}
        {goalImportError && <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{goalImportError}</p>}
      </div>

      <button onClick={handleUpload} disabled={!file || goalImportLoading}
        className="w-full flex items-center justify-center gap-2 py-3 font-bold text-sm disabled:opacity-50"
        style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
        {goalImportLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading your goals...</> : <><Upload className="w-4 h-4" /> Extract my goals</>}
      </button>
      {slowHint && (
        <p className="text-xs text-center -mt-2" style={{ color: 'var(--tx-muted)' }}>
          Still working — the server naps when idle, so its first request after a while can take up to a minute.
        </p>
      )}
    </div>
  );
}
