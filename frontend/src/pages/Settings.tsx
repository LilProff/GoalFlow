import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Bell, Shield, Palette, LogOut, ChevronRight,
  Clock, Star, Trophy, Flame, TrendingUp
} from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import { pushPermission, isPushSubscribed, subscribeToPush, unsubscribeFromPush } from '../lib/push';
import { COACH_STYLES, TIMEZONES, LEVEL_THRESHOLDS, getLevelInfo, BADGE_DEFINITIONS } from '../lib/constants';

const TABS = [
  { id: 'profile',       label: 'PROFILE',       icon: User   },
  { id: 'notifications', label: 'NOTIFICATIONS', icon: Bell   },
  { id: 'appearance',    label: 'APPEARANCE',    icon: Palette },
  { id: 'security',      label: 'SECURITY',      icon: Shield  },
];

const RARITY_COLORS = { common: '#7b8fa8', rare: '#60a5fa', epic: '#a78bfa', legendary: '#f5c842' };
const RARITY_GLOW   = { common: 'rgba(123,143,168,0.15)', rare: 'rgba(96,165,250,0.15)', epic: 'rgba(167,139,250,0.15)', legendary: 'rgba(245,200,66,0.2)' };

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width: 36, height: 20, background: on ? 'var(--acid)' : 'var(--border-mid)', borderRadius: 10, position: 'relative', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: 2, left: 2, width: 16, height: 16, background: on ? 'var(--bg-void)' : 'var(--tx-muted)', borderRadius: '50%', transition: 'transform 0.2s', transform: on ? 'translateX(16px)' : 'none' }} />
    </button>
  );
}

const inp = "w-full px-3 py-2.5 text-sm outline-none transition-all";
const inpStyle = { background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)', color: 'var(--tx-primary)' };

