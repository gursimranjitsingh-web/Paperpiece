import type { GridPoint } from '../types/geometry';
import { Direction } from '../enums';

/** Convert a grid coordinate to a flattened row-major index. */
export function toIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

/** Convert a flattened index back to a grid coordinate. */
export function fromIndex(index: number, width: number): GridPoint {
  return { x: index % width, y: Math.floor(index / width) };
}

/** Whether a coordinate lies inside the [0,width) x [0,height) grid. */
export function inBounds(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

/** Unit delta for a direction. `None` yields a zero vector. */
export function directionToDelta(dir: Direction): GridPoint {
  switch (dir) {
    case Direction.Up:
      return { x: 0, y: -1 };
    case Direction.Down:
      return { x: 0, y: 1 };
    case Direction.Left:
      return { x: -1, y: 0 };
    case Direction.Right:
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

/** The direction directly opposite the given one. */
export function oppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case Direction.Up:
      return Direction.Down;
    case Direction.Down:
      return Direction.Up;
    case Direction.Left:
      return Direction.Right;
    case Direction.Right:
      return Direction.Left;
    default:
      return Direction.None;
  }
}

/**
 * A proposed direction is a forbidden 180° reversal if it is the exact opposite
 * of the current heading — this is what prevents a player from driving into
 * their own neck.
 */
export function isReversal(current: Direction, next: Direction): boolean {
  if (current === Direction.None || next === Direction.None) return false;
  return oppositeDirection(current) === next;
}

/** Manhattan distance between two grid points. */
export function manhattan(a: GridPoint, b: GridPoint): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Heading (radians) for a cardinal direction, in the grid's coordinate space
 * where +x is right and +y is DOWN (matching screen space). Right = 0,
 * Down = π/2, Left = π, Up = -π/2. `None` returns NaN.
 */
export function directionToAngle(dir: Direction): number {
  switch (dir) {
    case Direction.Right:
      return 0;
    case Direction.Down:
      return Math.PI / 2;
    case Direction.Left:
      return Math.PI;
    case Direction.Up:
      return -Math.PI / 2;
    default:
      return Number.NaN;
  }
}

/** Nearest cardinal direction for a continuous heading (radians). */
export function angleToDirection(angle: number): Direction {
  if (!Number.isFinite(angle)) return Direction.None;
  const a = Math.atan2(Math.sin(angle), Math.cos(angle)); // normalize to (-π, π]
  if (a >= -Math.PI / 4 && a < Math.PI / 4) return Direction.Right;
  if (a >= Math.PI / 4 && a < (3 * Math.PI) / 4) return Direction.Down;
  if (a >= -(3 * Math.PI) / 4 && a < -Math.PI / 4) return Direction.Up;
  return Direction.Left;
}

/** Smallest absolute angular difference between two headings (0..π). */
export function angleDelta(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}
