'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { PowerUpType } from '@paperpiece/shared';
import { gameBuffer } from '@/lib/gameBuffer';
import { useGameStore } from '@/stores/gameStore';

/** Colour per power-up type (matches the HUD legend). */
const POWERUP_COLOR: Record<PowerUpType, string> = {
  [PowerUpType.Shield]: '#3a86ff',
  [PowerUpType.SpeedBoost]: '#ffd166',
  [PowerUpType.Freeze]: '#9bf6ff',
  [PowerUpType.ShrinkTerritory]: '#ef476f',
};

/**
 * Renders collectible power-up drops as pulsing glowing diamonds. Re-renders on
 * the frame counter (drops change infrequently); a useFrame pulse animates them.
 */
export function PowerUps() {
  useGameStore((s) => s.frame); // re-render when the drop list may have changed
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.15;
    for (const child of g.children) {
      child.scale.setScalar(s);
      child.rotation.z += 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      {gameBuffer.powerUps.map((d) => (
        <mesh key={d.id} position={[d.cell.x, -d.cell.y, 0.7]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial color={POWERUP_COLOR[d.type]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
