import { describe, expect, it } from 'vitest';
import {
  BASE_MOVE_CELLS_PER_SEC,
  DeathCause,
  Direction,
  PowerUpType,
  SERVER_TICK_RATE,
  defaultRoomSettings,
  directionToAngle,
  type MapSize,
  type RoomSettings,
} from '@paperpiece/shared';
import { MatchSimulation, type SeedPlayer } from './MatchSimulation';
import { computeScore } from './Score';

/** The proven capture loop from the movement test: encloses a pocket and
 *  returns to territory, yielding exactly one capture. */
const CAPTURE_LOOP: Direction[] = [
  Direction.Up,
  Direction.Up,
  Direction.Up,
  Direction.Up,
  Direction.Up,
  Direction.Right,
  Direction.Right,
  Direction.Down,
  Direction.Down,
  Direction.Down,
];

/** Speed that yields exactly one cell per tick — makes stepping deterministic. */
const ONE_CELL_PER_TICK = SERVER_TICK_RATE / BASE_MOVE_CELLS_PER_SEC;

function settings(overrides: Partial<RoomSettings> = {}): RoomSettings {
  return {
    ...defaultRoomSettings(),
    mapSize: 30 as MapSize,
    spawnTerritorySize: 5,
    speedMultiplier: ONE_CELL_PER_TICK,
    respawnSeconds: 0,
    matchDurationSeconds: 0,
    ...overrides,
  };
}

const solo = (): SeedPlayer[] => [{ id: 'p1', username: 'Solo', color: '#06d6a0', isBot: false }];

/** Drive one cell in a direction (one tick at ONE_CELL_PER_TICK speed). Cardinal
 *  headings at 1 cell/tick reproduce exact grid steps, keeping tests deterministic. */
function step(sim: MatchSimulation, dir: Direction, t: { now: number }) {
  sim.setInput('p1', directionToAngle(dir));
  t.now += 1000 / SERVER_TICK_RATE;
  return sim.tick(t.now);
}

function playerOf(sim: MatchSimulation, id: string) {
  return sim.snapshot(0).players.find((p) => p.id === id)!;
}

describe('MatchSimulation — movement & trails', () => {
  it('lays a trail outside territory and captures an enclosed region on return', () => {
    const sim = new MatchSimulation('ROOM01', settings(), solo(), 0);
    const t = { now: 0 };
    const before = playerOf(sim, 'p1').territorySize; // 25 (5×5)
    expect(before).toBe(25);

    // Spawn is centred at (15,15); territory spans [13..17]². Trace a loop up,
    // across, and back down into territory to enclose a pocket.
    let captured = 0;
    const path: Direction[] = [
      Direction.Up, // 15,14 (own)
      Direction.Up, // 15,13 (own top edge)
      Direction.Up, // 15,12 (trail)
      Direction.Up, // 15,11 (trail)
      Direction.Up, // 15,10 (trail)
      Direction.Right, // 16,10 (trail)
      Direction.Right, // 17,10 (trail)
      Direction.Down, // 17,11 (trail)
      Direction.Down, // 17,12 (trail)
      Direction.Down, // 17,13 (own) → close loop
    ];
    for (const d of path) {
      const out = step(sim, d, t);
      captured += out.captures.reduce((s, c) => s + c.cellsGained, 0);
    }

    const after = playerOf(sim, 'p1');
    expect(after.alive).toBe(true);
    expect(after.territorySize).toBeGreaterThan(before);
    expect(captured).toBeGreaterThan(0);
    // An interior cell of the loop is now owned.
    expect(sim.grid.getOwner(16, 11)).toBe('p1');
  });

  it('kills a player who runs into their own trail', () => {
    const sim = new MatchSimulation('ROOM02', settings(), solo(), 0);
    const t = { now: 0 };
    // Up out of territory, right, down, then left onto our own trail cell.
    step(sim, Direction.Up, t); // 15,14
    step(sim, Direction.Up, t); // 15,13
    step(sim, Direction.Up, t); // 15,12 trail
    step(sim, Direction.Up, t); // 15,11 trail
    step(sim, Direction.Right, t); // 16,11 trail
    step(sim, Direction.Down, t); // 16,12 trail
    const out = step(sim, Direction.Left, t); // 15,12 == own trail → death

    expect(playerOf(sim, 'p1').alive).toBe(false);
    expect(out.deaths.some((d) => d.cause === DeathCause.SelfTrail)).toBe(true);
  });

  it('kills a player who crosses the world boundary', () => {
    const sim = new MatchSimulation('ROOM03', settings(), solo(), 0);
    const t = { now: 0 };
    let died = false;
    for (let i = 0; i < 40 && !died; i += 1) {
      const out = step(sim, Direction.Right, t);
      if (out.deaths.some((d) => d.cause === DeathCause.Boundary)) died = true;
    }
    expect(died).toBe(true);
    expect(playerOf(sim, 'p1').alive).toBe(false);
  });
});

