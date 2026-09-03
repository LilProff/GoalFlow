import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Target, Clock, Menu,
  BarChart3, Trophy, Settings, MessageCircle, LogOut, X, Repeat,
} from 'lucide-react';
import { useStore } from '../../lib/store';

// The five most-reached-for screens live in the bar itself; everything else
// (secondary/weekly-cadence views) sits behind "More" — five items is the
// practical ceiling before a bottom bar gets too cramped to tap reliably.
const TAB_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Today' },
  { to: '/planner',   icon: Clock,           label: 'Planner' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks' },
  { to: '/goals',     icon: Target,          label: 'Goals' },
];

const MORE_ITEMS = [
  { to: '/projects',    icon: Repeat,    label: 'Projects' },
  { to: '/analytics',   icon: BarChart3, label: 'Analytics' },
  { to: '/leaderboard', icon: Trophy,    label: 'Leaderboard' },
  { to: '/settings',    icon: Settings,  label: 'Settings' },
];

function TabButton({ to, icon: Icon, active, onClick }: {
  to?: string; icon: typeof LayoutDashboard; label: string; active: boolean; onClick: () => void;
}) {
  const content = (
    <span
      className="flex items-center justify-center w-11 h-11 rounded-full transition-all duration-150"
      style={active ? {
        background: 'rgba(139,92,246,0.3)',
        color: 'var(--acid)',
        boxShadow: '0 0 15px rgba(139,92,246,0.5)',
        transform: 'scale(0.92)',
      } : { color: 'rgba(204,195,216,0.6)' }}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
    </span>
  );
  const cls = "flex items-center justify-center min-w-0 transition-colors";
  if (to) {
    return <NavLink to={to} onClick={onClick} className={cls}>{content}</NavLink>;
  }
  return <button onClick={onClick} className={cls}>{content}</button>;
}

export default function MobileNav() {
  const { user, setChatOpen, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_ITEMS.some(i => location.pathname === i.to);

  return (
    <>
      {/* Floating pill nav — centered, inset from the edges, glass-blurred.
          env(safe-area-inset-bottom) via the wrapper's margin clears the
          iPhone home indicator instead of sitting flush against it. */}
      <nav
        className="glass-panel-float md:hidden fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-3 py-2 rounded-full"
        style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        {TAB_ITEMS.map(({ to, icon, label }) => (
          <TabButton key={to} to={to} icon={icon} label={label}
            active={location.pathname === to} onClick={() => setMoreOpen(false)} />
        ))}
        <TabButton icon={Menu} label="More" active={isMoreActive || moreOpen}
          onClick={() => setMoreOpen(v => !v)} />
      </nav>

      {/* "More" sheet — secondary nav + Ryna + sign out. */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
              className="glass-panel md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 rounded-t-3xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
            >
              <div className="flex items-center justify-between px-2 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center mono text-[10px] font-bold"
                    style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: 'var(--acid)' }}>
                    {user?.name?.charAt(0) ?? 'U'}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--tx-primary)' }}>{user?.name}</p>
                </div>
                <button onClick={() => setMoreOpen(false)} style={{ color: 'var(--tx-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                    style={({ isActive }) => ({
                      background: isActive ? 'rgba(139,92,246,0.1)' : 'var(--bg-overlay)',
                      border: `1px solid ${isActive ? 'rgba(139,92,246,0.3)' : 'var(--border-dim)'}`,
                      color: isActive ? 'var(--acid)' : 'var(--tx-secondary)',
                    })}>
                    <Icon className="w-4 h-4" />
                    <span className="mono text-[8px] tracking-widest font-bold">{label.toUpperCase()}</span>
                  </NavLink>
                ))}
              </div>

              <button
                onClick={() => { setMoreOpen(false); setChatOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-3 mb-1 rounded-xl"
                style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--acid)' }}>
                <MessageCircle className="w-4 h-4" />
                <span className="mono text-[10px] tracking-widest font-bold">ASK RYNA</span>
              </button>

              <button
                onClick={() => { setMoreOpen(false); logout(); navigate('/'); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{ color: 'var(--tx-muted)' }}>
                <LogOut className="w-4 h-4" />
                <span className="mono text-[10px] tracking-widest font-bold">SIGN OUT</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
