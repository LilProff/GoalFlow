import React, { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
  RynaMode,
  RynaAction,
  ScheduleItem,
  GlobalData,
  DailyData,
  Task,
  ToastType,
} from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string;
const MODEL = 'google/gemini-2.0-flash-exp:free';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function callAI(prompt: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'GoalFlow',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? '';
}

/**
 * Robust JSON extractor — handles:
 * - Plain JSON
 * - ```json ... ``` blocks
 * - JSON embedded in prose
 */
function extractJSON(text: string): unknown {
  // Strip markdown fences
  const stripped = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();

  // Try the whole string first
  try {
    return JSON.parse(stripped);
  } catch { /* continue */ }

  // Find first { } or [ ] block
  const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    return JSON.parse(match[0]);
  }

  throw new Error(`No valid JSON in AI response: ${text.slice(0, 200)}`);
}

function getLast7DaysSummary(history: Record<string, DailyData>): string {
  const lines: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = format(d, 'yyyy-MM-dd');
    const data = history[key];
    if (data) {
      const rate = Math.round(
        (data.tasks.filter(t => t.completed).length / Math.max(data.tasks.length, 1)) * 100
      );
      lines.push(`${key}: ${rate}% (${data.tasks.filter(t => t.completed).length}/${data.tasks.length} tasks)`);
    }
  }
  return lines.length ? lines.join('\n') : 'No history yet.';
}

// ─── Hook interface ─────────────────────────────────────────────────────────

export interface RynaCallbacks {
  onMarkTask: (keyword: string, completed: boolean) => string;
  onTimerAction: (action: 'start' | 'stop' | 'reset') => void;
  onNavigate: (tab: 'tasks' | 'schedule' | 'analytics' | 'settings') => void;
  onAddNote: (field: 'accomplished' | 'blocked' | 'grateful', content: string) => void;
  onGetStatus: () => string;
  notify: (title: string, body: string, type?: ToastType) => void;
}

