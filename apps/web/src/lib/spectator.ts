'use client';

/**
 * Free-fly spectator camera state (world coordinates). Active while the local
 * player is dead/respawning: the camera stops following and the player pans it
 * with WASD/arrows. Read by CameraRig; panned by useGame's key handler.
 */
class Spectator {
  x = 0;
  y = 0;
  private initialized = false;

  /** Seed the free camera at the current view the first time it activates. */
  ensure(worldX: number, worldY: number): void {
    if (!this.initialized) {
      this.x = worldX;
      this.y = worldY;
      this.initialized = true;
    }
  }

  /** Hand control back to follow-cam (called while the player is alive). */
  release(): void {
    this.initialized = false;
  }

  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  get active(): boolean {
    return this.initialized;
  }
}

export const spectator = new Spectator();