describe('MatchSimulation — death, respawn & scoring', () => {
  it('respawns a dead player with fresh territory after the delay', () => {
    const sim = new MatchSimulation('ROOM04', settings({ respawnSeconds: 1 }), solo(), 0);
    const t = { now: 0 };
    // Drive off the edge to die.
    for (let i = 0; i < 40; i += 1) {
      const out = step(sim, Direction.Right, t);
      if (out.deaths.length) break;
    }
    expect(playerOf(sim, 'p1').alive).toBe(false);

    // Advance past the respawn delay and tick once.
    t.now += 1500;
    sim.tick(t.now);
    const p = playerOf(sim, 'p1');
    expect(p.alive).toBe(true);
    expect(p.territorySize).toBe(25);
  });

  it('a player leaves a trail on the grid while roaming outside territory', () => {
    const sim = new MatchSimulation('ROOM05', settings({ respawnSeconds: 0 }), solo(), 0);
    const t = { now: 0 };
    for (let i = 0; i < 6; i += 1) step(sim, Direction.Down, t);

    // At least one cell now belongs to p1's trail layer.
    let trailCells = 0;
    for (let y = 0; y < 30; y += 1) {
      for (let x = 0; x < 30; x += 1) {
        if (sim.grid.getTrailOwner(x, y) === 'p1') trailCells += 1;
      }
    }
    expect(trailCells).toBeGreaterThan(0);
    expect(playerOf(sim, 'p1').alive).toBe(true);
    // (Enemy-trail cutting + kill credit is verified in the server integration test.)
  });
});

describe('MatchSimulation — combo scoring', () => {
  it('starts a combo on the first capture', () => {
    const sim = new MatchSimulation('COMBO1', settings(), solo(), 0);
    const t = { now: 0 };
    for (const d of CAPTURE_LOOP) step(sim, d, t);
    expect(playerOf(sim, 'p1').combo).toBe(1);
  });

  it('escalates the bonus on a chained capture within the window', () => {
    const sim = new MatchSimulation('COMBO2', settings(), solo(), 0);
    const t = { now: 0 };
    // Pretend the player is already mid-combo so the next capture chains.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = (sim as any).players.get('p1');
    p.combo = 1;
    p.comboExpiresAt = Number.MAX_SAFE_INTEGER;

    for (const d of CAPTURE_LOOP) step(sim, d, t);

    const snap = playerOf(sim, 'p1');
    expect(snap.combo).toBe(2);
    expect(p.bonusScore).toBeGreaterThan(0);
    // Score exceeds the plain territory+kills formula thanks to the bonus.
    expect(snap.score).toBeGreaterThan(computeScore(snap.territorySize, snap.kills));
  });

  it('lapses the combo after the window elapses', () => {
    const sim = new MatchSimulation('COMBO3', settings(), solo(), 0);
    const t = { now: 0 };
    for (const d of CAPTURE_LOOP) step(sim, d, t);
    expect(playerOf(sim, 'p1').combo).toBe(1);

    // Idle well past the combo window, then tick once.
    t.now += 5000;
    sim.tick(t.now);
    expect(playerOf(sim, 'p1').combo).toBe(0);
  });
});

describe('MatchSimulation — teams', () => {
  const twoTeamPlayers = (): SeedPlayer[] => [
    { id: 'a1', username: 'A1', color: '#3a86ff', isBot: false, team: 0 },
    { id: 'a2', username: 'A2', color: '#3a86ff', isBot: false, team: 0 },
  ];

  it('does not let a teammate cut a teammate down (friendly immunity)', () => {
    const sim = new MatchSimulation('TEAM1', settings({ friendlyFire: true, teamCount: 2 }), twoTeamPlayers(), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inner: any = sim as any;
    const a1 = inner.players.get('a1');
    const a2 = inner.players.get('a2');
    // Lay a trail cell for a2, then drive a1 through it.
    a2.trail = [{ x: 10, y: 10 }];
    sim.grid.setTrailOwner(10, 10, 'a2');
    a1.alive = true;
    a1.cell = { x: 9, y: 10 };
    a1.position = { x: 9, y: 10 };
    inner.enterCell(a1, [], []);
    a1.cell = { x: 10, y: 10 };
    const deaths: unknown[] = [];
    inner.enterCell(a1, deaths, []);
    // a2 (teammate) survives a1 crossing its trail.
    expect(a2.alive).toBe(true);
    expect(deaths.length).toBe(0);
  });

  it('ends the match when only one team remains alive', () => {
    const seeds: SeedPlayer[] = [
      { id: 'a', username: 'A', color: '#3a86ff', isBot: false, team: 0 },
      { id: 'b', username: 'B', color: '#ef476f', isBot: false, team: 1 },
    ];
    const sim = new MatchSimulation('TEAM2', settings({ teamCount: 2, respawnSeconds: 0 }), seeds, 0);
    const t = { now: 0 };
    // Kill team 1's only member by walking it off the edge.
    for (let i = 0; i < 40; i += 1) {
      sim.setInput('b', directionToAngle(Direction.Left));
      t.now += 1000 / SERVER_TICK_RATE;
      const out = sim.tick(t.now);
      if (out.result) {
        expect(sim.snapshot(0).players.find((p) => p.id === 'a')!.alive).toBe(true);
        return;
      }
    }
    throw new Error('match did not end when one team was eliminated');
  });
});

describe('MatchSimulation — Ghost power-up', () => {
  it('lets a phased player cross their own trail without dying', () => {
    const sim = new MatchSimulation('GHOST1', settings(), solo(), 0);
    const t = { now: 0 };
    // Grant Ghost for the duration of the run.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = (sim as any).players.get('p1');
    p.activePowerUps[PowerUpType.Ghost] = Number.MAX_SAFE_INTEGER;

    // Same self-crossing path that kills a normal player.
    step(sim, Direction.Up, t); // 15,14
    step(sim, Direction.Up, t); // 15,13
    step(sim, Direction.Up, t); // 15,12 trail
    step(sim, Direction.Up, t); // 15,11 trail
    step(sim, Direction.Right, t); // 16,11 trail
    step(sim, Direction.Down, t); // 16,12 trail
    step(sim, Direction.Left, t); // 15,12 == own trail → would kill, but phased

    expect(playerOf(sim, 'p1').alive).toBe(true);
  });
});
