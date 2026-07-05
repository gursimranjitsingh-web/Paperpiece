'use client';

import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { gameBuffer } from '@/lib/gameBuffer';
import { useGameStore } from '@/stores/gameStore';

type Pt = [number, number, number];

/**
 * Neon trails rendered with drei's <Line> (three's Line2 fat-line under the
 * hood). Rebuilt each server frame (subscribing to the frame counter, ~20 Hz)
 * from each live player's trail cells plus their head. Bloom turns these into
 * the glowing trails.
 */
export function Trails() {
  const frame = useGameStore((s) => s.frame);
  const playerIds = useGameStore((s) => s.playerIds);

  // Recompute polylines whenever a new frame arrives.
  const lines = useMemo(() => {
    void frame; // dependency: rebuild on each tick
    const out: { id: string; color: string; points: Pt[] }[] = [];
    for (const id of playerIds) {
      const p = gameBuffer.players.get(id);
      if (!p || !p.alive || p.trail.length === 0) continue;
      const points: Pt[] = p.trail.map((c) => [c.x, -c.y, 0.4] as Pt);
      points.push([p.position.x, -p.position.y, 0.4]);
      if (points.length >= 2) out.push({ id, color: p.color, points });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, playerIds]);

  return (
    <group>
      {lines.map((l) => (
        <Line key={l.id} points={l.points} color={l.color} lineWidth={3} toneMapped={false} />
      ))}
    </group>
  );
}
