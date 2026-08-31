import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'violet' | 'cyan' | 'emerald' | 'amber' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const GLOW = {
  none: '',
  violet: 'hover:border-violet-500/30 hover:shadow-violet-500/5',
  cyan: 'hover:border-cyan-500/30 hover:shadow-cyan-500/5',
  emerald: 'hover:border-emerald-500/30 hover:shadow-emerald-500/5',
  amber: 'hover:border-amber-500/30 hover:shadow-amber-500/5',
};

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({ children, className = '', hover = false, glow = 'none', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-[var(--card-bg)] border border-white/5 rounded-xl shadow-sm ${
        hover ? `transition-all duration-200 hover:shadow-lg cursor-pointer ${GLOW[glow]}` : ''
      } ${PADDING[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
