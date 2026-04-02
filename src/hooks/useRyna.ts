import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { format } from 'date-fns';
import { RynaMode, ScheduleItem, GlobalData, DailyData } from '../types';

export function useRyna(
  currentSchedule: ScheduleItem[],
  goals: GlobalData['goals'],
  taskCompletionRate: number,
  dateKey: string,
  setDailyData: React.Dispatch<React.SetStateAction<DailyData>>,
  setGlobalData: React.Dispatch<React.SetStateAction<GlobalData>>
) {
  const [rynaMode, setRynaMode] = useState<RynaMode>('idle');
  const [rynaTranscript, setRynaTranscript] = useState('');
  const [rynaResponse, setRynaResponse] = useState<string | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.1;
      utterance.onstart = () => setRynaMode('speaking');
      utterance.onend = () => setRynaMode('idle');
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleReshuffle = useCallback(async (reason: string, impromptuTasks: string[] = []) => {
    setIsCoachLoading(true);
    setRynaMode('thinking');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are Ryna, Samuel's GoalFlow AI PA. 
        Current Schedule: ${JSON.stringify(currentSchedule)}
        Current Time: ${format(new Date(), 'HH:mm')}
        Reason for reshuffle: ${reason}
        Impromptu tasks to add: ${impromptuTasks.join(', ')}
        Samuel's Goals: ${JSON.stringify(goals)}
        
        Please provide a revised schedule for the remainder of the day. 
        Strategically assign time for impromptu tasks based on their priority and the current time.
        Keep the core goals in mind. 
        Return a JSON object with two fields:
        1. "schedule": A JSON array of ScheduleItem objects.
        2. "advice": A short, motivational message explaining the changes and encouraging Samuel.
        
        Example item: {"time": "14:30", "activity": "Deep Work", "category": "PROJECT", "notes": "Adjusted due to delay"}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.schedule) {
          setDailyData(prev => {
            const newData = { ...prev, customSchedule: result.schedule };
            setGlobalData(g => ({
              ...g,
              history: { ...(g?.history || {}), [dateKey]: newData }
            }));
            return newData;
          });
        }
        if (result.advice) {
          setRynaResponse(result.advice);
          speak(result.advice);
        }
      }
    } catch (error) {
      console.error("Ryna failed:", error);
      setRynaResponse("I'm sorry Samuel, I'm having trouble connecting right now.");
    } finally {
      setIsCoachLoading(false);
      setRynaMode(prev => prev === 'thinking' ? 'idle' : prev);
    }
  }, [currentSchedule, goals, dateKey, setDailyData, setGlobalData, speak]);

  const askRyna = useCallback(async (query: string) => {
    setIsCoachLoading(true);
    setRynaMode('thinking');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are Ryna, Samuel's GoalFlow AI PA. 
        Samuel's Goals: ${JSON.stringify(goals)}
        Current Progress: ${taskCompletionRate.toFixed(1)}% completion today.
        Current Schedule: ${JSON.stringify(currentSchedule)}
        Current Time: ${format(new Date(), 'HH:mm')}
        Samuel's Query: "${query}"
        
        If Samuel wants to add tasks or reshuffle, return a JSON object with:
        {"type": "reshuffle", "reason": "reason for reshuffle", "impromptu": ["task 1", "task 2"]}
        
        If Samuel wants advice or guidance, return:
        {"type": "advice", "message": "your motivational advice"}
        
        Keep it brief and professional.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.type === 'reshuffle') {
          await handleReshuffle(result.reason, result.impromptu);
        } else {
          setRynaResponse(result.message);
          speak(result.message);
        }
      }
    } catch (error) {
      console.error("Ryna failed:", error);
      setRynaResponse("I'm sorry Samuel, I'm having trouble thinking right now.");
    } finally {
      setIsCoachLoading(false);
      setRynaMode(prev => prev === 'thinking' ? 'idle' : prev);
    }
  }, [goals, taskCompletionRate, currentSchedule, handleReshuffle, speak]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setRynaMode('listening');
      setRynaTranscript('');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setRynaTranscript(transcript);
      if (transcript.toLowerCase().includes('ryna')) {
        const command = transcript.toLowerCase().split('ryna')[1]?.trim();
        if (command) {
          askRyna(command);
        } else {
          const msg = "Yes Samuel, I'm listening. What can I do for you?";
          setRynaResponse(msg);
          speak(msg);
        }
      } else {
        askRyna(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setRynaMode('idle');
    };

    recognition.onend = () => {
      setRynaMode(prev => prev === 'listening' ? 'idle' : prev);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [askRyna, speak]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
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
    handleReshuffle
  };
}
