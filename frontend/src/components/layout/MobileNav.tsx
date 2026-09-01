import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Target, Clock, Menu,
  BarChart3, Trophy, Settings, MessageCircle, LogOut, X,
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
  { to: '/analytics',   icon: BarChart3, label: 'Analytics' },
  { to: '/leaderboard', icon: Trophy,    label: 'Leaderboard' },
  { to: '/settings',    icon: Settings,  label: 'Settings' },
];

function TabButton({ to, icon: Icon, label, active, onClick }: {
  to?: string; icon: typeof LayoutDashboard; label: string; active: boolean; onClick: () => void;
}) {
  const content = (
    <>
      <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
      <span className="mono text-[8px] tracking-widest font-bold">{label.toUpperCase()}</span>
    </>
  );
  const cls = "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-w-0 transition-colors";
  const style = { color: active ? 'var(--acid)' : 'var(--tx-muted)' };
  if (to) {
    return <NavLink to={to} onClick={onClick} className={cls} style={style}>{content}</NavLink>;
  }
  return <button onClick={onClick} className={cls} style={style}>{content}</button>;
}

export default function MobileNav() {
  const { user, setChatOpen, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = MORE_ITEMS.some(i => location.pathname === i.to);

  return (
    <>
      {/* Bottom tab bar. env(safe-area-inset-bottom) clears the iPhone home
          indicator — without it the last row of every page sits right under
          the gesture bar. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
        style={{
          background: 'var(--bg-void)',
          borderTop: '1px solid var(--border-mid)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
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
              className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3"
              style={{
                background: 'var(--bg-raised)', borderTop: '1px solid var(--border-mid)',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
              }}
            >
              <div className="flex items-center justify-between px-2 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center mono text-[10px] font-bold"
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--acid)' }}>
                    {user?.name?.charAt(0) ?? 'U'}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--tx-primary)' }}>{user?.name}</p>
                </div>
                <button onClick={() => setMoreOpen(false)} style={{ color: 'var(--tx-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 py-3"
                    style={({ isActive }) => ({
                      background: isActive ? 'rgba(212,245,60,0.06)' : 'var(--bg-overlay)',
                      border: `1px solid ${isActive ? 'rgba(212,245,60,0.2)' : 'var(--border-dim)'}`,
                      color: isActive ? 'var(--acid)' : 'var(--tx-secondary)',
                    })}>
                    <Icon className="w-4 h-4" />
                    <span className="mono text-[8px] tracking-widest font-bold">{label.toUpperCase()}</span>
                  </NavLink>
                ))}
              </div>

              <button
                onClick={() => { setMoreOpen(false); setChatOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-3 mb-1"
                style={{ background: 'rgba(0,212,180,0.06)', border: '1px solid rgba(0,212,180,0.2)', color: '#00d4b4' }}>
                <MessageCircle className="w-4 h-4" />
                <span className="mono text-[10px] tracking-widest font-bold">ASK RYNA</span>
              </button>

              <button
                onClick={() => { setMoreOpen(false); logout(); navigate('/'); }}
                className="w-full flex items-center gap-3 px-3 py-3"
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
