import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Minimize2, Maximize2, Zap, ChevronRight } from 'lucide-react';
import { useStore } from '../../lib/store';
import { RYNA_QUICK_ACTIONS, COACH_STYLES } from '../../lib/constants';
import type { MCPAction } from '../../types';

function MCPActionCard({ action, onExecute, executed }: { action: MCPAction; onExecute: () => void; executed: boolean }) {
  return (
    <div className="mt-2 p-2.5" style={{ background: 'rgba(212,245,60,0.06)', border: '1px solid rgba(212,245,60,0.2)', borderLeft: '2px solid var(--acid)' }}>
      <p className="mono text-[8px] tracking-widest mb-1.5" style={{ color: 'var(--acid)' }}>RYNA CAN DO THIS FOR YOU</p>
      <p className="text-xs mb-2" style={{ color: 'var(--tx-secondary)' }}>{action.preview}</p>
      <button onClick={onExecute} disabled={executed}
        className="flex items-center gap-1.5 mono text-[9px] font-bold px-3 py-1.5 transition-all disabled:opacity-50"
        style={{ background: executed ? 'rgba(0,212,180,0.1)' : 'var(--acid)', color: executed ? '#00d4b4' : 'var(--bg-void)', border: executed ? '1px solid rgba(0,212,180,0.3)' : 'none' }}>
        {executed ? '✓ EXECUTED' : <><Zap className="w-3 h-3" /> EXECUTE ACTION</>}
      </button>
    </div>
  );
}