export default function Settings() {
  const { user, logout, notificationPrefs, updateNotificationPrefs, updateProfile, deleteAccount } = useStore();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [pushPerm, setPushPerm] = useState(pushPermission());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [testingPush, setTestingPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState('');

  // The toggle reflects notificationPrefs.pushEnabled (a server-side "would
  // like push" preference), but the ground truth for whether this *device*
  // is actually subscribed lives in the browser. Reconcile once on mount —
  // e.g. permission revoked outside the app, or a second device that never
  // subscribed even though the preference (set on the first) says enabled.
  useEffect(() => {
    isPushSubscribed().then(subscribed => {
      if (subscribed !== notificationPrefs.pushEnabled) {
        updateNotificationPrefs({ pushEnabled: subscribed });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePush = async (enable: boolean) => {
    setPushError(''); setTestPushResult(''); setPushBusy(true);
    try {
      if (enable) {
        await subscribeToPush();
      } else {
        await unsubscribeFromPush();
      }
      await updateNotificationPrefs({ pushEnabled: enable });
      setPushPerm(pushPermission());
    } catch (e) {
      setPushError(e instanceof Error ? e.message : 'Could not update push notifications.');
      setPushPerm(pushPermission());
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true); setTestPushResult('');
    try {
      const r = await api.sendTestPush();
      setTestPushResult(r.sent > 0 ? '✓ Sent — check your device' : 'No device received it');
    } catch (e) {
      setTestPushResult(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setTestingPush(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError(''); setPasswordSaved(false);
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return; }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Could not update password.');
    } finally {
      setChangingPassword(false);
    }
  };
  const [tab, setTab] = useState('profile');
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileOcc, setProfileOcc] = useState(user?.occupation ?? '');
  const [profileTz, setProfileTz] = useState(user?.timezone ?? 'America/New_York');
  const [coachStyle, setCoachStyle] = useState(user?.coachStyle ?? 'strategist');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const levelInfo = getLevelInfo(user?.level ?? 1);
  const nextLevel = LEVEL_THRESHOLDS.find(l => l.level === (user?.level ?? 1) + 1);
  const xpToNext = nextLevel ? nextLevel.minXP - (user?.xp ?? 0) : 0;
  const xpPct = nextLevel
    ? (((user?.xp ?? 0) - (levelInfo.minXP)) / (nextLevel.minXP - levelInfo.minXP)) * 100
    : 100;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: profileName, occupation: profileOcc, timezone: profileTz, coachStyle });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save profile:', e);
    } finally {
      setSaving(false);
    }
  };
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 pb-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>ACCOUNT & PREFERENCES</p>
        <h1 className="text-2xl font-black">Settings</h1>
      </motion.div>

      <div className="grid grid-cols-12 gap-5">
        {/* Sidebar nav */}
        <div className="col-span-12 md:col-span-3 space-y-3">
          <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)' }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                style={{ background: tab === id ? 'rgba(212,245,60,0.06)' : 'transparent', borderLeft: `2px solid ${tab === id ? 'var(--acid)' : 'transparent'}`, borderBottom: '1px solid var(--border-dim)', color: tab === id ? 'var(--acid)' : 'var(--tx-muted)' }}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="mono text-[9px] tracking-widest font-bold flex-1">{label}</span>
                {tab === id && <ChevronRight className="w-3 h-3" />}
              </button>
            ))}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all"
              style={{ color: '#ff4444', borderLeft: '2px solid transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,68,68,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="mono text-[9px] tracking-widest font-bold">SIGN OUT</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="col-span-12 md:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

              {/* ── PROFILE ── */}
              {tab === 'profile' && (
                <div className="space-y-4">
                  {/* Identity card */}
                  <div className="p-6" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderTop: '2px solid var(--acid)' }}>
                    <p className="mono text-[9px] tracking-widest font-bold mb-5" style={{ color: 'var(--acid)' }}>// IDENTITY</p>

                    {/* Avatar + name + level hero */}
                    <div className="flex items-start gap-5 mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 flex items-center justify-center mono text-2xl font-black"
                          style={{ background: `${levelInfo.color}18`, border: `2px solid ${levelInfo.color}60`, color: levelInfo.color }}>
                          {user?.name?.charAt(0) ?? 'U'}
                        </div>
                        {/* Level badge */}
                        <div className="absolute -bottom-2 -right-2 w-7 h-7 flex items-center justify-center mono text-[10px] font-black"
                          style={{ background: levelInfo.color, color: 'var(--bg-void)' }}>
                          {user?.level}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-lg font-black" style={{ color: 'var(--tx-primary)' }}>{user?.name}</p>
                          {/* Title badge */}
                          <span className="mono text-[9px] px-2 py-0.5 font-bold"
                            style={{ background: `${levelInfo.color}20`, border: `1px solid ${levelInfo.color}50`, color: levelInfo.color }}>
                            {levelInfo.label}
                          </span>
                        </div>
                        <p className="mono text-[9px] mb-3" style={{ color: 'var(--tx-muted)' }}>{user?.email}</p>

                        {/* XP progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="mono text-[8px]" style={{ color: 'var(--tx-muted)' }}>
                              LEVEL {user?.level} → {nextLevel ? nextLevel.level : 'MAX'}
                            </span>
                            <span className="mono text-[8px]" style={{ color: levelInfo.color }}>
                              {user?.xp.toLocaleString()} / {nextLevel?.minXP.toLocaleString() ?? '∞'} XP
                            </span>
                          </div>
                          <div className="h-2 w-full" style={{ background: 'var(--border-mid)' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 0.8 }}
                              className="h-full" style={{ background: levelInfo.color }} />
                          </div>
                          {nextLevel && (
                            <p className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>
                              {xpToNext.toLocaleString()} XP to {nextLevel.label}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Level roadmap */}
                    <div className="mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <p className="mono text-[9px] tracking-widest mb-3" style={{ color: 'var(--tx-muted)' }}>LEVEL ROADMAP</p>
                      <div className="flex items-end gap-1 overflow-x-auto pb-2 no-scrollbar">
                        {LEVEL_THRESHOLDS.map((lvl, i) => {
                          const isCurrent = lvl.level === user?.level;
                          const isPast = (user?.level ?? 1) > lvl.level;
                          return (
                            <div key={lvl.level} className="flex flex-col items-center gap-1 shrink-0">
                              <div className="w-8 h-8 flex items-center justify-center mono text-[10px] font-black transition-all"
                                style={{
                                  background: isPast ? lvl.color : isCurrent ? `${lvl.color}30` : 'var(--bg-overlay)',
                                  border: `2px solid ${isCurrent ? lvl.color : isPast ? lvl.color : 'var(--border-dim)'}`,
                                  color: isPast ? 'var(--bg-void)' : isCurrent ? lvl.color : 'var(--tx-ghost)',
                                  boxShadow: isCurrent ? `0 0 12px ${lvl.color}50` : 'none',
                                }}>
                                {lvl.level}
                              </div>
                              <p className="mono text-[7px] tracking-wide text-center" style={{ color: isCurrent ? lvl.color : 'var(--tx-ghost)' }}>
                                {lvl.label}
                              </p>
                              {i < LEVEL_THRESHOLDS.length - 1 && (
                                <div className="absolute" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3 mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      {[
                        { icon: Flame,      label: 'STREAK',     value: `${user?.streak}d`,                color: '#f5c842' },
                        { icon: TrendingUp, label: 'BEST STREAK',value: `${user?.longestStreak}d`,          color: '#ff6b35' },
                        { icon: Trophy,     label: 'TASKS DONE', value: `${user?.totalTasksCompleted}`,     color: '#00d4b4' },
                        { icon: Star,       label: 'WEEK SCORE', value: `${user?.weeklyScore.toFixed(1)}`,  color: 'var(--acid)' },
                      ].map(({ icon: Icon, label, value, color }) => (
                        <div key={label} className="p-3 text-center" style={{ background: 'var(--bg-overlay)', border: `1px solid ${color}25`, borderTop: `2px solid ${color}` }}>
                          <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
                          <p className="mono text-lg font-black" style={{ color }}>{value}</p>
                          <p className="mono text-[8px] tracking-widest" style={{ color: 'var(--tx-ghost)' }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Badges */}
                    <div className="mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>BADGES EARNED</p>
                        <span className="mono text-[9px]" style={{ color: 'var(--tx-ghost)' }}>
                          {user?.badges.length} / {BADGE_DEFINITIONS.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {BADGE_DEFINITIONS.map(def => {
                          const earned = user?.badges.find(b => b.id === def.id);
                          return (
                            <div key={def.id}
                              className="flex items-center gap-2 px-3 py-2 transition-all"
                              style={{
                                background: earned ? RARITY_GLOW[def.rarity] : 'var(--bg-overlay)',
                                border: `1px solid ${earned ? RARITY_COLORS[def.rarity] + '50' : 'var(--border-dim)'}`,
                                borderLeft: `2px solid ${earned ? RARITY_COLORS[def.rarity] : 'var(--border-dim)'}`,
                                opacity: earned ? 1 : 0.35,
                              }}>
                              <span className="text-base">{def.icon}</span>
                              <div>
                                <p className="mono text-[9px] font-bold" style={{ color: earned ? RARITY_COLORS[def.rarity] : 'var(--tx-ghost)' }}>
                                  {def.label}
                                </p>
                                <p className="mono text-[7px] tracking-widest" style={{ color: RARITY_COLORS[def.rarity], opacity: 0.7 }}>
                                  {def.rarity.toUpperCase()}
                                </p>
                              </div>
                              {!earned && (
                                <span className="mono text-[7px] ml-1" style={{ color: 'var(--tx-ghost)' }}>LOCKED</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Edit fields */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>FULL NAME</label>
                          <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                            className={inp} style={inpStyle}
                            onFocus={e => (e.target.style.borderColor = 'var(--acid)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>OCCUPATION</label>
                          <input type="text" value={profileOcc} onChange={e => setProfileOcc(e.target.value)}
                            className={inp} style={inpStyle}
                            onFocus={e => (e.target.style.borderColor = 'var(--acid)')}
                            onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>TIMEZONE</label>
                        <select value={profileTz} onChange={e => setProfileTz(e.target.value)}
                          className={inp} style={inpStyle}>
                          {TIMEZONES.map(tz => <option key={tz} value={tz} style={{ background: 'var(--bg-overlay)' }}>{tz}</option>)}
                        </select>
                      </div>

                      {/* Coach style */}
                      <div>
                        <label className="mono text-[9px] tracking-widest mb-2 block" style={{ color: 'var(--tx-muted)' }}>COACH STYLE</label>
                        <div className="space-y-1.5">
                          {COACH_STYLES.map(cs => (
                            <div key={cs.id} onClick={() => setCoachStyle(cs.id)}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all"
                              style={{ background: coachStyle === cs.id ? 'rgba(212,245,60,0.05)' : 'var(--bg-overlay)', border: `1px solid ${coachStyle === cs.id ? 'var(--acid)' : 'var(--border-dim)'}` }}>
                              <span className="mono text-lg" style={{ color: coachStyle === cs.id ? 'var(--acid)' : 'var(--tx-muted)' }}>{cs.symbol}</span>
                              <div className="flex-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--tx-primary)' }}>{cs.label}</p>
                                <p className="mono text-[8px] italic" style={{ color: 'var(--tx-muted)' }}>{cs.tagline}</p>
                              </div>
                              <div className="w-4 h-4 flex items-center justify-center shrink-0"
                                style={{ background: coachStyle === cs.id ? 'var(--acid)' : 'transparent', border: `1px solid ${coachStyle === cs.id ? 'var(--acid)' : 'var(--border-mid)'}` }}>
                                {coachStyle === cs.id && <span style={{ color: 'var(--bg-void)', fontSize: 9, fontWeight: 'bold' }}>✓</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border-dim)' }}>
                        <button onClick={handleSave} disabled={saving}
                          className="px-5 py-2.5 mono text-[10px] tracking-widest font-bold transition-all disabled:opacity-60"
                          style={{ background: saved ? 'rgba(0,212,180,0.1)' : 'var(--acid)', color: saved ? '#00d4b4' : 'var(--bg-void)', border: saved ? '1px solid rgba(0,212,180,0.3)' : 'none' }}>
                          {saved ? '✓ SAVED' : saving ? 'SAVING…' : 'SAVE CHANGES'}
                        </button>
                        <button onClick={() => setConfirmDelete(true)} className="mono text-[9px]" style={{ color: '#ff4444' }}>DELETE ACCOUNT</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── NOTIFICATIONS ── */}
              {tab === 'notifications' && (
                <div className="p-6 space-y-4" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderTop: '2px solid #f5c842' }}>
                  <p className="mono text-[9px] tracking-widest font-bold" style={{ color: '#f5c842' }}>// NOTIFICATIONS</p>
                  <div className="p-4" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--tx-primary)' }}>Push Notifications</p>
                        <p className="mono text-[9px] mt-0.5" style={{ color: 'var(--tx-muted)' }}>
                          {pushPerm === 'unsupported' ? 'NOT SUPPORTED IN THIS BROWSER'
                            : pushPerm === 'denied' ? 'BLOCKED — ENABLE IN BROWSER SETTINGS'
                            : 'DEVICE ALERTS FOR BLOCKS & TASKS'}
                        </p>
                      </div>
                      <Toggle
                        on={notificationPrefs.pushEnabled}
                        onChange={togglePush}
                      />
                    </div>
                    {pushBusy && <p className="mono text-[9px] mt-2" style={{ color: 'var(--tx-muted)' }}>WORKING…</p>}
                    {pushError && <p className="text-xs mt-2" style={{ color: '#ff4444' }}>{pushError}</p>}
                    {notificationPrefs.pushEnabled && !pushBusy && (
                      <button onClick={handleTestPush} disabled={testingPush}
                        className="mono text-[9px] mt-2 tracking-widest disabled:opacity-50" style={{ color: '#f5c842' }}>
                        {testingPush ? 'SENDING…' : testPushResult || 'SEND TEST NOTIFICATION →'}
                      </button>
                    )}
                  </div>
                  {([
                    { key: 'morningBriefing'  as const, label: 'Morning Briefing',    sub: 'DAILY TASK SUMMARY AT WAKE TIME' },
                    { key: 'blockTransitions' as const, label: 'Block Transitions',   sub: '5 MIN BEFORE EACH PLANNER BLOCK STARTS/ENDS' },
                    { key: 'taskReminders'    as const, label: 'Task Reminders',      sub: 'REMINDERS DURING DEEP WORK WINDOWS' },
                    { key: 'coachNudges'      as const, label: 'Ryna Coach Nudges',   sub: 'AI COACHING MESSAGES WHEN YOU\'RE OFF TRACK' },
                    { key: 'eveningReflection'as const, label: 'Evening Reflection',  sub: 'PROMPT TO LOG DAILY REFLECTION' },
                    { key: 'weeklyReport'     as const, label: 'Weekly Report',       sub: 'AI-GENERATED PERFORMANCE DIGEST' },
                  ]).map(({ key, label, sub }) => (
                    <div key={key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--tx-primary)' }}>{label}</p>
                        <p className="mono text-[9px] mt-0.5" style={{ color: 'var(--tx-muted)' }}>{sub}</p>
                      </div>
                      <Toggle on={notificationPrefs[key]} onChange={v => updateNotificationPrefs({ [key]: v })} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {[
                      { key: 'briefingTime'    as const, label: 'BRIEFING TIME' },
                      { key: 'reflectionTime'  as const, label: 'REFLECTION TIME' },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1.5">
                        <label className="mono text-[9px] tracking-widest flex items-center gap-1" style={{ color: 'var(--tx-muted)' }}>
                          <Clock className="w-3 h-3" /> {label}
                        </label>
                        <input type="time" value={notificationPrefs[key]} onChange={e => updateNotificationPrefs({ [key]: e.target.value })}
                          className={inp} style={inpStyle} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── APPEARANCE ── */}
              {tab === 'appearance' && (
                <div className="p-6 space-y-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderTop: '2px solid #7b8fa8' }}>
                  <p className="mono text-[9px] tracking-widest font-bold" style={{ color: '#7b8fa8' }}>// APPEARANCE</p>
                  <div>
                    <p className="mono text-[9px] tracking-widest mb-3" style={{ color: 'var(--tx-muted)' }}>ACCENT COLOURS</p>
                    <div className="flex gap-2">
                      {['#d4f53c','#ff6b35','#00d4b4','#f5c842','#a78bfa','#f472b6'].map(c => (
                        <div key={c} className="w-8 h-8 cursor-pointer transition-transform hover:scale-110"
                          style={{ background: c, border: c === '#d4f53c' ? '2px solid white' : '2px solid transparent' }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>APP VERSION</p>
                    <p className="mono text-xs" style={{ color: 'var(--tx-ghost)' }}>GOALFLOW V0.1.0 · BETA · BUILT WITH INTENT</p>
                  </div>
                </div>
              )}

              {/* ── SECURITY ── */}
              {tab === 'security' && (
                <div className="p-6 space-y-5" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-dim)', borderTop: '2px solid #ff6b35' }}>
                  <p className="mono text-[9px] tracking-widest font-bold" style={{ color: '#ff6b35' }}>// SECURITY</p>
                  <div className="space-y-3">
                    <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>CHANGE PASSWORD</p>
                    <input type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                      className={inp} style={inpStyle}
                      onFocus={e => (e.target.style.borderColor = '#ff6b35')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
                    <input type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className={inp} style={inpStyle}
                      onFocus={e => (e.target.style.borderColor = '#ff6b35')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
                    <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className={inp} style={inpStyle}
                      onFocus={e => (e.target.style.borderColor = '#ff6b35')}
                      onBlur={e => (e.target.style.borderColor = 'var(--border-dim)')} />
                    {passwordError && <p className="text-xs" style={{ color: '#ff4444' }}>{passwordError}</p>}
                    {passwordSaved && <p className="text-xs" style={{ color: '#00d4b4' }}>Password updated.</p>}
                    <button onClick={handleChangePassword} disabled={changingPassword}
                      className="px-5 py-2.5 mono text-[10px] tracking-widest font-bold disabled:opacity-50"
                      style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.25)', color: '#ff6b35' }}>
                      {changingPassword ? 'UPDATING…' : 'UPDATE PASSWORD'}
                    </button>
                  </div>
                  <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
                    <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--tx-muted)' }}>ACTIVE SESSIONS</p>
                    <div className="flex items-center justify-between p-4" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-dim)' }}>
                      <div>
                        <p className="text-sm" style={{ color: 'var(--tx-primary)' }}>Current session</p>
                        <p className="mono text-[9px] mt-0.5" style={{ color: 'var(--tx-muted)' }}>WEB · {user?.timezone?.toUpperCase()}</p>
                      </div>
                      <span className="mono text-[9px] px-2 py-1" style={{ color: '#00d4b4', background: 'rgba(0,212,180,0.08)', border: '1px solid rgba(0,212,180,0.2)' }}>ACTIVE</span>
                    </div>
                  </div>
                  <div className="pt-4" style={{ borderTop: '1px solid var(--border-dim)' }}>
                    <p className="mono text-[9px] tracking-widest mb-3" style={{ color: '#ff4444' }}>DANGER ZONE</p>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2.5 mono text-[10px] tracking-widest transition-all"
                      style={{ color: '#ff4444', border: '1px solid rgba(255,68,68,0.25)', background: 'rgba(255,68,68,0.05)' }}>
                      <LogOut className="w-3.5 h-3.5" /> SIGN OUT ALL SESSIONS
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Delete-account confirmation. Deletion is irreversible and cascades to
          every goal, task, log and conversation, so it requires typing the
          word rather than a single mis-clickable button. */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)' }}
            onClick={() => !deleting && setConfirmDelete(false)}>
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md p-6"
              style={{ background: 'var(--bg-raised)', border: '1px solid rgba(255,68,68,0.4)', borderTop: '3px solid #ff4444' }}>
              <p className="mono text-[9px] tracking-widest mb-2" style={{ color: '#ff4444' }}>IRREVERSIBLE</p>
              <h2 className="text-lg font-black mb-3" style={{ color: 'var(--tx-primary)' }}>Delete your account?</h2>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--tx-secondary)' }}>
                This permanently deletes your profile, goals, tasks, planner blocks, daily logs,
                streak, stats and Ryna conversation history. It cannot be undone.
              </p>
              <label className="mono text-[9px] tracking-widest block mb-1.5" style={{ color: 'var(--tx-muted)' }}>
                TYPE <span style={{ color: '#ff4444' }}>DELETE</span> TO CONFIRM
              </label>
              <input
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                autoFocus
                className={inp}
                style={{ ...inpStyle, marginBottom: 8 }}
                placeholder="DELETE"
              />
              {deleteError && (
                <p className="text-xs mb-2" style={{ color: '#ff4444' }}>{deleteError}</p>
              )}
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteText(''); setDeleteError(''); }}
                  disabled={deleting}
                  className="mono text-[10px] tracking-widest px-4 py-2.5 disabled:opacity-50"
                  style={{ color: 'var(--tx-muted)', border: '1px solid var(--border-mid)' }}>
                  CANCEL
                </button>
                <button
                  disabled={deleteText !== 'DELETE' || deleting}
                  onClick={async () => {
                    setDeleting(true); setDeleteError('');
                    try {
                      await deleteAccount();
                      await logout();
                      navigate('/');
                    } catch (e) {
                      setDeleteError(e instanceof Error ? e.message : 'Could not delete account.');
                      setDeleting(false);
                    }
                  }}
                  className="mono text-[10px] tracking-widest px-4 py-2.5 font-bold disabled:opacity-40"
                  style={{ background: '#ff4444', color: '#fff' }}>
                  {deleting ? 'DELETING…' : 'DELETE FOREVER'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
