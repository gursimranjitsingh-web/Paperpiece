import { type GridPoint, type GridRect } from '@paperpiece/shared';

/**
 * Deterministically place N players so their starting territories never
 * overlap. Players are distributed across a virtual grid of cells sized to the
 * map; each is centred within its cell with enough margin that the spawn
 * squares stay clear of one another and the world border.
 */
export function computeSpawnPoints(
  mapSize: number,
  playerCount: number,
  territorySize: number,
): GridPoint[] {
  if (playerCount <= 0) return [];

  const cols = Math.ceil(Math.sqrt(playerCount));
  const rows = Math.ceil(playerCount / cols);

  const cellW = mapSize / cols;
  const cellH = mapSize / rows;

  // Half-extent of the spawn square plus a one-cell safety margin.
  const half = Math.ceil(territorySize / 2) + 1;

  const points: GridPoint[] = [];
  for (let i = 0; i < playerCount; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const cx = Math.round(cellW * (col + 0.5));
    const cy = Math.round(cellH * (row + 0.5));

    points.push({
      x: clampCentre(cx, half, mapSize),
      y: clampCentre(cy, half, mapSize),
    });
  }
  return points;
}

/** The rectangular territory a spawn point owns at match start. */
export function spawnRect(centre: GridPoint, territorySize: number): GridRect {
  const half = Math.floor(territorySize / 2);
  return {
    minX: centre.x - half,
    minY: centre.y - half,
    // Even sizes bias one cell toward the positive axis so the area equals size².
    maxX: centre.x - half + territorySize - 1,
    maxY: centre.y - half + territorySize - 1,
  };
}

/** Keep a spawn centre far enough from the border for its square to fit. */
function clampCentre(value: number, half: number, mapSize: number): number {
  return Math.min(mapSize - 1 - half, Math.max(half, value));
}
