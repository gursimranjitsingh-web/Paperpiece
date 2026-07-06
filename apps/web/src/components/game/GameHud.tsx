'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { PowerUpType, TEAM_META } from '@paperpiece/shared';
import { SettingsMenu } from '@/components/SettingsMenu';
import { gameBuffer } from '@/lib/gameBuffer';
import { useGameStore } from '@/stores/gameStore';
import { useRoomStore } from '@/stores/roomStore';

const POWERUP_META: Record<PowerUpType, { icon: string; label: string; color: string }> = {
  [PowerUpType.Shield]: { icon: '🛡️', label: 'Shield', color: '#3a86ff' },
  [PowerUpType.SpeedBoost]: { icon: '⚡', label: 'Speed', color: '#ffd166' },
  [PowerUpType.Freeze]: { icon: '❄️', label: 'Freeze', color: '#9bf6ff' },
  [PowerUpType.ShrinkTerritory]: { icon: '✂️', label: 'Shrink', color: '#ef476f' },
  [PowerUpType.Ghost]: { icon: '👻', label: 'Ghost', color: '#b39ddb' },
  [PowerUpType.Magnet]: { icon: '🧲', label: 'Magnet', color: '#ff9f1c' },
};

/** Formats seconds as m:ss, or ∞ when the match is untimed. */
function formatTime(sec: number | null): string {
  if (sec === null) return '∞';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** In-match overlay: leaderboard, your stats, timer, ping, kill feed. */
export function GameHud({ playerId, onExit }: { playerId: string; onExit?: () => void }) {
  const leaderboard = useGameStore((s) => s.leaderboard);
  const me = useGameStore((s) => s.me);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const aliveCount = useGameStore((s) => s.aliveCount);
  const killFeed = useGameStore((s) => s.killFeed);
  const roomCode = useRoomStore((s) => s.room?.roomCode);
  const pingMs = useRoomStore((s) => s.pingMs);
  const teamCount = useRoomStore((s) => s.room?.settings.teamCount ?? 0);
  useGameStore((s) => s.frame); // re-read active power-ups each tick
  const meBuf = gameBuffer.players.get(playerId);
  const myPowers = meBuf?.activePowerUps ?? [];
  const combo = meBuf?.combo ?? 0;

  // Team standings: sum each team's territory% from the live leaderboard.
  const teamTotals: { team: number; percent: number }[] = [];
  if (teamCount > 0) {
    const sums = new Array<number>(teamCount).fill(0);
    for (const e of leaderboard) {
      const t = gameBuffer.players.get(e.playerId)?.team;
      if (t != null && t < teamCount) sums[t] = (sums[t] ?? 0) + e.territoryPercent;
    }
    for (let i = 0; i < teamCount; i += 1) teamTotals.push({ team: i, percent: Math.round((sums[i] ?? 0) * 10) / 10 });
    teamTotals.sort((a, b) => b.percent - a.percent);
  }

  return (
    <>
      {/* Top-left: room + timer + alive */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        {onExit && (
          <button
            onClick={onExit}
            className="pointer-events-auto self-start rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-[var(--color-ink-soft)] backdrop-blur transition hover:bg-white/10 hover:text-[var(--color-ink)]"
          >
            ← Leave match
          </button>
        )}
        <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur">
          <span className="font-mono font-bold tracking-widest text-[var(--color-accent)]">{roomCode}</span>
          <span className="mx-2 text-[var(--color-ink-soft)]">·</span>
          <span className="tabular-nums">{formatTime(timeRemaining)}</span>
          <span className="mx-2 text-[var(--color-ink-soft)]">·</span>
          <span className="text-[var(--color-ink-soft)]">{aliveCount} alive</span>
          <span className="mx-2 text-[var(--color-ink-soft)]">·</span>
          <span className="text-[var(--color-ink-soft)]">{pingMs ?? '—'}ms</span>
        </div>
        {me && (
          <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur">
            You · <span className="font-bold text-[var(--color-accent)]">{me.territoryPercent}%</span> ·{' '}
            {me.kills} kills · rank #{me.rank}
          </div>
        )}
        {myPowers.length > 0 && (
          <div className="flex gap-1.5">
            {myPowers.map((t) => (
              <span
                key={t}
                title={POWERUP_META[t].label}
                className="rounded-lg border bg-black/40 px-2 py-1 text-sm backdrop-blur"
                style={{ borderColor: `${POWERUP_META[t].color}66` }}
              >
                {POWERUP_META[t].icon}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Top-right: team standings (team modes only) */}
      {teamCount > 0 && (
        <div className="pointer-events-none absolute right-4 top-4 w-56 rounded-xl border border-white/10 bg-black/40 p-3 text-sm backdrop-blur">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
            Teams
          </p>
          <ul className="flex flex-col gap-1">
            {teamTotals.map((t) => (
              <li key={t.team} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TEAM_META[t.team]?.color }} />
                <span className="flex-1" style={{ color: TEAM_META[t.team]?.color }}>
                  {TEAM_META[t.team]?.label}
                </span>
                <span className="tabular-nums font-semibold">{t.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top-right: leaderboard (shifts down when the team panel is shown) */}
      <div
        className={`pointer-events-none absolute right-4 w-56 rounded-xl border border-white/10 bg-black/40 p-3 text-sm backdrop-blur ${
          teamCount > 0 ? 'top-32' : 'top-4'
        }`}
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
          Leaderboard
        </p>
        <ol className="flex flex-col gap-1">
          {leaderboard.slice(0, 8).map((e) => (
            <li
              key={e.playerId}
              className={`flex items-center gap-2 rounded-md px-1 py-0.5 ${
                e.playerId === playerId ? 'bg-white/10' : ''
              }`}
            >
              <span className="w-4 text-right text-[var(--color-ink-soft)]">{e.rank}</span>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
              <span className="flex-1 truncate">{e.username}</span>
              <span className="tabular-nums font-semibold">{e.territoryPercent}%</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Bottom-right: settings */}
      <div className="pointer-events-auto absolute bottom-4 right-4">
        <SettingsMenu placement="top" />
      </div>

      {/* Combo streak: a punchy centre badge that pops while chaining captures. */}
      <AnimatePresence>
        {combo >= 2 && (
          <motion.div
            key={combo}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-orange-400/50 bg-black/50 px-4 py-1.5 text-center backdrop-blur"
          >
            <span className="text-lg font-black text-orange-300">🔥 {combo}× COMBO</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-center: kill feed */}
      <div className="pointer-events-none absolute left-1/2 top-4 flex w-72 -translate-x-1/2 flex-col items-center gap-1">
        <AnimatePresence initial={false}>
          {killFeed.map((k) => (
            <motion.div
              key={k.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-[var(--color-ink-soft)] backdrop-blur"
            >
              {k.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
