import type { GameMode, MapTheme, PlayerPattern, PlayerShape, RoomStatus } from '../enums';
import type { MapSize, SpawnTerritorySize } from '../constants';

/** Host-configurable match settings. */
export interface RoomSettings {
  mapSize: MapSize;
  playerLimit: number;
  spawnTerritorySize: SpawnTerritorySize;
  /** Seconds before a dead player respawns; 0 disables respawn (spectate). */
  respawnSeconds: number;
  /** Total match length in seconds; 0 means "until last standing". */
  matchDurationSeconds: number;
  /** Base speed multiplier applied to all players. */
  speedMultiplier: number;
  /** Fog of war around each player's view. */
  fogEnabled: boolean;
  /** Whether players can kill each other (vs. territory-only competition). */
  friendlyFire: boolean;
  /** Fill remaining slots with bots on game start. */
  fillWithBots: boolean;
  mode: GameMode;
  /** Public rooms appear in matchmaking; private rooms are code-only. */
  isPublic: boolean;
  /** Visual board theme. */
  theme: MapTheme;
  /** When true, players steer by moving the mouse instead of WASD/arrows. */
  mouseControl: boolean;
}

/** Per-player cosmetic identity, chosen client-side and echoed to the room. */
export interface PlayerCosmetics {
  avatar: string;
  shape: PlayerShape;
  pattern: PlayerPattern;
}

/** A member of a room as seen in the lobby. */
export interface RoomMember {
  id: string;
  username: string;
  color: string;
  avatar: string;
  shape: PlayerShape;
  pattern: PlayerPattern;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  /** True while connected; used to show reconnecting state. */
  connected: boolean;
}

/** Lobby-facing room representation broadcast to all members. */
export interface RoomView {
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  members: RoomMember[];
  createdAt: number;
}
