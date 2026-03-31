import React from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { RynaMode } from '../types';

interface RynaPAProps {
  rynaMode: RynaMode;
  rynaTranscript: string;
  rynaResponse: string | null;
  setRynaResponse: (val: string | null) => void;
  startListening: () => void;
  stopListening: () => void;
}

export const RynaPA: React.FC<RynaPAProps> = ({
  rynaMode,
  rynaTranscript,
  rynaResponse,
  setRynaResponse,
  startListening,
  stopListening
}) => {
  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      {rynaResponse && (
        <div className="max-w-xs bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ryna</span>
            </div>
            <button 
              onClick={() => setRynaResponse(null)} 
              className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-zinc-500" />
            </button>
          </div>
          <p className="text-sm text-zinc-200 leading-relaxed italic">"{rynaResponse}"</p>
        </div>
      )}

      {rynaTranscript && rynaMode === 'listening' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 pointer-events-auto animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xs text-amber-500 font-mono italic">"{rynaTranscript}..."</p>
        </div>
      )}

      <div className="flex items-center gap-3 pointer-events-auto">
        {rynaMode !== 'idle' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
            <div className="flex gap-1">
              <div className={cn("w-1 h-1 rounded-full bg-amber-500", rynaMode === 'thinking' && "animate-bounce")} />
              <div className={cn("w-1 h-1 rounded-full bg-amber-500", rynaMode === 'thinking' && "animate-bounce delay-75")} />
              <div className={cn("w-1 h-1 rounded-full bg-amber-500", rynaMode === 'thinking' && "animate-bounce delay-150")} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {rynaMode === 'listening' ? 'Listening' : rynaMode === 'thinking' ? 'Thinking' : 'Speaking'}
            </span>
          </div>
        )}
        
        <button 
          onClick={rynaMode === 'listening' ? stopListening : startListening}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-90",
            rynaMode === 'listening' ? "bg-red-500 text-white animate-pulse" : "bg-amber-500 text-zinc-950 hover:bg-amber-400"
          )}
        >
          {rynaMode === 'listening' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};
