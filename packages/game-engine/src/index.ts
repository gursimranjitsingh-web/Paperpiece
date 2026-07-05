/**
 * @paperpiece/game-engine — framework-agnostic, pure-TypeScript game logic.
 * No React, no Socket.IO, no DB. The server composes these primitives; unit
 * tests exercise them in isolation.
 *
 * Core primitives: Grid, Flood-Fill capture, Spawn placement, Scoring, and the
 * authoritative MatchSimulation (movement, trails, collision, capture,
 * death/respawn, leaderboard, end conditions).
 */
export { Grid } from './Grid';
export { captureTerritory, type CaptureResult } from './FloodFill';
export { computeSpawnPoints, spawnRect } from './Spawn';
export {
  computeScore,
  computeLeaderboard,
  detectLastStanding,
  leaderboardWinner,
  type ScorablePlayer,
} from './Score';
export {
  MatchSimulation,
  type SeedPlayer,
  type TickOutput,
} from './MatchSimulation';
export { chooseBotDirection } from './Bot';
