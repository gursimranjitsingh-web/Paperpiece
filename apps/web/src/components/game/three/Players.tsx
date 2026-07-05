'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PlayerShape } from '@paperpiece/shared';
import { gameBuffer } from '@/lib/gameBuffer';
import { useGameStore } from '@/stores/gameStore';

const TICK_MS = 50;

/**
 * Player avatars as rounded cubes. Positions are interpolated between server
 * ticks every frame (no teleporting); the local player gets a white halo.
 * Mesh identity only changes when the roster changes, so the useFrame loop
 * mutates transforms directly rather than re-rendering React.
 */
export function Players({ localId }: { localId: string }) {
  const playerIds = useGameStore((s) => s.playerIds);
  const refs = useRef(new Map<string, THREE.Mesh>());
  const haloRefs = useRef(new Map<string, THREE.Mesh>());

  // Flat tokens facing the top-down camera: a disc (round) or a square.
  const roundGeo = useMemo(() => new THREE.CircleGeometry(0.62, 28), []);
  const squareGeo = useMemo(() => new THREE.PlaneGeometry(1.05, 1.05), []);
  const haloGeometry = useMemo(() => new THREE.CircleGeometry(1.0, 32), []);
  const shapeOf = (id: string): PlayerShape =>
    gameBuffer.players.get(id)?.shape ?? PlayerShape.Round;

  useFrame(() => {
    const t = Math.min(1, (performance.now() - gameBuffer.lastFrameAt) / TICK_MS);
    for (const id of playerIds) {
      const mesh = refs.current.get(id);
      if (!mesh) continue;
      const p = gameBuffer.players.get(id);
      if (!p || !p.alive) {
        mesh.visible = false;
        const h0 = haloRefs.current.get(id);
        if (h0) h0.visible = false;
        continue;
      }
      const prev = gameBuffer.prevPositions.get(id) ?? p.position;
      const x = prev.x + (p.position.x - prev.x) * t;
      const y = prev.y + (p.position.y - prev.y) * t;
      mesh.visible = true;
      mesh.position.set(x, -y, 0.6);
      // Orient square tokens toward the heading (grid y is down → negate).
      if (p.shape === PlayerShape.Square) mesh.rotation.z = -p.heading;
      (mesh.material as THREE.MeshBasicMaterial).color.set(p.color);

      const halo = haloRefs.current.get(id);
      if (halo) {
        halo.visible = id === localId;
        if (halo.visible) halo.position.set(x, -y, 0.3);
      }
    }
  });

  return (
    <group>
      {playerIds.map((id) => (
        <group key={id}>
          <mesh
            ref={(m) => {
              if (m) refs.current.set(id, m);
              else refs.current.delete(id);
            }}
            geometry={shapeOf(id) === PlayerShape.Square ? squareGeo : roundGeo}
          >
            <meshBasicMaterial toneMapped={false} />
          </mesh>
          <mesh
            ref={(m) => {
              if (m) haloRefs.current.set(id, m);
              else haloRefs.current.delete(id);
            }}
            geometry={haloGeometry}
            visible={false}
          >
            <meshBasicMaterial color="#ffffff" transparent opacity={0.25} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
