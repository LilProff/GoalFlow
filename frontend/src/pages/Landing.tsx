import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Shield, Zap, Lock, Server, Loader2 } from 'lucide-react';
import { useStore } from '../lib/store';
import Logo from '../components/ui/Logo';

type Mode = 'home' | 'login' | 'signup';

const TICKER_ITEMS = [
  'BUILD · SHOW · EARN · SYSTEMIZE',
  'AI EXECUTION OS',
  'ADAPTIVE TIMELINES',
  'DAILY ACCOUNTABILITY',
  'RYNA AI COACH',
  'PILLAR-BASED PLANNING',
  '24H DAY PLANNER',
  'WEB + MOBILE',
];

const PILLARS = [
  { sym: '◈', label: 'Build',     sub: 'Deep work & craft',     color: '#F97316' },
  { sym: '◎', label: 'Show',      sub: 'Distribute & publish',  color: '#14B8A6' },
  { sym: '◆', label: 'Earn',      sub: 'Revenue & monetize',    color: '#FACC15' },
  { sym: '◉', label: 'Systemize', sub: 'Automate & leverage',   color: '#64748B' },
];

// Facts about what the product does — not usage metrics. Invented traction
// numbers ("2,400+ active builders", "89% streak retention") are false
// advertising once this page is public, and there is no analytics source
// behind them. Swap these for real figures only when they can be measured.
const STATS = [
  { value: '4',       label: 'Execution pillars'  },
  { value: 'Adaptive', label: 'Goal timelines'   },
  { value: '24h',     label: 'Day planning'       },
  { value: 'AI',      label: 'Daily coaching'     },
];

// App Store SVG badge
function AppStoreBadge() {
  return (
    <a href="#" onClick={e => e.preventDefault()}
      className="flex items-center gap-2.5 px-4 py-2.5 transition-all"
      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-bright)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}>
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="var(--tx-primary)">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <div>
        <p className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>DOWNLOAD ON THE</p>
        <p className="font-bold text-sm leading-tight" style={{ color: 'var(--tx-primary)' }}>App Store</p>
      </div>
    </a>
  );
}

function PlayStoreBadge() {
  return (
    <a href="#" onClick={e => e.preventDefault()}
      className="flex items-center gap-2.5 px-4 py-2.5 transition-all"
      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-bright)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--acid)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}>
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="var(--tx-primary)">
        <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z"/>
      </svg>
      <div>
        <p className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>GET IT ON</p>
        <p className="font-bold text-sm leading-tight" style={{ color: 'var(--tx-primary)' }}>Google Play</p>
      </div>
    </a>
  );
}

function AuthForm({
  mode, onSwitchMode, inputBase, inputStyle,
}: {
  mode: 'login' | 'signup';
  onSwitchMode: (m: Mode) => void;
  inputBase: string;
  inputStyle: Record<string, string>;
}) {
  const { login, signup } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fresh form when switching between sign-in and sign-up rather than
  // carrying stale values (and a stale error) across.
  useEffect(() => {
    setName(''); setEmail(''); setPassword(''); setError('');
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'signup' && name.trim().length < 1) {
      setError('Enter your name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signup(email.trim().toLowerCase(), password, name.trim());
        navigate('/onboarding');
      } else {
        await login(email.trim().toLowerCase(), password);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === 'signup' && (
        <div>
          <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>NAME</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            className={inputBase} style={inputStyle} placeholder="Your name" autoComplete="name" />
        </div>
      )}
      <div>
        <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>EMAIL</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          autoFocus={mode === 'login'}
          className={inputBase} style={inputStyle} placeholder="you@example.com" autoComplete="email" />
      </div>
      <div>
        <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>PASSWORD</label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)}
            className={inputBase} style={{ ...inputStyle, paddingRight: 40 }}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tx-muted)' }}
            tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
      )}

      <button type="submit" disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 font-bold text-sm disabled:opacity-60"
        style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? (mode === 'signup' ? 'CREATING ACCOUNT…' : 'SIGNING IN…') : (mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN')}
      </button>

      <p className="text-center text-xs" style={{ color: 'var(--tx-muted)' }}>
        {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button type="button" onClick={() => onSwitchMode(mode === 'signup' ? 'login' : 'signup')}
          className="font-semibold" style={{ color: 'var(--acid)' }}>
          {mode === 'signup' ? 'Sign in' : 'Create one'}
        </button>
      </p>
    </form>
  );
}

