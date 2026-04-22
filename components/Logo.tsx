export function Logo({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { width: 24, height: 24, text: 'text-sm' },
    md: { width: 32, height: 32, text: 'text-xl' },
    lg: { width: 48, height: 48, text: 'text-3xl' },
  };
  
  const s = sizes[size];
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg 
        width={s.width} 
        height={s.height} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="8" fill="#f59e0b"/>
        <path d="M8 16L14 10L20 16L14 22L8 16Z" fill="#18181b"/>
        <path d="M14 16L20 10L26 16L20 22L14 16Z" fill="#18181b" fillOpacity="0.6"/>
      </svg>
      <span className={`font-black tracking-tighter uppercase italic ${s.text}`}>GoalFlow</span>
    </div>
  );
}