export function useRyna(
  currentSchedule: ScheduleItem[],
  goals: GlobalData['goals'],
  taskCompletionRate: number,
  dateKey: string,
  tasks: Task[],
  historyLast7Days: Record<string, DailyData>,
  setDailyData: React.Dispatch<React.SetStateAction<DailyData>>,
  setGlobalData: React.Dispatch<React.SetStateAction<GlobalData>>,
  callbacks: RynaCallbacks
) {
  const [rynaMode, setRynaMode] = useState<RynaMode>('idle');
  const [rynaTranscript, setRynaTranscript] = useState('');
  const [rynaResponse, setRynaResponse] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  const recognitionRef = useRef<any>(null);

  // ── TTS ──────────────────────────────────────────────────────────────────

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.05;
    utterance.onstart = () => setRynaMode('speaking');
    utterance.onend = () => setRynaMode('idle');
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Schedule reshuffle ───────────────────────────────────────────────────

  const handleReshuffle = useCallback(async (reason: string, impromptuTasks: string[] = []) => {
    setIsCoachLoading(true);
    setRynaMode('thinking');

    const prompt = `You are Ryna, Samuel's GoalFlow AI Personal Assistant. Be direct and energetic.

Current Time: ${format(new Date(), 'HH:mm')}
Today's Date: ${dateKey}
Reason for reshuffle: ${reason}
Impromptu tasks to add: ${impromptuTasks.length ? impromptuTasks.join(', ') : 'none'}
Samuel's Monthly Goal: ${goals.monthly}
Current Schedule: ${JSON.stringify(currentSchedule)}
Today's completion so far: ${taskCompletionRate.toFixed(0)}%

Produce a revised schedule for the remainder of today. Keep completed blocks, adjust upcoming ones.
Return ONLY a JSON object (no markdown) with exactly these fields:
{
  "schedule": [{"time": "HH:mm", "activity": "...", "category": "CAREER|PROJECT|SPIRITUAL|PHYSICAL|LEARNING|CONTENT|REST|OTHER", "notes": "optional"}],
  "advice": "A short motivational message (1-2 sentences max)"
}`;

    try {
      const text = await callAI(prompt);
      const result = extractJSON(text) as { schedule?: ScheduleItem[]; advice?: string };

      if (result.schedule?.length) {
        setDailyData(prev => {
          const newData = { ...prev, customSchedule: result.schedule };
          setGlobalData(g => ({
            ...g,
            history: { ...(g.history ?? {}), [dateKey]: newData },
          }));
          return newData;
        });
      }

      const advice = result.advice ?? 'Schedule updated. Stay focused!';
      setRynaResponse(advice);
      speak(advice);
      callbacks.notify('Schedule Reshuffled', advice, 'success');
    } catch (err) {
      const msg = 'Unable to reshuffle right now. Check your API key or try again.';
      console.error('Ryna reshuffle failed:', err);
      setRynaResponse(msg);
      speak(msg);
      callbacks.notify('Ryna Error', msg, 'warning');
    } finally {
      setIsCoachLoading(false);
      setRynaMode(prev => (prev === 'thinking' ? 'idle' : prev));
    }
  }, [currentSchedule, goals, taskCompletionRate, dateKey, setDailyData, setGlobalData, speak, callbacks]);

  // ── Execute action returned by AI ────────────────────────────────────────

  const executeAction = useCallback(async (action: RynaAction) => {
    switch (action.type) {
      case 'mark_task': {
        const result = callbacks.onMarkTask(action.taskKeyword ?? '', action.completed ?? true);
        setRynaResponse(result);
        speak(result);
        callbacks.notify('Task Updated', result, 'success');
        break;
      }

      case 'start_timer': {
        callbacks.onTimerAction('start');
        const msg = 'Pomodoro started. 25 minutes of deep focus. Let\'s go!';
        setRynaResponse(msg);
        speak(msg);
        callbacks.notify('Timer Started', '25-minute focus session active', 'success');
        break;
      }

      case 'stop_timer': {
        callbacks.onTimerAction('stop');
        const msg = 'Timer paused. Pick it back up when you\'re ready.';
        setRynaResponse(msg);
        speak(msg);
        break;
      }

      case 'reset_timer': {
        callbacks.onTimerAction('reset');
        const msg = 'Timer reset to 25 minutes. Fresh start!';
        setRynaResponse(msg);
        speak(msg);
        break;
      }

      case 'navigate': {
        const tab = action.tab ?? 'tasks';
        callbacks.onNavigate(tab);
        const msg = `Switched to ${tab} view.`;
        setRynaResponse(msg);
        speak(msg);
        break;
      }

      case 'add_note': {
        if (action.noteField && action.noteContent) {
          callbacks.onAddNote(action.noteField, action.noteContent);
          const msg = `Got it — added to your ${action.noteField} reflection.`;
          setRynaResponse(msg);
          speak(msg);
          callbacks.notify('Note Saved', `${action.noteField}: ${action.noteContent.slice(0, 60)}`, 'success');
        }
        break;
      }

      case 'get_status': {
        const status = callbacks.onGetStatus();
        setRynaResponse(status);
        speak(status);
        break;
      }

      case 'reshuffle':
        await handleReshuffle(action.reason ?? 'User request', action.impromptu ?? []);
        break;

      case 'advice':
      default: {
        const msg = action.message ?? "You're doing great, Samuel. Keep pushing!";
        setRynaResponse(msg);
        speak(msg);
        break;
      }
    }
  }, [callbacks, speak, handleReshuffle]);

  // ── Main AI query ────────────────────────────────────────────────────────

  const askRyna = useCallback(async (query: string) => {
    setIsCoachLoading(true);
    setRynaMode('thinking');

    const tasksList = tasks
      .map(t => `- [${t.completed ? 'X' : ' '}] ${t.label} (${t.category})`)
      .join('\n');

    const prompt = `You are Ryna, Samuel's GoalFlow AI Personal Assistant. You know him well — be direct, energetic, no fluff.

Current Date/Time: ${format(new Date(), 'EEEE, MMMM d yyyy HH:mm')}
Samuel's Monthly Goal: ${goals.monthly} (target level: ${goals.levels[goals.currentLevelIndex]})
Today's Progress: ${taskCompletionRate.toFixed(0)}% tasks done

Today's Tasks:
${tasksList}

Last 7 Days:
${getLast7DaysSummary(historyLast7Days)}

Current Schedule (active): ${JSON.stringify(currentSchedule.slice(0, 6))}...

Samuel says: "${query}"

Determine the best action and return ONLY a JSON object (no markdown). Choose ONE type:
- {"type": "advice", "message": "1-2 sentence response"}
- {"type": "get_status"}
- {"type": "mark_task", "taskKeyword": "keyword from task name", "completed": true}
- {"type": "start_timer"}
- {"type": "stop_timer"}
- {"type": "reset_timer"}
- {"type": "navigate", "tab": "tasks|schedule|analytics|settings"}
- {"type": "add_note", "noteField": "accomplished|blocked|grateful", "noteContent": "the note text"}
- {"type": "reshuffle", "reason": "short reason", "impromptu": ["any new tasks"]}

Match the intent precisely. For "note that..." → add_note. For "mark X done" → mark_task. For "start timer/pomodoro" → start_timer.`;

    try {
      const text = await callAI(prompt);
      const action = extractJSON(text) as RynaAction;
      await executeAction(action);
    } catch (err) {
      const msg = "I'm having trouble connecting right now, Samuel. Check your OpenRouter API key.";
      console.error('Ryna askRyna failed:', err);
      setRynaResponse(msg);
      speak(msg);
      callbacks.notify('Ryna Error', 'AI connection failed', 'warning');
    } finally {
      setIsCoachLoading(false);
      setRynaMode(prev => (prev === 'thinking' ? 'idle' : prev));
    }
  }, [goals, taskCompletionRate, tasks, historyLast7Days, currentSchedule, executeAction, speak, callbacks]);

  // ── Voice recognition ────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      callbacks.notify(
        'Speech Not Supported',
        'Your browser does not support voice input. Try Chrome.',
        'warning'
      );
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRynaMode('listening');
      setRynaTranscript('');
    };

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript;
      setRynaTranscript(transcript);

      if (last.isFinal) {
        const lower = transcript.toLowerCase().trim();
        // Strip "ryna" wake word if present
        const command = lower.startsWith('ryna')
          ? transcript.slice(4).trim()
          : transcript.trim();

        if (!command) {
          const msg = "Yes Samuel, I'm listening. What do you need?";
          setRynaResponse(msg);
          speak(msg);
          setRynaMode('idle');
        } else {
          askRyna(command);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        callbacks.notify('Voice Error', `Speech recognition: ${event.error}`, 'warning');
      }
      setRynaMode('idle');
    };

    recognition.onend = () => {
      setRynaMode(prev => (prev === 'listening' ? 'idle' : prev));
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [askRyna, speak, callbacks]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return {
    rynaMode,
    rynaTranscript,
    rynaResponse,
    isCoachLoading,
    setRynaResponse,
    startListening,
    stopListening,
    askRyna,
    handleReshuffle,
  };
}
