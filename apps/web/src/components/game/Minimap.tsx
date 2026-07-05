'use client';

import { useEffect, useRef } from 'react';
import { gameBuffer } from '@/lib/gameBuffer';

const SIZE = 132; // px

/**
 * Live minimap: downsamples the territory grid onto a small canvas and marks
 * every player. Reads the non-reactive game buffer in an interval (≈8 Hz) so it
 * never triggers React re-renders. Anchored bottom-left above the kill feed.
 */
export function Minimap({ localId }: { localId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (): void => {
      const w = gameBuffer.width;
      const h = gameBuffer.height;
      if (!w || !h) return;
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = 'rgba(8,11,20,0.85)';
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Downsample: sample the grid on a coarse step and draw owned cells.
      const step = Math.max(1, Math.floor(Math.max(w, h) / SIZE));
      const px = SIZE / w;
      const py = SIZE / h;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const owner = gameBuffer.owners[y * w + x];
          if (!owner) continue;
          ctx.fillStyle = gameBuffer.colorOf.get(owner) ?? '#888';
          ctx.fillRect(x * px, y * py, Math.max(1, px * step), Math.max(1, py * step));
        }
      }

      // Player markers.
      for (const p of gameBuffer.players.values()) {
        if (!p.alive) continue;
        ctx.fillStyle = '#fff';
        const mx = p.position.x * px;
        const my = p.position.y * py;
        ctx.beginPath();
        ctx.arc(mx, my, p.id === localId ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = p.id === localId ? '#ffffff' : p.color;
        ctx.fill();
      }
    };

    const id = setInterval(draw, 120);
    return () => clearInterval(id);
  }, [localId]);

  return (
    <div className="pointer-events-none absolute bottom-16 right-4">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="rounded-xl border border-white/10 shadow-lg"
        style={{ width: SIZE, height: SIZE }}
      />
    </div>
  );
}
