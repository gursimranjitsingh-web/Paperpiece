'use client';

import type { GameStateDelta, GameStateSnapshot } from '@paperpiece/shared';

/**
 * In-memory recorder for the most recent match. The client already receives the
 * full initial snapshot + every 20 Hz delta, so we just retain them; playback
 * re-applies them through the normal game buffer + renderer. No server storage.
 * Capped so a long match can't grow memory unbounded.
 */
class ReplayRecorder {
  snapshot: GameStateSnapshot | null = null;
  deltas: GameStateDelta[] = [];
  recording = false;
  private readonly cap = 6000; // ~5 min at 20 TPS

  start(): void {
    this.snapshot = null;
    this.deltas = [];
    this.recording = true;
  }

  recordSnapshot(s: GameStateSnapshot): void {
    if (this.recording && !this.snapshot) this.snapshot = s;
  }

  recordDelta(d: GameStateDelta): void {
    if (this.recording && this.deltas.length < this.cap) this.deltas.push(d);
  }

  stop(): void {
    this.recording = false;
  }

  get available(): boolean {
    return this.snapshot !== null && this.deltas.length > 0;
  }

  reset(): void {
    this.snapshot = null;
    this.deltas = [];
    this.recording = false;
  }
}

export const replay = new ReplayRecorder();
