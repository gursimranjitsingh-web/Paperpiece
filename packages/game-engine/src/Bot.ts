import { Direction, directionToDelta, oppositeDirection } from '@paperpiece/shared';
import { type MatchSimulation } from './MatchSimulation';

const DIRS = [Direction.Up, Direction.Down, Direction.Left, Direction.Right] as const;

/**
 * Minimal, self-preserving bot AI. It keeps roaming, avoids driving into the
 * world border or its own trail, and heads home when its trail gets long
 * (so it banks territory instead of dying). Deliberately simple — enough to
 * fill empty slots and make matches feel alive.
 */
export function chooseBotDirection(sim: MatchSimulation, id: string): Direction {
  const v = sim.view(id);
  if (!v || !v.alive) return Direction.None;

  const back = oppositeDirection(v.direction);
  const safe = (dir: Direction): boolean => {
    const d = directionToDelta(dir);
    const nx = v.cell.x + d.x;
    const ny = v.cell.y + d.y;
    if (nx < 0 || ny < 0 || nx >= sim.width || ny >= sim.height) return false;
    if (sim.grid.getTrailOwner(nx, ny) === id) return false; // would hit own trail
    return true;
  };

  const options = DIRS.filter((d) => d !== back && safe(d));
  if (options.length === 0) return v.direction; // trapped — keep going

  // Long trail → try to turn toward owned territory to bank the capture.
  if (v.trailLength > 12) {
    const home = homeward(sim, id, v.cell, options);
    if (home) return home;
  }

  // Otherwise mostly keep heading; occasionally turn to explore.
  const keepStraight = v.direction !== Direction.None && safe(v.direction) && Math.random() > 0.15;
  if (keepStraight) return v.direction;
  return options[Math.floor(Math.random() * options.length)]!;
}

/** Pick the safe option whose next cell is nearest to any owned cell. */
function homeward(
  sim: MatchSimulation,
  id: string,
  cell: { x: number; y: number },
  options: readonly Direction[],
): Direction | null {
  let best: Direction | null = null;
  let bestDist = Infinity;
  for (const dir of options) {
    const d = directionToDelta(dir);
    const nx = cell.x + d.x;
    const ny = cell.y + d.y;
    const dist = nearestOwnedDistance(sim, id, nx, ny);
    if (dist < bestDist) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

/** Cheap bounded search for the closest owned cell (Chebyshev rings). */
function nearestOwnedDistance(sim: MatchSimulation, id: string, x: number, y: number): number {
  const max = 24;
  for (let r = 0; r <= max; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cx = x + dx;
        const cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= sim.width || cy >= sim.height) continue;
        if (sim.grid.getOwner(cx, cy) === id) return r;
      }
    }
  }
  return max + 1;
}
