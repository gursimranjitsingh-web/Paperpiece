'use client';

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { gameBuffer } from '@/lib/gameBuffer';
import { useGameStore } from '@/stores/gameStore';
import { useSettingsStore } from '@/stores/settingsStore';

type Pt = [number, number, number];

/**
 * Neon trails rendered with drei's <Line> (three's Line2 fat-line under the
 * hood). Rebuilt each server frame (subscribing to the frame counter, ~20 Hz)
 * from each live player's trail cells plus their head. A dashed pattern whose
 * offset animates every frame makes the trail look like energy flowing toward
 * the head. Bloom turns these into the glowing trails.
 */
export function Trails() {
  const frame = useGameStore((s) => s.frame);
  const playerIds = useGameStore((s) => s.playerIds);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const groupRef = useRef<Group>(null);

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

  // Flow the dash pattern toward the head. drei's <Line> forwards the Line2
  // object as each child; its material exposes `dashOffset`.
  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g || reducedMotion) return;
    for (const child of g.children) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mat = (child as any).material;
      if (mat && typeof mat.dashOffset === 'number') mat.dashOffset -= dt * 1.5;
    }
  });

  return (
    <group ref={groupRef}>
      {lines.map((l) => (
        <Line
          key={l.id}
          points={l.points}
          color={l.color}
          lineWidth={3}
          dashed
          dashSize={1.6}
          gapSize={0.5}
          toneMapped={false}
        />
      ))}
    </group>
  );
}
