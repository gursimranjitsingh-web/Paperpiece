import {
  BASE_MOVE_CELLS_PER_SEC,
  DeathCause,
  Direction,
  MAX_TRAIL_LENGTH,
  POWERUP_DURATIONS_MS,
  POWERUP_MAX_DROPS,
  POWERUP_SPAWN_INTERVAL_TICKS,
  PlayerPattern,
  PlayerShape,
  PlayerState,
  PowerUpType,
  RoomStatus,
  SERVER_TICK_RATE,
  SHRINK_FRACTION,
  SPEED_BOOST_MULTIPLIER,
  angleDelta,
  angleToDirection,
  type GameStateDelta,
  type GameStateSnapshot,
  type GridPoint,
  type LeaderboardEntry,
  type MatchResult,
  type Player,
  type PlayerDiedEvent,
  type PowerUpDrop,
  type PlayerSnapshot,
  type RoomSettings,
  type TerritoryCapturedEvent,
} from '@paperpiece/shared';
import { Grid } from './Grid';
import { captureTerritory } from './FloodFill';
import { computeSpawnPoints, spawnRect } from './Spawn';
import { computeLeaderboard, computeScore, type ScorablePlayer } from './Score';

/** Reject a steering input that would reverse the heading by more than this
 *  (radians) while a trail is out — prevents instant folding back onto the neck. */
const MAX_TURN = 2.7; // ~155°
/** The most recent trail cells that are immune to self-collision (the "neck"). */
const NECK_IMMUNITY = 3;

/** A player as the simulation is seeded (from the finished lobby roster). */
export interface SeedPlayer {
  id: string;
  username: string;
  color: string;
  isBot: boolean;
  shape?: PlayerShape;
  pattern?: PlayerPattern;
  avatar?: string;
}

/** Everything produced by a single authoritative tick, ready to broadcast. */
export interface TickOutput {
  delta: GameStateDelta;
  deaths: PlayerDiedEvent[];
  captures: TerritoryCapturedEvent[];
  /** Present on the tick the match ends. */
  result: MatchResult | null;
}

/**
 * The authoritative match simulation. Pure logic, no networking: the server
 * feeds it inputs and time, calls {@link tick}, and broadcasts the output.
 *
 * Movement model: each player accumulates fractional cell-progress per tick
 * (`cells/sec ÷ tickRate`). When progress crosses a whole cell the player steps
 * into the next cell and that cell is *resolved* (boundary, trail, collision,
 * capture). Direction changes are applied only at cell boundaries — this both
 * keeps movement grid-aligned and prevents an instant 180° reversal into the
 * player's own neck.
 */
export class MatchSimulation {
  readonly roomCode: string;
  readonly settings: RoomSettings;
  readonly grid: Grid;
  readonly width: number;
  readonly height: number;

  private readonly players = new Map<string, Player>();
  private tickCount = 0;
  private readonly startedAt: number;
  /** The clock for the current tick — single source of time for kills/respawns. */
  private now: number;
  private ended: MatchResult | null = null;
  private lastLeaderboard: LeaderboardEntry[] = [];

  /** Collectible power-up drops on the map, keyed by drop id. */
  private readonly powerUps = new Map<string, PowerUpDrop>();
  private powerUpDirty = false;
  private powerUpCounter = 0;
  private readonly powerUpTypes = Object.values(PowerUpType);

  constructor(roomCode: string, settings: RoomSettings, seeds: SeedPlayer[], now: number) {
    this.roomCode = roomCode;
    this.settings = settings;
    this.width = settings.mapSize;
    this.height = settings.mapSize;
    this.grid = new Grid(this.width, this.height);
    this.startedAt = now;
    this.now = now;

    const spawns = computeSpawnPoints(this.width, seeds.length, settings.spawnTerritorySize);
    seeds.forEach((seed, i) => {
      const cell = spawns[i] ?? { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };
      this.players.set(seed.id, this.makePlayer(seed, cell));
    });
  }

  // ---- public API --------------------------------------------------------

  get isOver(): boolean {
    return this.ended !== null;
  }

  hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  /** Live count of players still alive (for end/bot logic). */
  get aliveCount(): number {
    let n = 0;
    for (const p of this.players.values()) if (p.alive) n += 1;
    return n;
  }

  get playerCount(): number {
    return this.players.size;
  }

