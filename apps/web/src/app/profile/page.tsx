'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Avatar';
import { useIdentityStore } from '@/stores/identityStore';

/** The local player's profile: lifetime stats + recent match history. */
export default function ProfilePage() {
  const playerId = useIdentityStore((s) => s.playerId);
  const username = useIdentityStore((s) => s.username);
  const avatar = useIdentityStore((s) => s.avatar);
  const hydrated = useIdentityStore((s) => s.hydrated);

  const profileQ = useQuery({
    queryKey: ['profile', playerId],
    queryFn: () => api.profile(playerId),
    enabled: hydrated && !!playerId,
    retry: false,
  });
  const matchesQ = useQuery({
    queryKey: ['matches', playerId],
    queryFn: () => api.matches(playerId),
    enabled: hydrated && !!playerId,
  });

  const p = profileQ.data?.profile;
  const matches = matchesQ.data?.matches ?? [];

  return (
    <main className="grid-backdrop min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black">Profile</h1>
          <Link href="/" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            ← Home
          </Link>
        </div>

        {!p && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-[var(--color-ink-soft)]">
            {profileQ.isLoading
              ? 'Loading…'
              : `No stats yet for "${username || 'you'}". Play a match (with persistence enabled) to build your profile.`}
          </div>
        )}

        {p && (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-4">
                <Avatar src={avatar} name={p.username} size={64} ring={false} />
                <div className="flex-1">
                  <p className="text-2xl font-bold">{p.username}</p>
                  <p className="text-sm text-[var(--color-ink-soft)]">
                    Level {p.level} · {p.xp} XP total
                  </p>
                  {/* Battle-pass progress to next level */}
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]"
                      style={{ width: `${Math.round((p.xpIntoLevel / p.xpForLevel) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {p.xpIntoLevel} / {p.xpForLevel} XP to level {p.level + 1}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Games" value={p.gamesPlayed} />
                <Stat label="Wins" value={p.wins} />
                <Stat label="Win rate" value={`${p.winRate}%`} />
                <Stat label="Kills" value={p.kills} />
                <Stat label="K/D" value={p.kd} />
                <Stat label="Best territory" value={p.highestTerritory} />
              </div>
            </div>

            <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
              Daily missions
            </h2>
            <ul className="flex flex-col gap-2">
              {p.missions.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span className={m.completed ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-soft)]'}>
                    {m.completed ? '✓' : '○'}
                  </span>
                  <span className="flex-1">{m.label}</span>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)]"
                      style={{ width: `${Math.round((m.progress / m.target) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right tabular-nums text-[var(--color-ink-soft)]">
                    {m.progress}/{m.target}
                  </span>
                </li>
              ))}
            </ul>

            <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
              Recent matches
            </h2>
            {matches.length === 0 ? (
              <p className="text-[var(--color-ink-soft)]">No matches recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {matches.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        m.won ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-[var(--color-ink-soft)]'
                      }`}
                    >
                      {m.won ? 'WIN' : `#${m.placement ?? '—'}`}
                    </span>
                    <span className="flex-1 text-[var(--color-ink-soft)]">
                      {m.mapSize}×{m.mapSize} · {m.players} players
                    </span>
                    <span className="tabular-nums">{m.territoryPercent}%</span>
                    <span className="tabular-nums text-[var(--color-ink-soft)]">{m.kills} kills</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
