/**
 * Tunable constants for the whole game. Kept in one place so the server (source
 * of truth), the client (prediction/interpolation), and the engine agree.
 */

/** Server simulation rate. The authoritative loop runs at this many ticks/sec. */
export const SERVER_TICK_RATE = 20 as const;
/** Milliseconds per server tick. */
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE;

/** Client render target. */
export const RENDER_FPS = 60 as const;

/** Supported square map sizes (cells per side). */
export const MAP_SIZES = [50, 75, 100, 150, 200, 300, 500] as const;
export type MapSize = (typeof MAP_SIZES)[number];

/** Side length of the starting territory square each player is granted. */
export const SPAWN_TERRITORY_SIZES = [3, 4, 5, 6, 8, 10] as const;
export type SpawnTerritorySize = (typeof SPAWN_TERRITORY_SIZES)[number];

/** Room code format: 6 characters, uppercase letters + digits (no ambiguous chars). */
export const ROOM_CODE_LENGTH = 6 as const;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' as const;

/** Player count bounds per room. */
export const MIN_PLAYERS = 1 as const;
export const MAX_PLAYERS = 50 as const;
export const DEFAULT_PLAYER_LIMIT = 8 as const;

/** Username constraints. */
export const MIN_USERNAME_LENGTH = 2 as const;
export const MAX_USERNAME_LENGTH = 16 as const;

/** Max avatar string length — fits a small compressed data-URL or a remote URL. */
export const AVATAR_MAX_LEN = 20000 as const;
/** Pixel size uploaded avatars are cropped/scaled to (square). */
export const AVATAR_UPLOAD_SIZE = 96 as const;

/** Movement: cells traversed per second at speed multiplier 1. */
export const BASE_MOVE_CELLS_PER_SEC = 6 as const;

/** Speed multiplier bounds the host may configure. */
export const MIN_SPEED_MULTIPLIER = 0.5 as const;
export const MAX_SPEED_MULTIPLIER = 3 as const;
export const DEFAULT_SPEED_MULTIPLIER = 1 as const;

/** Respawn / match-duration defaults (seconds). */
export const DEFAULT_RESPAWN_SECONDS = 3 as const;
export const DEFAULT_MATCH_DURATION_SECONDS = 300 as const;
export const STARTING_COUNTDOWN_SECONDS = 3 as const;

/** Networking: how long a disconnected player may reconnect before being culled. */
export const RECONNECT_GRACE_MS = 15_000 as const;

/**
 * Curated, colour-blind-friendly palette for player colours. Original values,
 * not derived from any existing game.
 */
export const PLAYER_COLORS = [
  '#ef476f', // rose
  '#ffd166', // amber
  '#06d6a0', // mint
  '#118ab2', // teal
  '#8338ec', // violet
  '#fb5607', // orange
  '#3a86ff', // azure
  '#ff70a6', // pink
  '#2ec4b6', // aqua
  '#e07a5f', // clay
  '#9bf6ff', // sky
  '#c1fba4', // lime
] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

/** Socket.IO namespace/rooms helper prefixes. */
export const SOCKET_ROOM_PREFIX = 'room:' as const;

/** XP required per battle-pass level. */
export const XP_PER_LEVEL = 1000 as const;

/** Metric a daily mission tracks against a match's outcome. */
export type MissionMetric = 'games' | 'kills' | 'wins' | 'bestTerritory';

export interface MissionDef {
  id: string;
  label: string;
  metric: MissionMetric;
  target: number;
  /** Bonus XP awarded on completion. */
  xp: number;
}

/** The daily mission set (resets each calendar day, UTC). */
export const DAILY_MISSIONS: readonly MissionDef[] = [
  { id: 'play3', label: 'Play 3 matches', metric: 'games', target: 3, xp: 150 },
  { id: 'kills5', label: 'Eliminate 5 rivals', metric: 'kills', target: 5, xp: 200 },
  { id: 'terr40', label: 'Hold 40% territory in a match', metric: 'bestTerritory', target: 40, xp: 200 },
  { id: 'win1', label: 'Win a match', metric: 'wins', target: 1, xp: 300 },
] as const;

/** How an achievement is unlocked — evaluated against cumulative + per-match stats. */
export type AchievementMetric =
  | 'wins' // total wins
  | 'gamesPlayed' // total matches
  | 'totalKills' // lifetime kills
  | 'matchKills' // kills in a single match
  | 'matchTerritory'; // best territory % in a single match

export interface AchievementDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  metric: AchievementMetric;
  threshold: number;
}

/** Permanent, one-time achievements shown on the profile. */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first_win', label: 'First Blood', description: 'Win your first match', icon: '🥇', metric: 'wins', threshold: 1 },
  { id: 'veteran', label: 'Veteran', description: 'Play 10 matches', icon: '🎖️', metric: 'gamesPlayed', threshold: 10 },
  { id: 'slayer', label: 'Slayer', description: 'Eliminate 25 rivals total', icon: '⚔️', metric: 'totalKills', threshold: 25 },
  { id: 'triple', label: 'Triple Threat', description: 'Get 3 kills in one match', icon: '🔪', metric: 'matchKills', threshold: 3 },
  { id: 'rampage', label: 'Rampage', description: 'Get 6 kills in one match', icon: '💀', metric: 'matchKills', threshold: 6 },
  { id: 'dominator', label: 'Dominator', description: 'Hold 50% of the board', icon: '🌐', metric: 'matchTerritory', threshold: 50 },
  { id: 'landlord', label: 'Landlord', description: 'Hold 75% of the board', icon: '🏰', metric: 'matchTerritory', threshold: 75 },
] as const;

/** Max trail length before a player is force-killed (anti-grief / safety valve). */
export const MAX_TRAIL_LENGTH = 4000 as const;

/** Power-up tuning. */
export const POWERUP_MAX_DROPS = 6 as const;
/** Ticks between drop-spawn attempts (at 20 TPS, ~ every 4s). */
export const POWERUP_SPAWN_INTERVAL_TICKS = 80 as const;
export const POWERUP_DURATIONS_MS = {
  SHIELD: 6000,
  SPEED_BOOST: 5000,
  FREEZE: 2500,
  SHRINK_TERRITORY: 0, // instant effect
  GHOST: 5000,
  MAGNET: 6000,
} as const;
export const SPEED_BOOST_MULTIPLIER = 1.8 as const;
/** Fraction of each rival's territory removed by a Shrink pickup. */
export const SHRINK_FRACTION = 0.15 as const;
/** Chebyshev radius (cells) within which a Magnet pulls in drops. */
export const MAGNET_RADIUS = 4 as const;

/** Combo scoring: chained captures within this window escalate a bonus. */
export const COMBO_WINDOW_MS = 3500 as const;
/** Bonus points per gained cell, scaled by (combo - 1). */
export const COMBO_BONUS_PER_CELL = 0.5 as const;
