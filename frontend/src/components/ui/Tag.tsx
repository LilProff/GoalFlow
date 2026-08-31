import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  color?: string;   // CSS color string
  size?: 'xs' | 'sm';
  dot?: boolean;
}

export default function Tag({ children, color, size = 'xs', dot = false }: TagProps) {
  const style = color ? {
    color,
    background: `${color}14`,
    border: `1px solid ${color}30`,
  } : {
    color: 'var(--tx-secondary)',
    background: 'var(--border-dim)',
    border: '1px solid var(--border-mid)',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono rounded-sm ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      }`}
      style={style}
    >
      {dot && <span className="w-1 h-1 rounded-full" style={{ background: color || 'var(--tx-muted)' }} />}
      {children}
    </span>
  );
}
