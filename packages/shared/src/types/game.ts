import type { DeathCause, PowerUpType, RoomStatus } from '../enums';
import type { GridPoint } from './geometry';
import type { PlayerSnapshot } from './player';

/**
 * A single cell change in the territory/trail grid. Only changed cells are
 * broadcast (delta updates). `ownerId`/`trailOwnerId` are null when cleared.
 */
export interface CellDelta {
  /** Flattened index into the grid: y * width + x. */
  index: number;
  ownerId: string | null;
  trailOwnerId: string | null;
}

/** Power-up lying on the map waiting to be collected. */
export interface PowerUpDrop {
  id: string;
  type: PowerUpType;
  cell: GridPoint;
}

/** One leaderboard row. */
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  color: string;
  /** Percentage of the whole map owned (0-100). */
  territoryPercent: number;
  territorySize: number;
  kills: number;
  deaths: number;
  alive: boolean;
}

/**
 * Full authoritative snapshot of a match. Sent on join/reconnect. During play
 * the server sends `GameStateDelta` instead to save bandwidth.
 */
export interface GameStateSnapshot {
  roomCode: string;
  status: RoomStatus;
  tick: number;
  width: number;
  height: number;
  /** Server time (ms epoch) this snapshot was produced. */
  serverTime: number;
  players: PlayerSnapshot[];
  /** Full grid ownership: one player id (or null) per cell, row-major. */
  grid: (string | null)[];
  trailGrid: (string | null)[];
  powerUps: PowerUpDrop[];
  leaderboard: LeaderboardEntry[];
  /** Remaining match time in seconds (null when untimed). */
  timeRemaining: number | null;
}

/** Incremental per-tick update. */
export interface GameStateDelta {
  tick: number;
  serverTime: number;
  players: PlayerSnapshot[];
  cellDeltas: CellDelta[];
  /** Included only when it changed this tick. */
  leaderboard?: LeaderboardEntry[];
  powerUps?: PowerUpDrop[];
  timeRemaining?: number | null;
}

/** Emitted when a player dies. */
export interface PlayerDiedEvent {
  victimId: string;
  killerId: string | null;
  cause: DeathCause;
  tick: number;
}

/** Emitted when a player captures territory. */
export interface TerritoryCapturedEvent {
  playerId: string;
  cellsGained: number;
  newTerritorySize: number;
  tick: number;
}

/** Final match results. */
export interface MatchResult {
  roomCode: string;
  winnerId: string | null;
  durationSeconds: number;
  leaderboard: LeaderboardEntry[];
  endedAt: number;
}
