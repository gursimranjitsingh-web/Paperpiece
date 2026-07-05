/** Integer grid coordinate. The world is grid-based — never store pixels. */
export interface GridPoint {
  x: number;
  y: number;
}

/** Continuous position used for smooth interpolation between grid cells. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Axis-aligned rectangular region in grid space (inclusive bounds). */
export interface GridRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
