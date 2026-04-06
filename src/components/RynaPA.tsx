import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Send, Sparkles, CheckCircle2, Clock, Navigation, StickyNote, ListPlus, BarChart2, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RynaMode, ChatMessage, RynaActionType } from '../types';

interface RynaPAProps {
  rynaMode: RynaMode;
  rynaTranscript: string;
  rynaResponse: string | null;
  setRynaResponse: (val: string | null) => void;
  startListening: () => void;
  stopListening: () => void;
  askRyna: (query: string) => void;
  chatHistory: ChatMessage[];
}

const ACTION_ICON: Partial<Record<RynaActionType, React.ReactNode>> = {
  mark_task:   <CheckCircle2 className="w-3 h-3" />,
  start_timer: <Clock className="w-3 h-3" />,
  stop_timer:  <Clock className="w-3 h-3" />,
  reset_timer: <Clock className="w-3 h-3" />,
  navigate:    <Navigation className="w-3 h-3" />,
  add_note:    <StickyNote className="w-3 h-3" />,
  add_tasks:   <ListPlus className="w-3 h-3" />,
  get_status:  <BarChart2 className="w-3 h-3" />,
  reshuffle:   <RefreshCcw className="w-3 h-3" />,
};

const QUICK_ACTIONS = [
  'How am I doing today?',
  'Mark exercise done',
  'Start the timer',
  'Add a task at 3pm',
  'Go to analytics',
  'Note that I finished the proposal',
];

const STATUS_LABEL: Record<RynaMode, string> = {
  idle:      'Ask Ryna anything...',
  listening: 'Listening...',
  thinking:  'Thinking...',
  speaking:  'Speaking...',
};

export const RynaPA: React.FC<RynaPAProps> = ({
  rynaMode,
  rynaTranscript,
  setRynaResponse,
  startListening,
  stopListening,
  askRyna,
  chatHistory,
}) => {
  const [open, setOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isBusy = rynaMode === 'thinking' || rynaMode === 'speaking';

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, open, rynaMode]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const handleSend = () => {
    const q = textInput.trim();
    if (!q || isBusy) return;
    setTextInput('');
    askRyna(q);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (d: Date) =>
    new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            style={{ maxHeight: 'min(600px, calc(100vh - 120px))' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900",
                    rynaMode === 'idle' ? "bg-green-500" :
                    rynaMode === 'thinking' ? "bg-amber-500 animate-pulse" :
                    rynaMode === 'listening' ? "bg-red-500 animate-pulse" : "bg-blue-500 animate-pulse"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest italic">Ryna</p>
                  <p className="text-[10px] text-zinc-500">Your GoalFlow AI PA</p>
                </div>
              </div>
              <button onClick={() => { setOpen(false); setRynaResponse(null); }}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 py-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-zinc-300">Hey Samuel! I'm Ryna.</p>
                    <p className="text-xs text-zinc-600 max-w-[220px]">
                      Ask me anything, or try one of these:
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {QUICK_ACTIONS.map(a => (
                      <button key={a} onClick={() => { askRyna(a); }}
                        className="text-left text-[11px] text-zinc-400 hover:text-amber-400 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/30 rounded-xl px-3 py-2 transition-all leading-tight">
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatHistory.map(msg => (
                  <div key={msg.id} className={cn("flex gap-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    {msg.role === 'ryna' && (
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === 'user'
                        ? "bg-amber-500 text-zinc-950 font-medium rounded-br-sm"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                    )}>
                      {msg.role === 'ryna' && msg.actionType && msg.actionType !== 'advice' && (
                        <div className="flex items-center gap-1.5 mb-1.5 text-amber-500 text-[10px] font-bold uppercase tracking-widest">
                          {ACTION_ICON[msg.actionType]}
                          <span>{msg.actionType.replace('_', ' ')}</span>
                        </div>
                      )}
                      <p>{msg.text}</p>
                      <p className={cn(
                        "text-[10px] mt-1.5",
                        msg.role === 'user' ? "text-amber-900/70 text-right" : "text-zinc-600"
                      )}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {/* Thinking indicator */}
              {rynaMode === 'thinking' && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </div>
                  <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Listening transcript */}
              {rynaMode === 'listening' && rynaTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[78%] bg-amber-500/20 border border-amber-500/30 rounded-2xl rounded-br-sm px-4 py-3">
                    <p className="text-xs text-amber-400 italic">"{rynaTranscript}..."</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 pb-4 pt-3 border-t border-zinc-800 shrink-0 space-y-3">
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-2.5 focus-within:border-amber-500/60 transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={isBusy ? STATUS_LABEL[rynaMode] : STATUS_LABEL.idle}
                  disabled={isBusy}
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={rynaMode === 'listening' ? stopListening : startListening}
                  disabled={isBusy && rynaMode !== 'listening'}
                  title={rynaMode === 'listening' ? 'Stop' : 'Voice input'}
                  className={cn(
                    "p-1.5 rounded-full transition-all",
                    rynaMode === 'listening' ? "text-red-500 bg-red-500/10 animate-pulse" : "text-zinc-500 hover:text-amber-500"
                  )}
                >
                  {rynaMode === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleSend}
                  disabled={!textInput.trim() || isBusy}
                  className="p-1.5 text-amber-500 disabled:text-zinc-700 hover:text-amber-400 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center text-zinc-700">
                Ryna can add tasks, mark complete, reshuffle, set timers, log notes
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB Toggle Button ── */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setOpen(v => !v)}
          whileTap={{ scale: 0.9 }}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all",
            open
              ? "bg-zinc-800 border border-zinc-700 text-zinc-400"
              : rynaMode === 'listening'
                ? "bg-red-500 text-white animate-pulse"
                : rynaMode === 'thinking' || rynaMode === 'speaking'
                  ? "bg-amber-500/50 text-zinc-950 cursor-wait"
                  : "bg-amber-500 text-zinc-950 hover:bg-amber-400"
          )}
          title={open ? 'Close Ryna' : 'Chat with Ryna'}
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Sparkles className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Unread dot — show when new Ryna message arrives and panel is closed */}
        {!open && chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.role === 'ryna' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-zinc-950 flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">
              {chatHistory.filter(m => m.role === 'ryna').length}
            </span>
          </div>
        )}
      </div>
    </>
  );
};
