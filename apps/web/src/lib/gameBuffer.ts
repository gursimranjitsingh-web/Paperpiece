'use client';

import {
  PlayerPattern,
  type GameStateDelta,
  type GameStateSnapshot,
  type PlayerSnapshot,
  type PowerUpDrop,
} from '@paperpiece/shared';

/** Pattern enum → small integer id used by the renderer. */
export const PATTERN_INDEX: Record<PlayerPattern, number> = {
  [PlayerPattern.Solid]: 0,
  [PlayerPattern.Stripes]: 1,
  [PlayerPattern.Dots]: 2,
  [PlayerPattern.Checker]: 3,
  [PlayerPattern.Grid]: 4,
};

/**
 * Non-reactive, mutable mirror of the authoritative grid + players, updated by
 * socket events at 20 Hz and read by the canvas renderer in requestAnimationFrame.
 * Kept out of React/Zustand so high-frequency grid updates never trigger
 * re-renders — only the lightweight HUD state is reactive.
 */
class GameBuffer {
  width = 0;
  height = 0;
  owners: (string | null)[] = [];
  trails: (string | null)[] = [];
  players = new Map<string, PlayerSnapshot>();
  /** Previous positions for entity interpolation between server ticks. */
  prevPositions = new Map<string, { x: number; y: number }>();
  colorOf = new Map<string, string>();
  /** Player id → pattern index (fill design for their territory). */
  patternOf = new Map<string, number>();
  /** Collectible power-up drops currently on the board. */
  powerUps: PowerUpDrop[] = [];
  /** Indices changed since the renderer last drained them. */
  dirty: number[] = [];
  fullRepaint = false;
  /** Timestamp (ms) of the last applied server frame — used for interpolation. */
  lastFrameAt = 0;

  reset(): void {
    this.width = 0;
    this.height = 0;
    this.owners = [];
    this.trails = [];
    this.players.clear();
    this.prevPositions.clear();
    this.colorOf.clear();
    this.patternOf.clear();
    this.powerUps = [];
    this.dirty = [];
    this.fullRepaint = false;
  }

  setSnapshot(snap: GameStateSnapshot): void {
    this.width = snap.width;
    this.height = snap.height;
    this.owners = snap.grid.slice();
    this.trails = snap.trailGrid.slice();
    this.powerUps = snap.powerUps;
    this.players.clear();
    this.prevPositions.clear();
    this.colorOf.clear();
    for (const p of snap.players) {
      this.players.set(p.id, p);
      this.prevPositions.set(p.id, { ...p.position });
      this.colorOf.set(p.id, p.color);
      this.patternOf.set(p.id, PATTERN_INDEX[p.pattern] ?? 0);
    }
    this.fullRepaint = true;
    this.lastFrameAt = performance.now();
  }

  applyDelta(delta: GameStateDelta): void {
    if (delta.powerUps !== undefined) this.powerUps = delta.powerUps;
    for (const c of delta.cellDeltas) {
      if (c.index < 0 || c.index >= this.owners.length) continue;
      this.owners[c.index] = c.ownerId;
      this.trails[c.index] = c.trailOwnerId;
      this.dirty.push(c.index);
    }
    for (const p of delta.players) {
      const prev = this.players.get(p.id);
      this.prevPositions.set(p.id, prev ? { ...prev.position } : { ...p.position });
      this.players.set(p.id, p);
      this.colorOf.set(p.id, p.color);
      this.patternOf.set(p.id, PATTERN_INDEX[p.pattern] ?? 0);
    }
    this.lastFrameAt = performance.now();
  }
}

/** Single shared buffer for the active match. */
export const gameBuffer = new GameBuffer();
