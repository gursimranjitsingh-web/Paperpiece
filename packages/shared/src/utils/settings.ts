import {
  DEFAULT_MATCH_DURATION_SECONDS,
  DEFAULT_PLAYER_LIMIT,
  DEFAULT_RESPAWN_SECONDS,
  DEFAULT_SPEED_MULTIPLIER,
  MAP_SIZES,
  MAX_PLAYERS,
  MAX_SPEED_MULTIPLIER,
  MIN_PLAYERS,
  MIN_SPEED_MULTIPLIER,
  SPAWN_TERRITORY_SIZES,
  type MapSize,
  type SpawnTerritorySize,
} from '../constants';
import { GameMode, MapTheme } from '../enums';
import type { RoomSettings } from '../types/room';
import { clamp } from './misc';

/** The canonical default room settings. */
export function defaultRoomSettings(): RoomSettings {
  return {
    mapSize: 200,
    playerLimit: DEFAULT_PLAYER_LIMIT,
    spawnTerritorySize: 5,
    respawnSeconds: DEFAULT_RESPAWN_SECONDS,
    matchDurationSeconds: DEFAULT_MATCH_DURATION_SECONDS,
    speedMultiplier: DEFAULT_SPEED_MULTIPLIER,
    fogEnabled: false,
    friendlyFire: true,
    fillWithBots: false,
    mode: GameMode.FreeForAll,
    isPublic: false,
    theme: MapTheme.Neon,
    mouseControl: false,
  };
}

/**
 * Merge a partial (client-supplied) settings patch onto a base, clamping every
 * numeric field and rejecting invalid enum values. The server is the sole
 * authority — never trust the raw client patch.
 */
export function sanitizeSettings(
  base: RoomSettings,
  patch: Partial<RoomSettings> | undefined,
): RoomSettings {
  if (!patch) return { ...base };

  const mapSize: MapSize = MAP_SIZES.includes(patch.mapSize as MapSize)
    ? (patch.mapSize as MapSize)
    : base.mapSize;

  const spawnTerritorySize: SpawnTerritorySize = SPAWN_TERRITORY_SIZES.includes(
    patch.spawnTerritorySize as SpawnTerritorySize,
  )
    ? (patch.spawnTerritorySize as SpawnTerritorySize)
    : base.spawnTerritorySize;

  const mode = patch.mode === GameMode.Ranked ? GameMode.Ranked : base.mode;
  const theme = Object.values(MapTheme).includes(patch.theme as MapTheme)
    ? (patch.theme as MapTheme)
    : base.theme;

  return {
    mapSize,
    spawnTerritorySize,
    mode,
    theme,
    mouseControl: patch.mouseControl ?? base.mouseControl,
    playerLimit: Math.round(
      clamp(patch.playerLimit ?? base.playerLimit, MIN_PLAYERS, MAX_PLAYERS),
    ),
    respawnSeconds: Math.round(clamp(patch.respawnSeconds ?? base.respawnSeconds, 0, 30)),
    matchDurationSeconds: Math.round(
      clamp(patch.matchDurationSeconds ?? base.matchDurationSeconds, 0, 3600),
    ),
    speedMultiplier: clamp(
      patch.speedMultiplier ?? base.speedMultiplier,
      MIN_SPEED_MULTIPLIER,
      MAX_SPEED_MULTIPLIER,
    ),
    fogEnabled: patch.fogEnabled ?? base.fogEnabled,
    friendlyFire: patch.friendlyFire ?? base.friendlyFire,
    fillWithBots: patch.fillWithBots ?? base.fillWithBots,
    isPublic: patch.isPublic ?? base.isPublic,
  };
}
