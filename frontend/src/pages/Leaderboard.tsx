import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Crown } from 'lucide-react';
import { useStore } from '../lib/store';
import { getLevelInfo } from '../lib/constants';

const RANK_COLORS = ['#FACC15', '#94a3b8', '#F97316'];
const RARITY_COLORS = { common: '#5a5448', rare: '#60a5fa', epic: '#a78bfa', legendary: '#FACC15' };

export default function Leaderboard() {
  const { leaderboard, user } = useStore();
  const [tab, setTab] = useState<'weekly' | 'alltime' | 'streak'>('weekly');

  const sorted = [...leaderboard].sort((a, b) =>
    tab === 'weekly' ? b.weeklyScore - a.weeklyScore :
    tab === 'streak' ? b.streak - a.streak :
    b.xp - a.xp
  ).map((e, i) => ({ ...e, rank: i + 1 }));

  const myEntry = sorted.find(e => e.userId === user?.id);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 pb-5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--tx-muted)' }}>GLOBAL RANKINGS · TOP ACHIEVERS</p>
          <h1 className="text-2xl font-black">Leaderboard</h1>
        </div>
        <div className="flex items-center gap-px" style={{ border: '1px solid var(--border-mid)' }}>
          {(['weekly', 'alltime', 'streak'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="mono text-[9px] tracking-widest px-4 py-2 capitalize transition-all"
              style={{ background: tab === t ? 'var(--acid)' : 'var(--bg-raised)', color: tab === t ? 'var(--bg-void)' : 'var(--tx-muted)' }}>
              {t === 'weekly' ? 'THIS WEEK' : t === 'alltime' ? 'ALL TIME' : 'STREAK'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Top 3 podium */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3 mb-8">
        {sorted.slice(0, 3).map((entry, i) => {
          const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd visual order
          // podiumOrder assumes a full 3-entry podium; with fewer real users
          // than that (the exact state right after launch — possibly just
          // one), some slots have nothing to re-index to. Render nothing for
          // those rather than crashing the whole page on `display.level`.
          const display = sorted.slice(0, 3)[podiumOrder[i]];
          if (!display) return null;
          const dl = getLevelInfo(display.level);
          return (
            <motion.div key={display.userId}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
              className={`p-5 text-center relative ${podiumOrder[i] === 0 ? 'order-2' : podiumOrder[i] === 1 ? 'order-1' : 'order-3'}`}
              style={{
                background: display.userId === user?.id ? 'rgba(139,92,246,0.06)' : 'var(--bg-raised)',
                border: `1px solid ${RANK_COLORS[podiumOrder[i]] || 'var(--border-mid)'}40`,
                borderTop: `3px solid ${RANK_COLORS[podiumOrder[i]] || 'var(--border-mid)'}`,
              }}>
              {podiumOrder[i] === 0 && <Crown className="w-4 h-4 mx-auto mb-2" style={{ color: '#FACC15' }} />}
              <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center mono text-xl font-black"
                style={{ background: `${RANK_COLORS[podiumOrder[i]] || 'var(--border-mid)'}20`, border: `2px solid ${RANK_COLORS[podiumOrder[i]] || 'var(--border-mid)'}`, color: RANK_COLORS[podiumOrder[i]] || 'var(--tx-primary)' }}>
                {display.avatarInitial}
              </div>
              {display.badge && <div className="text-lg mb-1">{display.badge}</div>}
              <p className="font-bold text-sm" style={{ color: 'var(--tx-primary)' }}>{display.name}</p>
              <p className="mono text-[9px] mt-0.5" style={{ color: dl.color }}>{dl.label}</p>
              <p className="mono text-[9px] mt-1" style={{ color: 'var(--tx-muted)' }}>
                {tab === 'weekly' ? `${display.weeklyScore.toFixed(1)} score` : tab === 'streak' ? `${display.streak}d streak` : `${display.xp.toLocaleString()} XP`}
              </p>
              <div className="absolute top-2 left-2 mono text-[10px] font-black" style={{ color: RANK_COLORS[podiumOrder[i]] }}>
                #{display.rank}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Full leaderboard */}
      <div style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-mid)' }}>
        <div className="px-5 py-3 grid grid-cols-12 mono text-[8px] tracking-widest" style={{ color: 'var(--tx-ghost)', borderBottom: '1px solid var(--border-dim)' }}>
          <span className="col-span-1">RANK</span>
          <span className="col-span-7 sm:col-span-4">MEMBER</span>
          <span className="hidden sm:block sm:col-span-2">LEVEL</span>
          <span className="col-span-2">STREAK</span>
          <span className="col-span-2">SCORE</span>
          <span className="hidden sm:block sm:col-span-1">XP</span>
        </div>
        {sorted.map((entry, idx) => {
          const levelInfo = getLevelInfo(entry.level);
          const isMe = entry.userId === user?.id;
          return (
            <motion.div key={entry.userId}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * idx }}
              className="px-5 py-3.5 grid grid-cols-12 items-center transition-all"
              style={{
                borderBottom: '1px solid var(--border-dim)',
                background: isMe ? 'rgba(139,92,246,0.04)' : 'transparent',
                borderLeft: isMe ? '2px solid var(--acid)' : '2px solid transparent',
              }}>
              <div className="col-span-1">
                <span className="mono text-[10px] font-black" style={{ color: entry.rank <= 3 ? RANK_COLORS[entry.rank - 1] : 'var(--tx-muted)' }}>
                  {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
                </span>
              </div>
              <div className="col-span-7 sm:col-span-4 flex items-center gap-2.5">
                <div className="w-7 h-7 flex items-center justify-center mono text-xs font-black shrink-0"
                  style={{ background: `${levelInfo.color}20`, border: `1px solid ${levelInfo.color}50`, color: levelInfo.color }}>
                  {entry.avatarInitial}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: isMe ? 'var(--acid)' : 'var(--tx-primary)' }}>
                    {entry.name} {isMe && <span className="mono text-[8px]" style={{ color: 'var(--acid)' }}>(you)</span>}
                  </p>
                  <div className="flex gap-1 mt-0.5">
                    {entry.pillars.slice(0, 3).map(p => (
                      <span key={p} className="mono text-[7px] px-1" style={{ background: 'var(--border-dim)', color: 'var(--tx-ghost)' }}>{p.slice(0,3)}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="hidden sm:block sm:col-span-2">
                <p className="mono text-[9px] font-bold" style={{ color: levelInfo.color }}>Lv.{entry.level}</p>
                <p className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>{levelInfo.label}</p>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <Flame className="w-3 h-3" style={{ color: entry.streak >= 14 ? '#FACC15' : 'var(--tx-muted)' }} />
                <span className="mono text-[10px] font-bold" style={{ color: 'var(--tx-primary)' }}>{entry.streak}d</span>
              </div>
              <div className="col-span-2">
                <span className="mono text-[10px] font-bold" style={{ color: entry.weeklyScore >= 8 ? 'var(--success)' : entry.weeklyScore >= 6 ? 'var(--acid)' : 'var(--tx-secondary)' }}>
                  {entry.weeklyScore.toFixed(1)}
                </span>
              </div>
              <div className="hidden sm:block sm:col-span-1">
                <span className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>{(entry.xp / 1000).toFixed(1)}k</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* My position summary */}
      {myEntry && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-6 p-5" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)', borderTop: '2px solid var(--acid)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="mono text-[9px] tracking-widest mb-1" style={{ color: 'var(--acid)' }}>YOUR POSITION</p>
              <p className="font-bold" style={{ color: 'var(--tx-primary)' }}>Rank #{myEntry.rank} · {user?.streak}-day streak · {user?.xp.toLocaleString()} XP</p>
              <p className="text-xs mt-1" style={{ color: 'var(--tx-secondary)' }}>
                {myEntry.rank <= 3 ? 'You\'re in the top 3 — exceptional.' : myEntry.rank <= 5 ? `${myEntry.rank - 1} spots from top 3. Close.` : `${myEntry.rank - 3} spots from top 3. Increase your daily score.`}
              </p>
            </div>
            <div className="text-right">
              <p className="mono text-[9px]" style={{ color: 'var(--tx-muted)' }}>NEXT RANK</p>
              <p className="mono text-sm font-bold" style={{ color: 'var(--acid)' }}>
                +{sorted[myEntry.rank - 2] ? (sorted[myEntry.rank - 2].xp - myEntry.xp).toLocaleString() : '—'} XP
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Badges section */}
      {user?.badges && user.badges.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6">
          <p className="mono text-[9px] tracking-widest mb-3 font-bold" style={{ color: 'var(--tx-muted)' }}>YOUR BADGES</p>
          <div className="flex flex-wrap gap-2">
            {user.badges.map(badge => (
              <div key={badge.id} className="flex items-center gap-2 px-3 py-2"
                style={{ background: 'var(--bg-raised)', border: `1px solid ${RARITY_COLORS[badge.rarity]}40`, borderLeft: `2px solid ${RARITY_COLORS[badge.rarity]}` }}>
                <span className="text-base">{badge.icon}</span>
                <div>
                  <p className="mono text-[9px] font-bold" style={{ color: RARITY_COLORS[badge.rarity] }}>{badge.label}</p>
                  <p className="mono text-[8px]" style={{ color: 'var(--tx-ghost)' }}>{badge.rarity.toUpperCase()}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
