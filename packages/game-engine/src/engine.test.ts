import { describe, expect, it } from 'vitest';
import { Grid } from './Grid';
import { captureTerritory } from './FloodFill';
import { computeSpawnPoints, spawnRect } from './Spawn';
import { computeLeaderboard, detectLastStanding, type ScorablePlayer } from './Score';

describe('Grid', () => {
  it('tracks ownership, territory size, and deltas', () => {
    const g = new Grid(10, 10);
    expect(g.getOwner(1, 1)).toBeNull();

    g.setOwner(1, 1, 'p1');
    g.setOwner(2, 1, 'p1');
    expect(g.getOwner(1, 1)).toBe('p1');
    expect(g.territorySizeOf('p1')).toBe(2);

    const deltas = g.drainDeltas();
    expect(deltas).toHaveLength(2);
    // draining resets the dirty set
    expect(g.drainDeltas()).toHaveLength(0);
  });

  it('clears a player on death', () => {
    const g = new Grid(10, 10);
    g.fillRect({ minX: 0, minY: 0, maxX: 2, maxY: 2 }, 'p1');
    expect(g.territorySizeOf('p1')).toBe(9);
    g.clearPlayer('p1');
    expect(g.territorySizeOf('p1')).toBe(0);
    expect(g.getOwner(0, 0)).toBeNull();
  });
});

describe('captureTerritory (flood fill)', () => {
  it('fills the region enclosed by a trail returning to territory', () => {
    const g = new Grid(12, 12);
    // A 12-cell-wide home base on the left edge.
    g.fillRect({ minX: 0, minY: 0, maxX: 1, maxY: 11 }, 'p1');
    const homeSize = g.territorySizeOf('p1');

    // A trail that loops out to the right and back, enclosing a 3x-ish pocket.
    const trail = [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 3, y: 4 },
      { x: 2, y: 4 },
    ];
    const { cellsGained } = captureTerritory(g, 'p1', trail);

    // Trail becomes owned, and the enclosed interior cell (3,3) is captured.
    expect(cellsGained).toBeGreaterThanOrEqual(trail.length);
    expect(g.getOwner(3, 3)).toBe('p1');
    expect(g.territorySizeOf('p1')).toBe(homeSize + cellsGained);
  });

  it('captures enemy cells trapped inside the loop', () => {
    const g = new Grid(12, 12);
    g.fillRect({ minX: 0, minY: 0, maxX: 1, maxY: 11 }, 'p1');
    g.setOwner(3, 3, 'enemy'); // enemy cell that will be enclosed

    const trail = [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 3, y: 4 },
      { x: 2, y: 4 },
    ];
    captureTerritory(g, 'p1', trail);
    expect(g.getOwner(3, 3)).toBe('p1');
  });
});

describe('computeSpawnPoints', () => {
  it('produces non-overlapping in-bounds spawns', () => {
    const size = 200;
    const territory = 8;
    const points = computeSpawnPoints(size, 8, territory);
    expect(points).toHaveLength(8);

    for (const p of points) {
      const rect = spawnRect(p, territory);
      expect(rect.minX).toBeGreaterThanOrEqual(0);
      expect(rect.minY).toBeGreaterThanOrEqual(0);
      expect(rect.maxX).toBeLessThan(size);
      expect(rect.maxY).toBeLessThan(size);
    }

    // No two spawn squares overlap.
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = spawnRect(points[i]!, territory);
        const b = spawnRect(points[j]!, territory);
        const overlap =
          a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
        expect(overlap).toBe(false);
      }
    }
  });
});

describe('scoring', () => {
  const players: ScorablePlayer[] = [
    { id: 'a', username: 'A', color: '#fff', kills: 1, deaths: 0, alive: true },
    { id: 'b', username: 'B', color: '#000', kills: 0, deaths: 1, alive: false },
  ];

  it('ranks by territory then kills', () => {
    const g = new Grid(20, 20);
    g.fillRect({ minX: 0, minY: 0, maxX: 4, maxY: 4 }, 'a'); // 25 cells
    g.fillRect({ minX: 10, minY: 10, maxX: 12, maxY: 12 }, 'b'); // 9 cells

    const lb = computeLeaderboard(players, g);
    expect(lb[0]!.playerId).toBe('a');
    expect(lb[0]!.rank).toBe(1);
    expect(lb[1]!.playerId).toBe('b');
  });

  it('detects a last-standing winner', () => {
    expect(detectLastStanding(players)).toBe('a');
    expect(detectLastStanding([players[0]!])).toBeNull(); // single player never "wins" by elimination
  });
});
