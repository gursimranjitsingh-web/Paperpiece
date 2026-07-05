import type { Direction, PlayerPattern, PlayerShape, PlayerState, PowerUpType } from '../enums';
import type { GridPoint, Vec2 } from './geometry';

/**
 * Authoritative player entity as it lives in server memory during a match.
 * A trimmed, wire-safe view is sent to clients (see `PlayerSnapshot`).
 */
export interface Player {
  /** Stable player id (matches the User id when authenticated, else a guest id). */
  id: string;
  username: string;
  /** Current transport socket id; changes on reconnect. */
  socketId: string;
  color: string;
  avatar: string;
  shape: PlayerShape;
  pattern: PlayerPattern;
  /** Whether this player is a server-controlled bot. */
  isBot: boolean;

  direction: Direction;
  /** Buffered next direction, applied when it does not cause instant reversal. */
  pendingDirection: Direction;
  /** Continuous movement heading in radians (free 360° steering). */
  heading: number;

  /** Continuous position (for interpolation). Integer when aligned to a cell. */
  position: Vec2;
  /** The cell the player currently occupies (floored position). */
  cell: GridPoint;
  /** Movement speed multiplier (cells/sec = BASE * speed). */
  speed: number;

  state: PlayerState;
  alive: boolean;

  score: number;
  kills: number;
  deaths: number;
  /** Number of owned cells. */
  territorySize: number;

  /** Ordered list of trail cells laid since leaving territory. */
  trail: GridPoint[];

  /** Active power-ups keyed by type with an expiry timestamp (ms epoch). */
  activePowerUps: Partial<Record<PowerUpType, number>>;

  /** Server tick when the player last sent input — for anti-cheat rate checks. */
  lastInputTick: number;
  /** When set, the player is disconnected but within the reconnect grace window. */
  disconnectedAt: number | null;

  /** Fractional progress toward the next cell in [0,1) (movement accumulator). */
  moveProgress: number;
  /** Epoch ms at which a respawning player returns; null when not respawning. */
  respawnAt: number | null;
}

/** Lightweight, wire-safe projection of a player broadcast in game state. */
export interface PlayerSnapshot {
  id: string;
  username: string;
  color: string;
  shape: PlayerShape;
  pattern: PlayerPattern;
  isBot: boolean;
  direction: Direction;
  /** Continuous heading (radians) for orienting the avatar. */
  heading: number;
  position: Vec2;
  state: PlayerState;
  alive: boolean;
  score: number;
  kills: number;
  deaths: number;
  territorySize: number;
  trail: GridPoint[];
  activePowerUps: PowerUpType[];
}
