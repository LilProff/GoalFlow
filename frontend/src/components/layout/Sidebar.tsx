import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Target, BarChart3,
  Settings, MessageCircle, LogOut, ChevronLeft, ChevronRight, Clock, Trophy, Repeat
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { LEVEL_THRESHOLDS } from '../../lib/constants';
import Logo from '../ui/Logo';

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'TODAY'       },
  { to: '/planner',     icon: Clock,           label: 'PLANNER'     },
  { to: '/projects',    icon: Repeat,          label: 'PROJECTS'    },
  { to: '/tasks',       icon: CheckSquare,     label: 'TASKS'       },
  { to: '/goals',       icon: Target,          label: 'GOALS'       },
  { to: '/analytics',   icon: BarChart3,       label: 'ANALYTICS'   },
  { to: '/leaderboard', icon: Trophy,          label: 'LEADERBOARD' },
  { to: '/settings',    icon: Settings,        label: 'SETTINGS'    },
];

export default function Sidebar() {
  const { user, sidebarCollapsed, setSidebarCollapsed, setChatOpen, logout } = useStore();
  const navigate = useNavigate();
  const levelInfo = LEVEL_THRESHOLDS.find(l => l.level === (user?.level ?? 1));
  const nextLevel  = LEVEL_THRESHOLDS.find(l => l.level === (user?.level ?? 1) + 1);
  const xpPct = nextLevel
    ? (((user?.xp ?? 0) - (levelInfo?.minXP ?? 0)) / (nextLevel.minXP - (levelInfo?.minXP ?? 0))) * 100
    : 100;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="glass-panel relative flex flex-col h-screen shrink-0 overflow-hidden"
      style={{ borderRadius: 0 }}
    >
      {/* Wordmark */}
      <div className="flex items-center h-14 px-3.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div className="w-6 h-6 shrink-0 flex items-center justify-center">
          <Logo className="w-5 h-5" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.12 }}
              className="ml-3 flex items-baseline gap-1.5"
            >
              <span className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--tx-primary)' }}>GoalFlow</span>
              <span className="mono text-[9px] px-1 py-0.5 rounded-full" style={{ color: 'var(--acid)', border: '1px solid rgba(139,92,246,0.3)' }}>BETA</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-2 py-2 transition-all duration-100 relative ${
                isActive ? '' : 'hover:text-[var(--tx-secondary)]'
              }`
            }
            style={({ isActive }) => ({ color: isActive ? 'var(--acid)' : 'var(--tx-muted)' })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 shrink-0 relative z-10" strokeWidth={isActive ? 2.5 : 1.8} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="mono text-[10px] tracking-widest font-bold relative z-10"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="my-2" style={{ borderTop: '1px solid var(--border-dim)' }} />

        {/* Ryna */}
        <button
          onClick={() => setChatOpen(true)}
          className="group flex items-center gap-3 px-2 py-2 transition-all duration-100"
          style={{ color: 'var(--tx-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--acid)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx-muted)')}
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mono text-[10px] tracking-widest font-bold">
                RYNA
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border-dim)' }} className="p-3 space-y-2">
        {!sidebarCollapsed && user && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5 px-1">
            <div className="flex justify-between">
              <span className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>{levelInfo?.label}</span>
              <span className="mono text-[9px]" style={{ color: 'var(--acid)' }}>{user.xp} XP</span>
            </div>
            <div className="h-px w-full" style={{ background: 'var(--border-mid)' }}>
              <div className="h-px transition-all duration-700" style={{ width: `${xpPct}%`, background: 'var(--acid)' }} />
            </div>
          </motion.div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 shrink-0 flex items-center justify-center mono text-[10px] font-bold"
            style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--acid)' }}>
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--tx-primary)' }}>{user?.name}</p>
                <p className="mono text-[9px] truncate" style={{ color: 'var(--tx-muted)' }}>{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { logout(); navigate('/'); }}
                className="p-1 transition-colors"
                style={{ color: 'var(--tx-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx-muted)')}>
                <LogOut className="w-3 h-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-16 w-6 h-6 flex items-center justify-center transition-colors z-20"
        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-muted)' }}
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