export default function Landing() {
  // The nav/CTA buttons below and the in-form cross-links both set ?mode=.
  // Reading it here (rather than only local state) makes the form linkable
  // and keeps browser back from leaving the app entirely.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMode = searchParams.get('mode');
  const [mode, setMode] = useState<Mode>(
    urlMode === 'signup' ? 'signup' : urlMode === 'login' ? 'login' : 'home',
  );

  useEffect(() => {
    // Follow the URL in both directions, so browser back from the auth form
    // returns to the marketing page instead of leaving the site.
    setMode(urlMode === 'signup' ? 'signup' : urlMode === 'login' ? 'login' : 'home');
  }, [urlMode]);

  // Keep the URL in step with the view so the form is linkable and the browser
  // back button returns to the marketing page rather than leaving the app.
  const switchMode = (next: Mode) => {
    setMode(next);
    if (next === 'home') setSearchParams({}, { replace: false });
    else setSearchParams({ mode: next === 'signup' ? 'signup' : 'login' }, { replace: false });
  };
  const { isAuthenticated } = useStore();
  const navigate = useNavigate();

  // Already signed in — this page is for signed-out visitors.
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);
  if (isAuthenticated) return null;

  const inputBase = "w-full px-3 py-2.5 text-sm outline-none transition-all";
  const inputStyle = { background: 'var(--bg-overlay)', border: '1px solid var(--border-mid)', color: 'var(--tx-primary)' };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-void)', color: 'var(--tx-primary)' }}>

      {/* Ticker */}
      <div className="overflow-hidden" style={{ borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-raised)' }}>
        <div className="flex ticker-track whitespace-nowrap py-2">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="mono text-[10px] tracking-widest px-8" style={{ color: 'var(--tx-muted)' }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div className="flex items-center gap-3">
          <Logo className="w-5 h-5" />
          <span className="mono text-xs font-bold tracking-widest" style={{ color: 'var(--tx-primary)' }}>GOALFLOW</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => switchMode('login')}
            className="mono text-[10px] tracking-widest px-4 py-2 transition-colors"
            style={{ color: 'var(--tx-muted)' }}>
            SIGN IN
          </button>
          <button onClick={() => switchMode('signup')}
            className="mono text-[10px] tracking-widest px-4 py-2 font-bold"
            style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
            GET STARTED
          </button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {mode === 'home' ? (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* ── Hero ── */}
            <section className="max-w-6xl mx-auto px-8 pt-20 pb-16 grid-bg">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="mono text-[10px] tracking-widest mb-6 flex items-center gap-2"
                style={{ color: 'var(--acid)' }}>
                <span className="pulse-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--acid)' }} />
                SYSTEM ONLINE · AI EXECUTION OS · WEB + iOS + ANDROID
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95] mb-8">
                Stop planning.<br />
                <span style={{ color: 'var(--acid)' }}>Start executing.</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-lg max-w-xl mb-8 leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>
                GoalFlow enforces daily high-performance behavior across four execution pillars.
                AI-powered planning, 24-hour day scheduling, real-time coaching, ruthless accountability.
                One account. Every device.
              </motion.p>

              {/* CTA row */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="flex flex-wrap items-center gap-3 mb-6">
                <button onClick={() => switchMode('signup')}
                  className="flex items-center gap-2 font-bold px-6 py-3"
                  style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                  Start free on web <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => switchMode('login')}
                  className="mono text-xs tracking-widest px-6 py-3"
                  style={{ border: '1px solid var(--border-mid)', color: 'var(--tx-secondary)' }}>
                  SIGN IN
                </button>
              </motion.div>

              {/* App store badges */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="flex flex-wrap items-center gap-3 mb-4">
                <AppStoreBadge />
                <PlayStoreBadge />
                <span className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-ghost)' }}>
                  COMING SOON · SAME ACCOUNT · SAME DATA
                </span>
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-ghost)' }}>
                FREE DURING BETA · NO CREDIT CARD · SIGN UP ONCE, USE EVERYWHERE
              </motion.p>
            </section>

            {/* ── Stats bar ── */}
            <div style={{ borderTop: '1px solid var(--border-dim)', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-raised)' }}>
              <div className="max-w-6xl mx-auto px-8 py-5 grid grid-cols-4">
                {STATS.map(({ value, label }, i) => (
                  <div key={label} className="px-6 first:pl-0 last:pr-0"
                    style={{ borderRight: i < 3 ? '1px solid var(--border-dim)' : 'none' }}>
                    <p className="mono text-xl font-bold" style={{ color: 'var(--acid)' }}>{value}</p>
                    <p className="mono text-[10px] tracking-widest mt-1" style={{ color: 'var(--tx-muted)' }}>{label.toUpperCase()}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Pillars ── */}
            <section className="max-w-6xl mx-auto px-8 py-20">
              <div className="flex items-center gap-4 mb-10">
                <span className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>§ 01</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
                <span className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>EXECUTION FRAMEWORK</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PILLARS.map(({ sym, label, sub, color }, i) => (
                  <motion.div key={label}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                    className="p-6 transition-all duration-150 hover:-translate-y-0.5"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: `2px solid ${color}` }}>
                    <div className="text-3xl mb-4" style={{ color }}>{sym}</div>
                    <p className="font-bold text-sm mb-1" style={{ color: 'var(--tx-primary)' }}>{label}</p>
                    <p className="mono text-[10px] tracking-wide" style={{ color: 'var(--tx-muted)' }}>{sub.toUpperCase()}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ── Features ── */}
            <section className="max-w-6xl mx-auto px-8 py-8 space-y-px" style={{ borderTop: '1px solid var(--border-dim)' }}>
              {[
                { num: '01', title: '24-Hour Day Planner',      desc: 'Every hour of your day accounted for. Sleep, prayer, exercise, transit, deep work, meals, family — all blocked and tracked. Ryna reshuffles your day in real time when things go off track.' },
                { num: '02', title: 'AI Task Generation',        desc: 'Daily tasks auto-generated from your active goals. Every morning, a new execution plan aligned to your pillars and current progress.' },
                { num: '03', title: 'Ryna — Your AI Coach',      desc: 'Context-aware coaching that knows your goals, streak, blockers, and history. Not generic advice — your data, your patterns, your next move.' },
                { num: '04', title: 'Smart Notifications',        desc: 'Get notified 5 minutes before each block starts, warned when you\'re overrunning, and offered an AI reshuffle when 2+ blocks fall behind.' },
                { num: '05', title: 'Execution Analytics',        desc: 'Score, streak, build hours, and pillar distribution tracked daily. Patterns surface before problems do. Weekly AI-generated reports.' },
                { num: '06', title: 'Flexible Pillar System',     desc: 'Built for developers, designers, founders, students, marketers. Customize your pillars or use the default BUILD · SHOW · EARN · SYSTEMIZE framework.' },
              ].map(({ num, title, desc }, i) => (
                <motion.div key={num}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-8 px-6 py-5 transition-all cursor-default"
                  style={{ background: 'var(--bg-raised)', borderLeft: '2px solid var(--border-dim)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderLeftColor = 'var(--acid)')}
                  onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'var(--border-dim)')}>
                  <span className="mono text-[10px] tracking-widest mt-0.5 shrink-0 w-6" style={{ color: 'var(--acid)' }}>{num}</span>
                  <div>
                    <p className="font-semibold text-sm mb-1" style={{ color: 'var(--tx-primary)' }}>{title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>{desc}</p>
                  </div>
                </motion.div>
              ))}
            </section>

            {/* ── Cross-platform ── */}
            <section className="max-w-6xl mx-auto px-8 py-20">
              <div className="flex items-center gap-4 mb-10">
                <span className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>§ 02</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
                <span className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>ONE ACCOUNT · EVERY DEVICE</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { platform: 'Web',     icon: '⬛', sub: 'Desktop-first · Full dashboard · Chrome, Safari, Firefox', color: 'var(--acid)',  status: 'LIVE NOW' },
                  { platform: 'iOS',     icon: '◈',  sub: 'iPhone & iPad · Push notifications · Face ID · Widgets',  color: '#14B8A6', status: 'COMING SOON' },
                  { platform: 'Android', icon: '◉',  sub: 'Phone & tablet · Push notifications · Fingerprint · Widgets', color: '#F97316', status: 'COMING SOON' },
                ].map(({ platform, icon, sub, color, status }) => (
                  <div key={platform} className="p-6"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: `2px solid ${color}` }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl" style={{ color }}>{icon}</span>
                      <span className="mono text-[8px] px-2 py-1 tracking-widest"
                        style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                        {status}
                      </span>
                    </div>
                    <p className="font-bold text-base mb-2" style={{ color: 'var(--tx-primary)' }}>{platform}</p>
                    <p className="mono text-[9px] leading-relaxed" style={{ color: 'var(--tx-muted)' }}>{sub.toUpperCase()}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 flex items-start gap-3"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderLeft: '2px solid var(--acid)' }}>
                <Server className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--acid)' }} />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>
                  <strong style={{ color: 'var(--tx-primary)' }}>One backend. All clients.</strong>{' '}
                  Sign up once — your goals, tasks, planner, streak, and Ryna conversation history sync instantly
                  across web, iPhone, and Android. Switch devices mid-day without missing a beat.
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <AppStoreBadge />
                <PlayStoreBadge />
              </div>
            </section>

            {/* ── Security ── */}
            <section className="max-w-6xl mx-auto px-8 py-20" style={{ borderTop: '1px solid var(--border-dim)' }}>
              <div className="flex items-center gap-4 mb-10">
                <span className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>§ 03</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
                <span className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>SECURITY & PRIVACY</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {[
                  { icon: Lock,   title: 'Per-account data isolation',   desc: 'Every request is scoped to your verified account before it reaches the database, so one account can never read another’s goals, tasks or logs.' },
                  { icon: Shield, title: 'Verified session tokens',       desc: 'Every API call carries a signed session token whose signature is verified server-side on each request. Passwords are hashed, never stored or logged in plain text.' },
                  { icon: Zap,    title: 'Ryna AI privacy',              desc: 'Your goals and tasks are sent to the AI provider only to generate your coaching. They are not used to train models and are not sold.' },
                  { icon: Server, title: 'Encrypted in transit & at rest',desc: 'All traffic runs over HTTPS. Data is stored in Postgres on Supabase, encrypted at rest, in the region you provision.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4 p-5"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderLeft: '2px solid rgba(139,92,246,0.3)' }}>
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                      <Icon className="w-4 h-4" style={{ color: 'var(--acid)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--tx-primary)' }}>{title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── How a day runs ── */}
            <section className="max-w-6xl mx-auto px-8 py-16" style={{ borderTop: '1px solid var(--border-dim)' }}>
              <div className="flex items-center gap-4 mb-10">
                <span className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>§ 04</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-dim)' }} />
                <span className="mono text-[10px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>HOW A DAY RUNS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { step: '01', title: 'Morning brief', body: 'Ryna opens the day with your plan: what matters most, what slipped yesterday, and the first block to start.' },
                  { step: '02', title: 'Execute in blocks', body: 'Your day is scheduled hour by hour. Tick blocks off as you go. Fall behind and Ryna reshuffles what is left around your fixed commitments.' },
                  { step: '03', title: 'Evening reflection', body: 'Log build hours and what blocked you. That feeds tomorrow’s plan, your streak, and the weekly report.' },
                ].map(({ step, title, body }) => (
                  <div key={step} className="p-6" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)' }}>
                    <p className="mono text-[10px] tracking-widest mb-3" style={{ color: 'var(--acid)' }}>{step}</p>
                    <p className="text-sm font-semibold mb-2" style={{ color: 'var(--tx-primary)' }}>{title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-secondary)' }}>{body}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="max-w-6xl mx-auto px-8 pb-20">
              <div className="p-12 text-center"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>
                <p className="mono text-[10px] tracking-widest mb-4" style={{ color: 'var(--acid)' }}>READY TO EXECUTE?</p>
                <h2 className="text-4xl font-black mb-3">Your execution system starts now.</h2>
                <p className="text-sm mb-8" style={{ color: 'var(--tx-secondary)' }}>
                  Set four pillars, define long and short-term goals, and let Ryna hold the schedule.<br />
                  Start on web. Take it with you on mobile.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button onClick={() => switchMode('signup')}
                    className="inline-flex items-center gap-2 font-bold px-8 py-3.5"
                    style={{ background: 'var(--acid)', color: 'var(--bg-void)' }}>
                    Start free on web <ArrowRight className="w-4 h-4" />
                  </button>
                  <AppStoreBadge />
                  <PlayStoreBadge />
                </div>
                <p className="mono text-[9px] tracking-widest mt-6" style={{ color: 'var(--tx-ghost)' }}>
                  FREE DURING BETA · NO CREDIT CARD · ONE ACCOUNT ACROSS ALL PLATFORMS
                </p>
              </div>
            </section>

            <footer className="px-8 py-6" style={{ borderTop: '1px solid var(--border-dim)' }}>
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Logo className="w-4 h-4 opacity-80" />
                  <span className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-ghost)' }}>GOALFLOW</span>
                </div>
                <div className="flex items-center gap-6">
                  {['Privacy Policy', 'Terms of Service', 'Security'].map(link => (
                    <a key={link} href="#" onClick={e => e.preventDefault()}
                      className="mono text-[9px] tracking-widest transition-colors"
                      style={{ color: 'var(--tx-ghost)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--tx-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx-ghost)')}>
                      {link.toUpperCase()}
                    </a>
                  ))}
                </div>
                <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-ghost)' }}>
                  © 2025 GOALFLOW · BUILT WITH INTENT
                </p>
              </div>
            </footer>
          </motion.div>
        ) : (
          /* ── Auth ── */
          <motion.div key="auth"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-[calc(100vh-97px)] px-4 py-16">
            <div className="w-full max-w-sm">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-black">
                  {mode === 'login' ? 'Welcome back.' : 'Start executing.'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--tx-secondary)' }}>
                  {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
                </p>
              </div>

              <div className="p-6"
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)', borderTop: '2px solid var(--acid)' }}>
                <AuthForm mode={mode} onSwitchMode={switchMode} inputBase={inputBase} inputStyle={inputStyle} />
              </div>

              <button onClick={() => switchMode('home')}
                className="mt-4 w-full text-center mono text-[9px] tracking-widest transition-colors"
                style={{ color: 'var(--tx-ghost)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--tx-muted)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--tx-ghost)')}>
                ← BACK TO HOME
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