  /** Read-only view of a player used by bot AI and reconnection. */
  view(id: string): { cell: GridPoint; direction: Direction; alive: boolean; trailLength: number } | null {
    const p = this.players.get(id);
    if (!p) return null;
    return {
      cell: { x: p.cell.x, y: p.cell.y },
      direction: p.direction,
      alive: p.alive,
      trailLength: p.trail.length,
    };
  }

  /**
   * Steer toward a heading (radians). The player moves freely in any direction;
   * the only constraint (server-enforced, never trusted to the client) is that
   * you cannot near-instantly reverse (>{@link MAX_TURN}) while a trail is out,
   * which would fold you onto your own neck.
   */
  setInput(playerId: string, angle: number): void {
    const p = this.players.get(playerId);
    if (!p || !p.alive || !Number.isFinite(angle)) return;
    const moving = p.direction !== Direction.None;
    if (moving && p.trail.length > 0 && angleDelta(p.heading, angle) > MAX_TURN) return;
    p.heading = angle;
    p.direction = angleToDirection(angle); // marks "moving" + keeps a cardinal for compat
  }

  /** Remove a player mid-match (left / disconnected past grace). */
  removePlayer(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    this.grid.clearPlayer(playerId);
    this.players.delete(playerId);
  }

  /** Advance the simulation by one tick and return everything to broadcast. */
  tick(now: number): TickOutput {
    this.tickCount += 1;
    this.now = now;
    const deaths: PlayerDiedEvent[] = [];
    const captures: TerritoryCapturedEvent[] = [];

    // 0. Expire lapsed power-ups; occasionally spawn a new drop.
    this.updatePowerUps();

    // 1. Movement + per-cell resolution (deterministic order by id).
    for (const p of this.orderedPlayers()) {
      if (p.alive) this.advance(p, deaths, captures);
    }

    // 2. Head-on / same-cell resolution among survivors.
    this.resolveCollisions(deaths);

    // 3. Respawns.
    if (this.settings.respawnSeconds > 0) this.processRespawns(now);

    // 4. Scores + leaderboard.
    for (const p of this.players.values()) {
      p.territorySize = this.grid.territorySizeOf(p.id);
      p.score = computeScore(p.territorySize, p.kills);
    }
    this.lastLeaderboard = computeLeaderboard(this.scorable(), this.grid);

    // 5. End conditions.
    const result = this.checkEnd(now);

    // Optimization: the leaderboard changes slowly, so only ship it every 5th
    // tick (4 Hz) or when the match ends — the client keeps its last copy.
    const includeLeaderboard = result !== null || this.tickCount % 5 === 0;

    const delta: GameStateDelta = {
      tick: this.tickCount,
      serverTime: now,
      players: this.snapshots(),
      cellDeltas: this.grid.drainDeltas(),
      timeRemaining: this.timeRemaining(now),
    };
    if (includeLeaderboard) delta.leaderboard = this.lastLeaderboard;
    // Ship the drop list only when it changed (spawn/collect) to save bandwidth.
    if (this.powerUpDirty) {
      delta.powerUps = [...this.powerUps.values()];
      this.powerUpDirty = false;
    }
    return { delta, deaths, captures, result };
  }

  /** Full snapshot for a joining / reconnecting client. */
  snapshot(now: number): GameStateSnapshot {
    return {
      roomCode: this.roomCode,
      status: this.ended ? RoomStatus.Finished : RoomStatus.Playing,
      tick: this.tickCount,
      width: this.width,
      height: this.height,
      serverTime: now,
      players: this.snapshots(),
      grid: this.grid.ownerSnapshot(),
      trailGrid: this.grid.trailSnapshot(),
      powerUps: [...this.powerUps.values()],
      leaderboard: this.lastLeaderboard,
      timeRemaining: this.timeRemaining(now),
    };
  }

  // ---- movement ----------------------------------------------------------

