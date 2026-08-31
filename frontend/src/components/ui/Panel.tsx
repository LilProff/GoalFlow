import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
  pad?: 'none' | 'sm' | 'md' | 'lg';
  accent?: string; // left border color
  hover?: boolean;
}

const PAD = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' };

export default function Panel({ children, className = '', pad = 'md', accent, hover = false }: PanelProps) {
  return (
    <div
      className={`relative bg-[var(--bg-raised)] border border-[var(--border-mid)] ${
        hover ? 'transition-all duration-150 hover:border-[var(--border-bright)] hover:bg-[var(--bg-overlay)]' : ''
      } ${PAD[pad]} ${className}`}
      style={accent ? { borderLeft: `2px solid ${accent}` } : {}}
    >
      {children}
    </div>
  );
}
