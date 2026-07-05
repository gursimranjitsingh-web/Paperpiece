import { type GridPoint } from '@paperpiece/shared';
import { type Grid } from './Grid';

export interface CaptureResult {
  /** Total number of cells newly owned (trail conversion + enclosed interior). */
  cellsGained: number;
}

/**
 * Close a player's loop and capture the enclosed region.
 *
 * The classic territory-capture rule: when a player re-enters their own
 * territory, every cell "inside" the shape formed by their existing territory
 * plus the just-laid trail becomes theirs — even cells currently owned by
 * enemies.
 *
 * Algorithm (bounding-box scoped for performance):
 *   1. Convert the trail cells to owned territory (and clear the trail layer).
 *   2. Flood-fill "outside" from the bounding-box perimeter, treating the
 *      player's own cells as impassable walls.
 *   3. Any cell within the box that the outside flood never reached, and that
 *      the player does not already own, is enclosed → capture it.
 *
 * Runs in O(box area), which is bounded by the player's footprint rather than
 * the whole map.
 */
export function captureTerritory(
  grid: Grid,
  playerId: string,
  trail: GridPoint[],
): CaptureResult {
  if (trail.length === 0) return { cellsGained: 0 };

  const slot = grid.slotOf(playerId);
  const before = grid.territorySizeOf(playerId);

  // Step 1 — solidify the trail into territory.
  for (const p of trail) {
    grid.setOwner(p.x, p.y, playerId);
  }
  grid.clearTrail(playerId);

  // Step 2 — compute the bounding box over everything the player owns,
  // expanded by one and clamped to the grid.
  const box = playerBoundingBox(grid, slot);
  if (!box) return { cellsGained: grid.territorySizeOf(playerId) - before };

  const minX = Math.max(0, box.minX - 1);
  const minY = Math.max(0, box.minY - 1);
  const maxX = Math.min(grid.width - 1, box.maxX + 1);
  const maxY = Math.min(grid.height - 1, box.maxY + 1);

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const outside = new Uint8Array(boxW * boxH);

  const local = (x: number, y: number): number => (y - minY) * boxW + (x - minX);
  const isWall = (x: number, y: number): boolean => grid.ownerSlotAt(x, y) === slot;

  // Seed the flood from every non-wall cell on the box perimeter.
  const queue: number[] = [];
  const seed = (x: number, y: number): void => {
    if (isWall(x, y)) return;
    const li = local(x, y);
    if (outside[li]) return;
    outside[li] = 1;
    queue.push(x, y);
  };
  for (let x = minX; x <= maxX; x += 1) {
    seed(x, minY);
    seed(x, maxY);
  }
  for (let y = minY; y <= maxY; y += 1) {
    seed(minX, y);
    seed(maxX, y);
  }

  // Step 2b — BFS the outside region.
  let head = 0;
  while (head < queue.length) {
    const x = queue[head] as number;
    const y = queue[head + 1] as number;
    head += 2;
    const neighbours = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const;
    for (const [nx, ny] of neighbours) {
      if (nx < minX || ny < minY || nx > maxX || ny > maxY) continue;
      if (isWall(nx, ny)) continue;
      const li = local(nx, ny);
      if (outside[li]) continue;
      outside[li] = 1;
      queue.push(nx, ny);
    }
  }

  // Step 3 — capture every enclosed, not-already-owned cell.
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (outside[local(x, y)]) continue;
      if (grid.ownerSlotAt(x, y) === slot) continue;
      grid.setOwner(x, y, playerId);
    }
  }

  return { cellsGained: grid.territorySizeOf(playerId) - before };
}

/** Bounding box of all cells currently owned by a player slot, or null if none. */
function playerBoundingBox(
  grid: Grid,
  slot: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (grid.ownerSlotAt(x, y) === slot) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return found ? { minX, minY, maxX, maxY } : null;
}