  private advance(p: Player, deaths: PlayerDiedEvent[], captures: TerritoryCapturedEvent[]): void {
    if (p.direction === Direction.None) return; // not moving until first input
    if (this.hasPower(p, PowerUpType.Freeze)) return; // frozen by a rival's pickup
    const speedMul = this.hasPower(p, PowerUpType.SpeedBoost) ? SPEED_BOOST_MULTIPLIER : 1;
    const dist = (BASE_MOVE_CELLS_PER_SEC * p.speed * speedMul) / SERVER_TICK_RATE;
    const dx = Math.cos(p.heading) * dist;
    const dy = Math.sin(p.heading) * dist;
    const sx = p.position.x;
    const sy = p.position.y;
    const ex = sx + dx;
    const ey = sy + dy;

    // Walk the continuous segment, resolving each new grid cell entered so a
    // fast/diagonal move never leaves gaps in the trail.
    let curX = Math.floor(sx);
    let curY = Math.floor(sy);
    const samples = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 4));
    for (let i = 1; i <= samples; i += 1) {
      const t = i / samples;
      const cx = Math.floor(sx + dx * t);
      const cy = Math.floor(sy + dy * t);
      if (cx === curX && cy === curY) continue;
      curX = cx;
      curY = cy;
      p.cell = { x: cx, y: cy };
      if (this.enterCell(p, deaths, captures)) return; // died mid-walk
    }

    p.position = { x: ex, y: ey };
    p.cell = { x: Math.floor(ex), y: Math.floor(ey) };
  }

  /**
   * Resolve trail/collision/capture/boundary for the cell a player just entered.
   * Returns true if the player died. Recently-laid trail cells (the "neck") are
   * immune to self-collision so sharp curves don't instantly kill.
   */
  private enterCell(p: Player, deaths: PlayerDiedEvent[], captures: TerritoryCapturedEvent[]): boolean {
    const { x, y } = p.cell;

    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      this.kill(p, DeathCause.Boundary, null, deaths);
      return true;
    }

    // Pick up any drop sitting on this cell.
    if (this.powerUps.size > 0) this.collectPowerUp(p);

    const trailOwner = this.grid.getTrailOwner(x, y);

    // Cutting an enemy's trail kills that enemy (attacker gets the credit).
    if (trailOwner && trailOwner !== p.id && this.settings.friendlyFire) {
      const victim = this.players.get(trailOwner);
      if (victim && victim.alive) this.kill(victim, DeathCause.EnemyTrail, p.id, deaths);
    }

    // Crossing your own trail is fatal — unless it's part of the immune neck.
    if (trailOwner === p.id && !this.inNeck(p, x, y)) {
      this.kill(p, DeathCause.SelfTrail, null, deaths);
      return true;
    }

    const insideOwn = this.grid.getOwner(x, y) === p.id;
    if (insideOwn) {
      if (p.trail.length > 0) {
        const before = this.grid.territorySizeOf(p.id);
        captureTerritory(this.grid, p.id, p.trail);
        p.trail = [];
        const gained = this.grid.territorySizeOf(p.id) - before;
        if (gained > 0) {
          captures.push({
            playerId: p.id,
            cellsGained: gained,
            newTerritorySize: this.grid.territorySizeOf(p.id),
            tick: this.tickCount,
          });
        }
      }
    } else if (trailOwner !== p.id) {
      // Outside own territory → extend the trail.
      this.grid.setTrailOwner(x, y, p.id);
      p.trail.push({ x, y });
      if (p.trail.length > MAX_TRAIL_LENGTH) {
        this.kill(p, DeathCause.SelfTrail, null, deaths);
        return true;
      }
    }
    return false;
  }

  /** Whether a cell is among the player's most recent (immune) trail cells. */
  private inNeck(p: Player, x: number, y: number): boolean {
    for (let i = Math.max(0, p.trail.length - NECK_IMMUNITY); i < p.trail.length; i += 1) {
      const c = p.trail[i]!;
      if (c.x === x && c.y === y) return true;
    }
    return false;
  }

  // ---- power-ups ---------------------------------------------------------

  /** True if a power-up is currently active on a player. */
  private hasPower(p: Player, type: PowerUpType): boolean {
    const exp = p.activePowerUps[type];
    return exp !== undefined && exp > this.now;
  }

  /** Expire lapsed effects and occasionally spawn a new drop. */
  private updatePowerUps(): void {
    for (const p of this.players.values()) {
      for (const t of this.powerUpTypes) {
        const exp = p.activePowerUps[t];
        if (exp !== undefined && exp <= this.now) delete p.activePowerUps[t];
      }
    }
    if (this.tickCount % POWERUP_SPAWN_INTERVAL_TICKS === 0 && this.powerUps.size < POWERUP_MAX_DROPS) {
      const cell = this.randomEmptyCell();
      if (cell) {
        const type = this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)]!;
        const id = `pu_${(this.powerUpCounter += 1)}`;
        this.powerUps.set(id, { id, type, cell });
        this.powerUpDirty = true;
      }
    }
  }

  /** Collect any drop on the player's current cell and apply its effect. */
  private collectPowerUp(p: Player): void {
    for (const [id, drop] of this.powerUps) {
      if (drop.cell.x === p.cell.x && drop.cell.y === p.cell.y) {
        this.powerUps.delete(id);
        this.powerUpDirty = true;
        this.applyPowerUp(p, drop.type);
        return;
      }
    }
  }

  private applyPowerUp(collector: Player, type: PowerUpType): void {
    switch (type) {
      case PowerUpType.Shield:
        collector.activePowerUps[PowerUpType.Shield] = this.now + POWERUP_DURATIONS_MS.SHIELD;
        break;
      case PowerUpType.SpeedBoost:
        collector.activePowerUps[PowerUpType.SpeedBoost] = this.now + POWERUP_DURATIONS_MS.SPEED_BOOST;
        break;
      case PowerUpType.Freeze:
        // Freeze every rival for a moment.
        for (const other of this.players.values()) {
          if (other.id !== collector.id && other.alive) {
            other.activePowerUps[PowerUpType.Freeze] = this.now + POWERUP_DURATIONS_MS.FREEZE;
          }
        }
        break;
      case PowerUpType.ShrinkTerritory:
        // Carve a chunk out of every rival's territory.
        for (const other of this.players.values()) {
          if (other.id !== collector.id && other.alive) this.grid.shrinkPlayer(other.id, SHRINK_FRACTION);
        }
        break;
    }
  }

  private randomEmptyCell(): GridPoint | null {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.grid.getOwner(x, y) !== null || this.grid.getTrailOwner(x, y) !== null) continue;
      let occupied = false;
      for (const d of this.powerUps.values()) {
        if (d.cell.x === x && d.cell.y === y) {
          occupied = true;
          break;
        }
      }
      if (!occupied) return { x, y };
    }
    return null;
  }

  /** Same-cell player collisions after everyone has moved. */
  private resolveCollisions(deaths: PlayerDiedEvent[]): void {
    const byCell = new Map<number, Player[]>();
    for (const p of this.players.values()) {
      if (!p.alive) continue;
      const key = p.cell.y * this.width + p.cell.x;
      const list = byCell.get(key);
      if (list) list.push(p);
      else byCell.set(key, [p]);
    }
    for (const group of byCell.values()) {
      if (group.length < 2) continue;
      // A player standing in their own territory is safe; intruders die.
      for (const p of group) {
        const safe = this.grid.getOwner(p.cell.x, p.cell.y) === p.id;
        if (!safe) this.kill(p, DeathCause.HeadOn, null, deaths);
      }
    }
  }

  // ---- death & respawn ---------------------------------------------------

  private kill(
    victim: Player,
    cause: DeathCause,
    killerId: string | null,
    deaths: PlayerDiedEvent[],
  ): void {
    if (!victim.alive) return;
    // A shield absorbs everything except running off the map edge.
    if (cause !== DeathCause.Boundary && this.hasPower(victim, PowerUpType.Shield)) return;
    victim.alive = false;
    victim.deaths += 1;
    victim.direction = Direction.None;
    victim.pendingDirection = Direction.None;
    victim.moveProgress = 0;
    victim.trail = [];
    // Remove trail + territory (frees the board for others).
    this.grid.clearPlayer(victim.id);
    victim.territorySize = 0;

    if (killerId) {
      const killer = this.players.get(killerId);
      if (killer) killer.kills += 1;
    }

    if (this.settings.respawnSeconds > 0) {
      victim.state = PlayerState.Respawning;
      victim.disconnectedAt = null;
      victim.respawnAt = this.now + this.settings.respawnSeconds * 1000;
    } else {
      victim.state = PlayerState.Spectating;
      victim.respawnAt = null;
    }

    deaths.push({ victimId: victim.id, killerId, cause, tick: this.tickCount });
  }

  private processRespawns(now: number): void {
    for (const p of this.players.values()) {
      if (p.state !== PlayerState.Respawning || p.respawnAt === null) continue;
      if (now < p.respawnAt) continue;
      const cell = this.findRespawnCell();
      this.spawnAt(p, cell);
    }
  }

  private spawnAt(p: Player, cell: GridPoint): void {
    p.cell = { x: cell.x, y: cell.y };
    p.position = { x: cell.x, y: cell.y };
    p.direction = Direction.None;
    p.pendingDirection = Direction.None;
    p.heading = 0;
    p.moveProgress = 0;
    p.trail = [];
    p.alive = true;
    p.state = PlayerState.Alive;
    p.respawnAt = null;
    const rect = spawnRect(cell, this.settings.spawnTerritorySize);
    this.grid.fillRect(rect, p.id);
    p.territorySize = this.grid.territorySizeOf(p.id);
  }

  /** Find a location whose spawn square is entirely unowned; fall back to centre. */
  private findRespawnCell(): GridPoint {
    const size = this.settings.spawnTerritorySize;
    const half = Math.ceil(size / 2) + 1;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const x = half + Math.floor(Math.random() * (this.width - 2 * half));
      const y = half + Math.floor(Math.random() * (this.height - 2 * half));
      if (this.isAreaClear({ x, y }, size)) return { x, y };
    }
    return { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };
  }

  private isAreaClear(centre: GridPoint, size: number): boolean {
    const rect = spawnRect(centre, size);
    for (let y = rect.minY; y <= rect.maxY; y += 1) {
      for (let x = rect.minX; x <= rect.maxX; x += 1) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
        if (this.grid.getOwner(x, y) !== null || this.grid.getTrailOwner(x, y) !== null) return false;
      }
    }
    return true;
  }

  // ---- end conditions ----------------------------------------------------

  private checkEnd(now: number): MatchResult | null {
    if (this.ended) return null;

    const timeUp =
      this.settings.matchDurationSeconds > 0 &&
      now - this.startedAt >= this.settings.matchDurationSeconds * 1000;

    const alive = [...this.players.values()].filter((p) => p.alive);
    const lastStanding = this.players.size > 1 && alive.length <= 1;

    if (!timeUp && !lastStanding) return null;

    const winnerId = this.lastLeaderboard[0]?.playerId ?? alive[0]?.id ?? null;
    this.ended = {
      roomCode: this.roomCode,
      winnerId,
      durationSeconds: Math.round((now - this.startedAt) / 1000),
      leaderboard: this.lastLeaderboard,
      endedAt: now,
    };
    return this.ended;
  }

  private timeRemaining(now: number): number | null {
    if (this.settings.matchDurationSeconds <= 0) return null;
    const remaining = this.settings.matchDurationSeconds - (now - this.startedAt) / 1000;
    return Math.max(0, Math.round(remaining));
  }

  // ---- helpers -----------------------------------------------------------

  private makePlayer(seed: SeedPlayer, cell: GridPoint): Player {
    const p: Player = {
      id: seed.id,
      username: seed.username,
      socketId: '',
      color: seed.color,
      avatar: seed.avatar ?? '',
      shape: seed.shape ?? PlayerShape.Round,
      pattern: seed.pattern ?? PlayerPattern.Solid,
      isBot: seed.isBot,
      direction: Direction.None,
      pendingDirection: Direction.None,
      heading: 0,
      position: { x: cell.x, y: cell.y },
      cell: { x: cell.x, y: cell.y },
      speed: this.settings.speedMultiplier,
      state: PlayerState.Alive,
      alive: true,
      score: 0,
      kills: 0,
      deaths: 0,
      territorySize: 0,
      trail: [],
      activePowerUps: {},
      lastInputTick: 0,
      disconnectedAt: null,
      moveProgress: 0,
      respawnAt: null,
    };
    const rect = spawnRect(cell, this.settings.spawnTerritorySize);
    this.grid.fillRect(rect, p.id);
    p.territorySize = this.grid.territorySizeOf(p.id);
    return p;
  }

  private orderedPlayers(): Player[] {
    return [...this.players.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  }

  private snapshots(): PlayerSnapshot[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      username: p.username,
      color: p.color,
      shape: p.shape,
      pattern: p.pattern,
      isBot: p.isBot,
      direction: p.direction,
      heading: p.heading,
      position: p.position,
      state: p.state,
      alive: p.alive,
      score: p.score,
      kills: p.kills,
      deaths: p.deaths,
      territorySize: p.territorySize,
      trail: p.trail,
      activePowerUps: this.powerUpTypes.filter((t) => this.hasPower(p, t)),
    }));
  }

  private scorable(): ScorablePlayer[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      username: p.username,
      color: p.color,
      kills: p.kills,
      deaths: p.deaths,
      alive: p.alive,
    }));
  }
}
