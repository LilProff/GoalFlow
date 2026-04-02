import React, { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
  RynaMode,
  RynaAction,
  ImpromptuTask,
  ScheduleItem,
  GlobalData,
  DailyData,
  Task,
  ToastType,
} from '../types';

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiChat(payload: object): Promise<RynaAction> {
  const res = await fetch('/api/v1/ryna/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.action as RynaAction;
}

async function apiReshuffle(payload: object): Promise<{ schedule: ScheduleItem[]; advice: string }> {
  const res = await fetch('/api/v1/ryna/reshuffle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.action as { schedule: ScheduleItem[]; advice: string };
}

// ─── Callbacks interface ──────────────────────────────────────────────────────

export interface RynaCallbacks {
  onMarkTask: (keyword: string, completed: boolean) => string;
  onTimerAction: (action: 'start' | 'stop' | 'reset') => void;
  onNavigate: (tab: 'tasks' | 'schedule' | 'analytics' | 'settings') => void;
  onAddNote: (field: 'accomplished' | 'blocked' | 'grateful', content: string) => void;
  onAddTasks: (tasks: ImpromptuTask[]) => string;
  onGetStatus: () => string;
  notify: (title: string, body: string, type?: ToastType) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

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

  // ── TTS ────────────────────────────────────────────────────────────────────

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

  // ── Execute action ─────────────────────────────────────────────────────────

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
        const msg = "Pomodoro started. 25 minutes of deep focus — let's go!";
        setRynaResponse(msg); speak(msg);
        callbacks.notify('Timer Started', '25-minute focus session active', 'success');
        break;
      }
      case 'stop_timer': {
        callbacks.onTimerAction('stop');
        const msg = 'Timer paused. Pick it back up when ready.';
        setRynaResponse(msg); speak(msg);
        break;
      }
      case 'reset_timer': {
        callbacks.onTimerAction('reset');
        const msg = 'Timer reset to 25 minutes. Fresh start!';
        setRynaResponse(msg); speak(msg);
        break;
      }
      case 'navigate': {
        const tab = action.tab ?? 'tasks';
        callbacks.onNavigate(tab);
        const msg = `Switched to ${tab} view.`;
        setRynaResponse(msg); speak(msg);
        break;
      }
      case 'add_note': {
        if (action.noteField && action.noteContent) {
          callbacks.onAddNote(action.noteField, action.noteContent);
          const msg = `Got it — added to your ${action.noteField} reflection.`;
          setRynaResponse(msg); speak(msg);
          callbacks.notify('Note Saved', `${action.noteField}: ${action.noteContent.slice(0, 60)}`, 'success');
        }
        break;
      }
      case 'add_tasks': {
        if (!action.tasks?.length) {
          const msg = "I couldn't parse any tasks. Try: \"Add a client call at 3pm.\"";
          setRynaResponse(msg); speak(msg);
          break;
        }
        const result = callbacks.onAddTasks(action.tasks);
        setRynaResponse(result); speak(result);
        callbacks.notify('Tasks Added', result, 'success');
        break;
      }
      case 'get_status': {
        const status = callbacks.onGetStatus();
        setRynaResponse(status); speak(status);
        break;
      }
      case 'reshuffle':
        await handleReshuffle(action.reason ?? 'User request', action.impromptu ?? []);
        break;
      case 'advice':
      default: {
        const msg = action.message ?? "You're doing great, Samuel. Keep pushing!";
        setRynaResponse(msg); speak(msg);
        break;
      }
    }
  }, [callbacks, speak]); // handleReshuffle added below via ref trick

  // ── Schedule reshuffle ─────────────────────────────────────────────────────

  const handleReshuffle = useCallback(async (reason: string, impromptuTasks: string[] = []) => {
    setIsCoachLoading(true);
    setRynaMode('thinking');
    try {
      const result = await apiReshuffle({
        reason,
        impromptu_tasks: impromptuTasks,
        current_schedule: currentSchedule,
        goals,
        task_completion_rate: taskCompletionRate,
        date_key: dateKey,
      });

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
      const msg = 'Unable to reshuffle right now. Is the backend running?';
      console.error('Ryna reshuffle failed:', err);
      setRynaResponse(msg); speak(msg);
      callbacks.notify('Ryna Error', String(err), 'warning');
    } finally {
      setIsCoachLoading(false);
      setRynaMode(prev => prev === 'thinking' ? 'idle' : prev);
    }
  }, [currentSchedule, goals, taskCompletionRate, dateKey, setDailyData, setGlobalData, speak, callbacks]);

  // ── Main AI query ───────────────────────────────────────────────────────────

  const askRyna = useCallback(async (query: string) => {
    setIsCoachLoading(true);
    setRynaMode('thinking');
    try {
      const action = await apiChat({
        query,
        current_schedule: currentSchedule,
        tasks,
        goals,
        task_completion_rate: taskCompletionRate,
        date_key: dateKey,
        history_last7: historyLast7Days,
      });
      await executeAction(action);
    } catch (err) {
      const msg = "Can't connect to the GoalFlow backend. Make sure it's running on port 8000.";
      console.error('Ryna askRyna failed:', err);
      setRynaResponse(msg); speak(msg);
      callbacks.notify('Ryna Error', 'Backend unreachable — run: uvicorn backend.main:app --reload', 'warning');
    } finally {
      setIsCoachLoading(false);
      setRynaMode(prev => prev === 'thinking' ? 'idle' : prev);
    }
  }, [currentSchedule, tasks, goals, taskCompletionRate, dateKey, historyLast7Days, executeAction, speak, callbacks]);

  // ── Voice recognition ───────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      callbacks.notify('Not Supported', 'Voice input requires Chrome or Edge.', 'warning');
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => { setRynaMode('listening'); setRynaTranscript(''); };

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const transcript: string = last[0].transcript;
      setRynaTranscript(transcript);

      if (last.isFinal) {
        const lower = transcript.toLowerCase().trim();
        const command = lower.startsWith('ryna')
          ? transcript.slice(4).trim()
          : transcript.trim();

        if (!command) {
          const msg = "Yes Samuel, I'm listening. What do you need?";
          setRynaResponse(msg); speak(msg); setRynaMode('idle');
        } else {
          askRyna(command);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        callbacks.notify('Voice Error', `Speech error: ${event.error}`, 'warning');
      }
      setRynaMode('idle');
    };

    recognition.onend = () => setRynaMode(prev => prev === 'listening' ? 'idle' : prev);

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
