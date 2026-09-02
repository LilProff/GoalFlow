import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'acid' | 'ghost' | 'outline' | 'danger' | 'dim';
  sz?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const V = {
  acid:    'bg-[var(--acid)] text-[var(--bg-void)] font-bold hover:bg-[var(--acid-2)] border border-transparent',
  ghost:   'bg-transparent text-[var(--tx-secondary)] hover:text-[var(--tx-primary)] hover:bg-[var(--border-dim)] border border-transparent',
  outline: 'bg-transparent text-[var(--tx-secondary)] border border-[var(--border-mid)] hover:border-[var(--border-bright)] hover:text-[var(--tx-primary)]',
  danger:  'bg-transparent text-[#EF4444] border border-[#EF444430] hover:bg-[#EF444410]',
  dim:     'bg-[var(--bg-overlay)] text-[var(--tx-secondary)] border border-[var(--border-mid)] hover:text-[var(--tx-primary)] hover:border-[var(--border-bright)]',
};

const S = {
  xs: 'px-2 py-1 text-[10px] rounded-sm gap-1',
  sm: 'px-3 py-1.5 text-xs rounded-sm gap-1.5',
  md: 'px-4 py-2 text-sm rounded-sm gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-sm gap-2',
};

export default function Btn({ children, variant='outline', sz='md', loading=false, className='', disabled, ...rest }: BtnProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed ${V[variant]} ${S[sz]} ${className}`}
      {...rest}
    >
      {loading
        ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        : children
      }
    </button>
  );
}
