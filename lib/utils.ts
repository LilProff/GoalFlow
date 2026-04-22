import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function getStreak(lastLogDate: string | null): number {
  if (!lastLogDate) return 0;
  
  const today = new Date();
  const lastLog = new Date(lastLogDate);
  const diffDays = Math.floor((today.getTime() - lastLog.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 1) return 0;
  return 1;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const PILLAR_CONFIG = {
  BUILD: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    glow: 'hover:shadow-blue-500/20',
    xp: 30,
  },
  SHOW: {
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    glow: 'hover:shadow-purple-500/20',
    xp: 20,
  },
  EARN: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    glow: 'hover:shadow-green-500/20',
    xp: 20,
  },
  SYSTEMIZE: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glow: 'hover:shadow-orange-500/20',
    xp: 20,
  },
} as const;

export const LEVEL_CONFIG = {
  beginner: {
    label: 'Beginner',
    color: 'text-zinc-400',
    bg: 'bg-zinc-800',
    minXP: 0,
  },
  builder: {
    label: 'Builder',
    color: 'text-blue-400',
    bg: 'bg-blue-900',
    minXP: 30,
  },
  operator: {
    label: 'Operator',
    color: 'text-purple-400',
    bg: 'bg-purple-900',
    minXP: 60,
  },
  beast: {
    label: 'Beast Mode',
    color: 'text-amber-400',
    bg: 'bg-amber-900',
    minXP: 120,
  },
} as const;