export default function RynaChat() {
  const { chatMessages, chatLoading, sendChatMessage, setChatOpen, executeMCPAction, user, switchCoachStyle } = useStore();
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [executedActions, setExecutedActions] = useState<Set<string>>(new Set());
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, chatLoading]);
  useEffect(() => { if (!minimized) inputRef.current?.focus(); }, [minimized]);

  const handleSend = async () => {
    if (!input.trim() || chatLoading) return;
    const msg = input; setInput('');
    await sendChatMessage(msg);
  };

  const handleExecuteMCP = async (msgId: string, action: MCPAction) => {
    setExecutingId(msgId);
    const result = await executeMCPAction(action);
    setExecutedActions(prev => new Set([...prev, msgId]));
    setExecutingId(null);
    setResultMsg(result);
    setTimeout(() => setResultMsg(null), 4000);
  };

  const coachInfo = COACH_STYLES.find(c => c.id === user?.coachStyle);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className="fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden"
      style={{ width: 380, height: minimized ? 52 : 600, background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', borderTop: '2px solid #00d4b4', transition: 'height 0.2s ease' }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 shrink-0" style={{ borderBottom: minimized ? 'none' : '1px solid var(--border-dim)' }}>
        <div className="w-6 h-6 flex items-center justify-center shrink-0" style={{ background: 'rgba(0,212,180,0.15)', border: '1px solid rgba(0,212,180,0.3)' }}>
          <Zap className="w-3 h-3" style={{ color: '#00d4b4' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] font-black tracking-widest" style={{ color: '#00d4b4' }}>RYNA</span>
            <span className="w-1 h-1 rounded-full pulse-dot" style={{ background: '#00d4b4' }} />
            {!minimized && coachInfo && (
              <span className="mono text-[8px] px-1.5 py-0.5" style={{ color: 'var(--tx-muted)', border: '1px solid var(--border-dim)' }}>
                {coachInfo.symbol} {coachInfo.label.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(!minimized)} className="p-1.5 transition-colors" style={{ color: 'var(--tx-muted)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--tx-primary)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx-muted)')}>
            {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
          <button onClick={() => setChatOpen(false)} className="p-1.5 transition-colors" style={{ color: 'var(--tx-muted)' }} onMouseEnter={e => (e.currentTarget.style.color = '#ff4444')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx-muted)')}>
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* MCP Result banner */}
          <AnimatePresence>
            {resultMsg && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2.5 mono text-[9px] shrink-0" style={{ background: 'rgba(0,212,180,0.08)', borderBottom: '1px solid rgba(0,212,180,0.2)', color: '#00d4b4' }}>
                ✓ {resultMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {chatMessages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%]">
                  {msg.role === 'assistant' && (
                    <p className="mono text-[8px] tracking-widest mb-1" style={{ color: '#00d4b4' }}>RYNA</p>
                  )}
                  <div className="px-3 py-2.5 text-xs leading-relaxed whitespace-pre-line"
                    style={{
                      background: msg.role === 'user' ? 'rgba(212,245,60,0.07)' : 'var(--bg-raised)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(212,245,60,0.18)' : 'var(--border-dim)'}`,
                      color: msg.role === 'user' ? 'var(--acid)' : 'var(--tx-secondary)',
                      borderLeft: msg.role === 'assistant' ? '2px solid #00d4b4' : undefined,
                    }}>
                    {msg.content}
                  </div>

                  {/* MCP Action card */}
                  {msg.role === 'assistant' && msg.quickActions?.map(qa => qa.mcpAction && (
                    <MCPActionCard key={qa.id} action={qa.mcpAction}
                      executed={executedActions.has(msg.id + qa.id) || executingId === msg.id + qa.id}
                      onExecute={() => handleExecuteMCP(msg.id + qa.id, qa.mcpAction!)} />
                  ))}

                  {/* Quick action chips */}
                  {msg.role === 'assistant' && msg.quickActions && msg.quickActions.some(qa => !qa.mcpAction) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.quickActions.filter(qa => !qa.mcpAction).map(qa => (
                        <button key={qa.id} onClick={() => sendChatMessage(qa.prompt)}
                          className="flex items-center gap-1 mono text-[9px] px-2 py-1 transition-all"
                          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--acid)'; e.currentTarget.style.color = 'var(--acid)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--tx-secondary)'; }}>
                          {qa.icon} {qa.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {chatLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="px-3 py-2.5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderLeft: '2px solid #00d4b4' }}>
                  <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full animate-bounce" style={{ background: '#00d4b4', animationDelay: `${i*0.15}s` }} />)}</div>
                </div>
              </motion.div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick actions */}
          <div className="px-3 py-2 no-scrollbar overflow-x-auto shrink-0" style={{ borderTop: '1px solid var(--border-dim)' }}>
            <div className="flex gap-1.5 w-max">
              {RYNA_QUICK_ACTIONS.map(qa => (
                <button key={qa.id} onClick={() => sendChatMessage(qa.prompt)} disabled={chatLoading}
                  className="flex items-center gap-1 mono text-[9px] px-2.5 py-1.5 whitespace-nowrap transition-all disabled:opacity-30"
                  style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', color: 'var(--tx-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--acid)'; e.currentTarget.style.borderColor = 'rgba(212,245,60,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx-muted)'; e.currentTarget.style.borderColor = 'var(--border-dim)'; }}>
                  <span>{qa.icon}</span>{qa.label.toUpperCase()}
                  {qa.mcpAction && <ChevronRight className="w-2.5 h-2.5 opacity-50" />}
                </button>
              ))}
            </div>
          </div>

          {/* Coach style switcher */}
          <div className="px-3 pb-1 no-scrollbar overflow-x-auto shrink-0">
            <div className="flex gap-1.5 w-max">
              {COACH_STYLES.map(cs => (
                <button key={cs.id} onClick={() => switchCoachStyle(cs.id)}
                  className="mono text-[8px] px-2 py-1 whitespace-nowrap transition-all"
                  style={{
                    background: user?.coachStyle === cs.id ? 'rgba(212,245,60,0.08)' : 'transparent',
                    border: `1px solid ${user?.coachStyle === cs.id ? 'var(--acid)' : 'var(--border-dim)'}`,
                    color: user?.coachStyle === cs.id ? 'var(--acid)' : 'var(--tx-ghost)',
                  }}>
                  {cs.symbol} {cs.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 shrink-0" style={{ borderTop: '1px solid var(--border-dim)' }}>
            <div className="flex gap-2">
              <input ref={inputRef} type="text" placeholder="Message Ryna or give a voice command..." value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={chatLoading}
                className="flex-1 px-3 py-2 text-xs outline-none transition-all"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', color: 'var(--tx-primary)' }}
                onFocus={e => (e.target.style.borderColor = '#00d4b4')}
                onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
              <button onClick={handleSend} disabled={!input.trim() || chatLoading}
                className="px-3 py-2 transition-all disabled:opacity-30"
                style={{ background: 'rgba(0,212,180,0.1)', border: '1px solid rgba(0,212,180,0.25)', color: '#00d4b4' }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="mono text-[8px] mt-1.5" style={{ color: 'var(--tx-ghost)' }}>
              Ryna can add tasks, reshuffle your day, draft emails, and more — just ask.
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
}
