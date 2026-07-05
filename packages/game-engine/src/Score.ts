import { type LeaderboardEntry, territoryPercent } from '@paperpiece/shared';
import { type Grid } from './Grid';

/** Minimal player shape the scoring functions need — keeps the engine decoupled. */
export interface ScorablePlayer {
  id: string;
  username: string;
  color: string;
  kills: number;
  deaths: number;
  alive: boolean;
}

/**
 * Score formula: territory dominates, with a bonus per kill. Deaths do not
 * subtract (they are already punished by lost territory). Tunable in one place.
 */
export function computeScore(territorySize: number, kills: number): number {
  return territorySize + kills * 25;
}

/** Build the live leaderboard, ranked by territory then kills. */
export function computeLeaderboard(players: ScorablePlayer[], grid: Grid): LeaderboardEntry[] {
  const rows = players.map((p) => {
    const territorySize = grid.territorySizeOf(p.id);
    return {
      playerId: p.id,
      username: p.username,
      color: p.color,
      territorySize,
      territoryPercent: territoryPercent(territorySize, grid.size),
      kills: p.kills,
      deaths: p.deaths,
      alive: p.alive,
    };
  });

  rows.sort((a, b) => {
    if (b.territorySize !== a.territorySize) return b.territorySize - a.territorySize;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.deaths - b.deaths;
  });

  return rows.map((row, i) => ({ rank: i + 1, ...row }));
}

/**
 * Decide whether the match has a winner.
 * - If only one player remains alive (and there was more than one), they win.
 * - Otherwise, when a time/goal end is triggered externally, the top of the
 *   leaderboard wins. Returns null while the match should continue.
 */
export function detectLastStanding(players: ScorablePlayer[]): string | null {
  const alive = players.filter((p) => p.alive);
  if (players.length > 1 && alive.length === 1) return alive[0]!.id;
  return null;
}

/** The winner given a finished leaderboard (top territory). */
export function leaderboardWinner(leaderboard: LeaderboardEntry[]): string | null {
  return leaderboard[0]?.playerId ?? null;
}
