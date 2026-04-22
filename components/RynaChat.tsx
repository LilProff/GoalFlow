'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot,
  User,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';
import { useApi } from '@/hooks/useApi';

interface RynaChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RynaChat({ isOpen, onClose }: RynaChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ryna'; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognizer, setRecognizer] = useState<any>(null);
  const { user, pillarGoals, todayLog, stats } = useStore();
  const { chatWithRyna } = useApi();
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await chatWithRyna(
        user.id,
        userMessage,
        pillarGoals as unknown as Record<string, string> || {
          BUILD: '',
          SHOW: '',
          EARN: '',
          SYSTEMIZE: '',
        },
        todayLog as unknown as Record<string, unknown>,
        stats as unknown as Record<string, unknown>,
        user.coachingStyle
      );
      
      setMessages(prev => [...prev, { role: 'ryna', content: response.response }]);
    } catch {
      setMessages(prev => [...prev, { 
        role: 'ryna', 
        content: "I'm having trouble connecting. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Initialize speech recognizer (Web Speech API)
  const initRecognizer = () => {
    const Resp = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!Resp) return null;
    const r = new Resp();
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (ev: any) => {
      const transcript = Array.from(ev.results).map((r: any) => r[0].transcript).join(' ');
      if (transcript) {
        setInput(transcript);
        // automatically send after a short delay to ensure UI updates
        setTimeout(() => handleSend(), 100);
      }
      setListening(false);
    };
    r.onerror = () => setListening(false);
    return r;
  };

  const startListening = () => {
    if (listening) {
      recognizer?.stop?.();
      setListening(false);
      return;
    }
    let r = recognizer;
    if (!r) {
      r = initRecognizer();
      if (r) setRecognizer(r);
    }
    if (r) {
      r.start();
      setListening(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-end p-4"
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="w-full max-w-md h-[500px] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100">Ryna</h3>
                  <p className="text-xs text-zinc-500">AI Coach</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">
                    Hi! I'm Ryna, your AI accountability coach.
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Ask me anything about your goals, tasks, or progress.
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-2',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'ryna' && (
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      </div>
                    )}
                    <div className={cn(
                      'max-w-[80%] p-3 rounded-xl text-sm',
                      msg.role === 'user'
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-100'
                    )}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 mt-1">
                        <User className="w-3 h-3 text-zinc-300" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-xl">
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask Ryna..."
                className="flex-1 p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-3 rounded-xl bg-amber-500 text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
              <button
                onClick={startListening}
                className={cn(
                  'p-3 rounded-xl bg-zinc-700 border border-zinc-600 text-sm',
                  listening ? 'text-amber-400' : 'text-zinc-200'
                )}
              >
                <span className="w-4 h-4 inline-block mr-1">🎤</span>
                {listening ? 'Listening' : 'Speak'}
              </button>
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
