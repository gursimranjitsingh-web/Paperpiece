'use client';

/**
 * Tiny, non-reactive visual-effects bus: a particle pool and a decaying camera
 * shake. Gameplay events push effects; the R3F render loop reads and advances
 * them each frame. Kept out of React so it never triggers re-renders.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds remaining
  maxLife: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 400;

class Fx {
  particles: Particle[] = [];
  shakeMag = 0;

  /** Add a camera shake (magnitude in world units); larger overrides smaller. */
  shake(mag: number): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  /** Spawn a radial burst of `count` particles at a grid cell. */
  burst(cellX: number, cellY: number, color: string, count = 18, speed = 6): void {
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const s = speed * (0.4 + Math.random() * 0.8);
      const life = 0.4 + Math.random() * 0.4;
      this.particles.push({
        x: cellX,
        y: cellY,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        maxLife: life,
        size: 0.6 + Math.random() * 0.8,
        color,
      });
    }
  }

  /** Advance particles + decay shake. Called once per rendered frame. */
  update(dt: number): void {
    const clamped = Math.min(dt, 0.05);
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i]!;
      p.life -= clamped;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * clamped;
      p.y += p.vy * clamped;
      p.vx *= 0.9;
      p.vy *= 0.9;
    }
    this.shakeMag *= Math.pow(0.001, clamped); // fast exponential decay
    if (this.shakeMag < 0.01) this.shakeMag = 0;
  }

  reset(): void {
    this.particles = [];
    this.shakeMag = 0;
  }
}

export const fx = new Fx();
