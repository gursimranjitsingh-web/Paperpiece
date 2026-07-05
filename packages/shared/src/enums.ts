/**
 * Enumerations shared across the client, server, and game engine.
 *
 * We use `const enum`-free plain string enums so the values survive JSON
 * serialization over the wire and remain debuggable in network inspectors.
 */

/** Cardinal movement directions on the grid. `None` means "not moving yet". */
export enum Direction {
  None = 'NONE',
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

/** Lifecycle of a room from creation to teardown. */
export enum RoomStatus {
  /** Players are joining / configuring in the lobby. */
  Lobby = 'LOBBY',
  /** Countdown before the first tick. */
  Starting = 'STARTING',
  /** Active match, server ticking. */
  Playing = 'PLAYING',
  /** Match ended, results available. */
  Finished = 'FINISHED',
}

/** Per-player runtime state within a match. */
export enum PlayerState {
  Alive = 'ALIVE',
  Dead = 'DEAD',
  Respawning = 'RESPAWNING',
  Spectating = 'SPECTATING',
}

/** Reason a player died — used for kill-feed and analytics. */
export enum DeathCause {
  /** Ran into another player's trail. */
  EnemyTrail = 'ENEMY_TRAIL',
  /** Ran into their own trail. */
  SelfTrail = 'SELF_TRAIL',
  /** Ran into the world boundary. */
  Boundary = 'BOUNDARY',
  /** Head-on collision with another player. */
  HeadOn = 'HEAD_ON',
  /** Disconnected mid-match. */
  Disconnected = 'DISCONNECTED',
}

/** Collectible power-ups. */
export enum PowerUpType {
  Shield = 'SHIELD',
  SpeedBoost = 'SPEED_BOOST',
  Freeze = 'FREEZE',
  ShrinkTerritory = 'SHRINK_TERRITORY',
}

/** How a match ends. */
export enum MatchEndReason {
  TimeLimit = 'TIME_LIMIT',
  LastStanding = 'LAST_STANDING',
  TerritoryGoal = 'TERRITORY_GOAL',
  HostEnded = 'HOST_ENDED',
  AllLeft = 'ALL_LEFT',
}

/** Game mode. */
export enum GameMode {
  FreeForAll = 'FFA',
  Ranked = 'RANKED',
}

/** Visual board themes the host can pick. Client maps these to palettes. */
export enum MapTheme {
  Neon = 'NEON',
  Midnight = 'MIDNIGHT',
  Sunset = 'SUNSET',
  Forest = 'FOREST',
  Mono = 'MONO',
}

/** Avatar body shape rendered on the board. */
export enum PlayerShape {
  Round = 'ROUND',
  Square = 'SQUARE',
}

/** Fill pattern painted across a player's captured territory. */
export enum PlayerPattern {
  Solid = 'SOLID',
  Stripes = 'STRIPES',
  Dots = 'DOTS',
  Checker = 'CHECKER',
  Grid = 'GRID',
}

/** How a player steers. */
export enum ControlScheme {
  Keyboard = 'KEYBOARD',
  Mouse = 'MOUSE',
}
