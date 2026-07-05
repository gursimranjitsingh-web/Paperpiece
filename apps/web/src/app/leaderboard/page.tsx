'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';

/** Global all-time leaderboard, ranked by rank points. */
export default function LeaderboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: api.leaderboard,
    refetchInterval: 30_000,
  });

  const rows = data?.leaderboard ?? [];

  return (
    <main className="grid-backdrop min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-black">Global Leaderboard</h1>
          <Link href="/" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            ← Home
          </Link>
        </div>

        {isLoading && <p className="text-[var(--color-ink-soft)]">Loading…</p>}
        {isError && <p className="text-[var(--color-danger)]">Could not reach the server.</p>}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-[var(--color-ink-soft)]">
            No ranked matches yet — or persistence (MongoDB) is offline. Finish a match to appear here.
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/30 text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3 text-right">Points</th>
                  <th className="px-4 py-3 text-right">Wins</th>
                  <th className="px-4 py-3 text-right">Kills</th>
                  <th className="px-4 py-3 text-right">Best %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.playerId} className="border-t border-white/5">
                    <td className="px-4 py-3 font-bold text-[var(--color-accent)]">{r.rank}</td>
                    <td className="px-4 py-3">{r.username}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{r.rankPoints}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.wins}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.kills}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.highestTerritory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
