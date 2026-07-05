import { DAILY_MISSIONS, XP_PER_LEVEL } from '@paperpiece/shared';
import { isDatabaseConnected } from '../database/connection.js';
import { Leaderboard, User } from '../models/index.js';

export interface MissionProgress {
  id: string;
  label: string;
  target: number;
  progress: number;
  completed: boolean;
}

export interface PublicProfile {
  playerId: string;
  username: string;
  level: number;
  xp: number;
  /** XP earned within the current level, and the amount needed to level up. */
  xpIntoLevel: number;
  xpForLevel: number;
  gamesPlayed: number;
  wins: number;
  kills: number;
  deaths: number;
  highestTerritory: number;
  kd: number;
  winRate: number;
  selectedSkin: string;
  missions: MissionProgress[];
}

/** Derive level from XP. */
function levelFromXp(xp: number): number {
  return 1 + Math.floor(xp / XP_PER_LEVEL);
}

/** Today's mission progress for a user, resetting the view if it's a new day. */
function missionsFor(raw: unknown): MissionProgress[] {
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = raw as any;
  const fresh = !m || m.date !== today;
  const prog: Record<string, number> = fresh ? {} : (m.progress ?? {});
  const completed: string[] = fresh ? [] : (m.completed ?? []);
  return DAILY_MISSIONS.map((d) => ({
    id: d.id,
    label: d.label,
    target: d.target,
    progress: Math.min(prog[d.id] ?? 0, d.target),
    completed: completed.includes(d.id),
  }));
}

/** Public profile with derived stats, or null if unknown / DB offline. */
export async function getProfile(playerId: string): Promise<PublicProfile | null> {
  if (!isDatabaseConnected()) return null;
  const u = await User.findOne({ playerId }).lean();
  if (!u) return null;
  const xp = u.xp ?? 0;
  return {
    playerId: u.playerId,
    username: u.username,
    level: levelFromXp(xp),
    xp,
    xpIntoLevel: xp % XP_PER_LEVEL,
    xpForLevel: XP_PER_LEVEL,
    missions: missionsFor(u.missions),
    gamesPlayed: u.gamesPlayed ?? 0,
    wins: u.wins ?? 0,
    kills: u.kills ?? 0,
    deaths: u.deaths ?? 0,
    highestTerritory: u.highestTerritory ?? 0,
    kd: (u.deaths ?? 0) > 0 ? Math.round(((u.kills ?? 0) / (u.deaths ?? 1)) * 100) / 100 : (u.kills ?? 0),
    winRate:
      (u.gamesPlayed ?? 0) > 0 ? Math.round(((u.wins ?? 0) / (u.gamesPlayed ?? 1)) * 1000) / 10 : 0,
    selectedSkin: u.selectedSkin ?? 'default',
  };
}

export interface LeaderboardRow {
  rank: number;
  playerId: string;
  username: string;
  wins: number;
  kills: number;
  gamesPlayed: number;
  highestTerritory: number;
  rankPoints: number;
}

/** Global all-time leaderboard, ranked by rank points. */
export async function getGlobalLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  if (!isDatabaseConnected()) return [];
  const rows = await Leaderboard.find().sort({ rankPoints: -1 }).limit(Math.min(limit, 100)).lean();
  return rows.map((r, i) => ({
    rank: i + 1,
    playerId: r.playerId,
    username: r.username,
    wins: r.wins ?? 0,
    kills: r.kills ?? 0,
    gamesPlayed: r.gamesPlayed ?? 0,
    highestTerritory: r.highestTerritory ?? 0,
    rankPoints: r.rankPoints ?? 0,
  }));
}
