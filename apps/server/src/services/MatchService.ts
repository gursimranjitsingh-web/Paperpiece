import { DAILY_MISSIONS, territoryPercent, type MatchResult } from '@paperpiece/shared';
import { isDatabaseConnected } from '../database/connection.js';
import { logger } from '../config/logger.js';
import { Leaderboard, Match, User } from '../models/index.js';

interface MissionStats {
  games: number;
  kills: number;
  wins: number;
  bestTerritory: number;
}

/** Update a player's daily missions from one match; award bonus XP on completion. */
async function updateMissions(playerId: string, stats: MissionStats): Promise<void> {
  const u = await User.findOne({ playerId });
  if (!u) return;
  const today = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let m = u.missions as any;
  if (!m || m.date !== today) m = { date: today, progress: {}, completed: [] };
  const prog: Record<string, number> = m.progress ?? {};
  const completed: string[] = m.completed ?? [];
  let bonus = 0;

  for (const def of DAILY_MISSIONS) {
    if (def.metric === 'bestTerritory') {
      prog[def.id] = Math.max(prog[def.id] ?? 0, stats.bestTerritory);
    } else {
      prog[def.id] = (prog[def.id] ?? 0) + stats[def.metric];
    }
    if (!completed.includes(def.id) && (prog[def.id] ?? 0) >= def.target) {
      completed.push(def.id);
      bonus += def.xp;
    }
  }

  u.set('missions', { date: today, progress: prog, completed });
  if (bonus > 0) u.set('xp', (u.get('xp') ?? 0) + bonus);
  await u.save();
}

export interface RecordMatchParams {
  roomCode: string;
  mapSize: number;
  mode: string;
  result: MatchResult;
  /** Ids that were server bots — recorded in the match but never persisted as users. */
  botIds: Set<string>;
}

/** XP awarded for a match — rewards territory, kills, and winning. */
function xpFor(territorySize: number, kills: number, isWinner: boolean): number {
  return 50 + Math.round(territorySize / 10) + kills * 20 + (isWinner ? 200 : 0);
}

/** Rank-point delta feeding the global ladder. */
function rankDelta(rank: number, isWinner: boolean): number {
  return isWinner ? 30 : Math.max(2, 12 - (rank - 1) * 2);
}

/**
 * Persist a finished match and roll its results into per-user stats and the
 * global leaderboard. Persistence is best-effort: if MongoDB is unavailable the
 * match still completes in memory and this simply no-ops.
 */
export async function recordMatch(params: RecordMatchParams): Promise<void> {
  if (!isDatabaseConnected()) return;
  const { roomCode, mapSize, mode, result, botIds } = params;

  try {
    const players = result.leaderboard.map((e) => ({
      playerId: e.playerId,
      username: e.username,
      color: e.color,
      isBot: botIds.has(e.playerId),
      kills: e.kills,
      deaths: e.deaths,
      highestTerritory: e.territorySize,
      finalTerritoryPercent: e.territoryPercent,
      placement: e.rank,
    }));
    const totalKills = players.reduce((s, p) => s + p.kills, 0);

    await Match.create({
      roomCode,
      mapSize,
      mode,
      durationSeconds: result.durationSeconds,
      winnerId: result.winnerId,
      players,
      totalKills,
    });

    // Update human players' profiles + ladder rows in parallel.
    await Promise.all(
      players
        .filter((p) => !p.isBot)
        .map(async (p) => {
          const isWinner = p.playerId === result.winnerId;
          await User.updateOne(
            { playerId: p.playerId },
            {
              $setOnInsert: { playerId: p.playerId },
              $set: { username: p.username },
              $inc: {
                gamesPlayed: 1,
                wins: isWinner ? 1 : 0,
                kills: p.kills,
                deaths: p.deaths,
                totalTerritory: p.highestTerritory,
                xp: xpFor(p.highestTerritory, p.kills, isWinner),
              },
              $max: { highestTerritory: p.highestTerritory },
            },
            { upsert: true },
          );
          await Leaderboard.updateOne(
            { playerId: p.playerId },
            {
              $setOnInsert: { playerId: p.playerId },
              $set: { username: p.username },
              $inc: {
                gamesPlayed: 1,
                wins: isWinner ? 1 : 0,
                kills: p.kills,
                rankPoints: rankDelta(p.placement, isWinner),
              },
              $max: { highestTerritory: p.highestTerritory },
            },
            { upsert: true },
          );
          await updateMissions(p.playerId, {
            games: 1,
            kills: p.kills,
            wins: isWinner ? 1 : 0,
            bestTerritory: p.finalTerritoryPercent,
          });
        }),
    );
    logger.info({ roomCode, players: players.length }, 'match persisted');
  } catch (err) {
    logger.error({ err: (err as Error).message, roomCode }, 'failed to persist match');
  }
}

/** Recent matches a player appeared in, newest first. */
export async function recentMatchesForPlayer(playerId: string, limit = 20) {
  if (!isDatabaseConnected()) return [];
  return Match.find({ 'players.playerId': playerId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 50))
    .lean();
}

/** A single match by id. */
export async function matchById(id: string) {
  if (!isDatabaseConnected()) return null;
  return Match.findById(id).lean().catch(() => null);
}

/** Minimal shape needed to build a history row (structural — works for lean docs). */
interface MatchLike {
  _id: unknown;
  roomCode: string;
  mapSize: number;
  durationSeconds: number;
  createdAt?: Date;
  winnerId?: string | null;
  players: {
    playerId: string;
    placement?: number;
    kills?: number;
    finalTerritoryPercent?: number;
  }[];
}

/** Map a match doc to a compact history row for the requesting player. */
export function toHistoryRow(match: MatchLike, playerId: string) {
  const me = match.players.find((p) => p.playerId === playerId);
  return {
    id: String(match._id),
    roomCode: match.roomCode,
    mapSize: match.mapSize,
    durationSeconds: match.durationSeconds,
    createdAt: match.createdAt,
    players: match.players.length,
    won: match.winnerId === playerId,
    placement: me?.placement ?? null,
    kills: me?.kills ?? 0,
    territoryPercent: me?.finalTerritoryPercent ?? 0,
  };
}

/** Utility re-export so routes can compute percentages consistently. */
export { territoryPercent };
