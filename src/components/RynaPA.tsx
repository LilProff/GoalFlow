import React, { useState } from 'react';
import { Mic, MicOff, X, Send, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { RynaMode } from '../types';

interface RynaPAProps {
  rynaMode: RynaMode;
  rynaTranscript: string;
  rynaResponse: string | null;
  setRynaResponse: (val: string | null) => void;
  startListening: () => void;
  stopListening: () => void;
  askRyna: (query: string) => void;
}

const VOICE_HINTS = [
  'Mark exercise done',
  'Start the timer',
  'Reshuffle my day',
  'How am I doing?',
  'Go to analytics',
  'Note I finished the proposal',
];

const STATUS_LABEL: Record<RynaMode, string> = {
  idle: 'Ryna',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
};

export const RynaPA: React.FC<RynaPAProps> = ({
  rynaMode,
  rynaTranscript,
  rynaResponse,
  setRynaResponse,
  startListening,
  stopListening,
  askRyna,
}) => {
  const [textInput, setTextInput] = useState('');
  const [showHints, setShowHints] = useState(false);

  const handleTextSend = () => {
    const q = textInput.trim();
    if (!q) return;
    setTextInput('');
    setShowHints(false);
    askRyna(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">

      {/* Response bubble */}
      {rynaResponse && (
        <div className="max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Ryna</span>
            </div>
            <button
              onClick={() => setRynaResponse(null)}
              className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed">"{rynaResponse}"</p>
        </div>
      )}

      {/* Live transcript */}
      {rynaTranscript && rynaMode === 'listening' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 pointer-events-none">
          <p className="text-xs text-amber-400 font-mono italic">"{rynaTranscript}..."</p>
        </div>
      )}

      {/* Voice command hints */}
      {showHints && rynaMode === 'idle' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 shadow-xl pointer-events-auto w-56 space-y-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Try saying...</p>
          {VOICE_HINTS.map(hint => (
            <button
              key={hint}
              onClick={() => {
                setShowHints(false);
                askRyna(hint);
              }}
              className="w-full text-left text-xs text-zinc-300 hover:text-amber-400 hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors font-mono"
            >
              "{hint}"
            </button>
          ))}
        </div>
      )}

      {/* Text input */}
      {showHints && rynaMode === 'idle' && (
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-2 shadow-xl pointer-events-auto w-56">
          <input
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleTextSend}
            disabled={!textInput.trim()}
            className="p-1 text-amber-500 disabled:text-zinc-700 hover:text-amber-400 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-3 pointer-events-auto">

        {/* Status pill */}
        {rynaMode !== 'idle' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 shadow-xl flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 75, 150].map(delay => (
                <div
                  key={delay}
                  className="w-1 h-1 rounded-full bg-amber-500 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {STATUS_LABEL[rynaMode]}
            </span>
          </div>
        )}

        {/* Hint toggle */}
        <button
          onClick={() => setShowHints(v => !v)}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg",
            showHints
              ? "bg-amber-500/20 border border-amber-500/40 text-amber-500"
              : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300"
          )}
          title="Text / command hints"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Mic button */}
        <button
          onClick={rynaMode === 'listening' ? stopListening : startListening}
          disabled={rynaMode === 'thinking' || rynaMode === 'speaking'}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-90",
            rynaMode === 'listening'
              ? "bg-red-500 text-white animate-pulse"
              : rynaMode === 'thinking' || rynaMode === 'speaking'
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-amber-500 text-zinc-950 hover:bg-amber-400"
          )}
          title={rynaMode === 'listening' ? 'Stop listening' : 'Talk to Ryna'}
        >
          {rynaMode === 'listening' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};
