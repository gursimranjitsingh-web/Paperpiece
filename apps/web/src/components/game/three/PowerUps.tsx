'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PowerUpType } from '@paperpiece/shared';
import { gameBuffer } from '@/lib/gameBuffer';
import { useGameStore } from '@/stores/gameStore';

/** Icon + colour per power-up type (matches the HUD legend). */
const POWERUP_META: Record<PowerUpType, { emoji: string; color: string }> = {
  [PowerUpType.Shield]: { emoji: '🛡️', color: '#3a86ff' },
  [PowerUpType.SpeedBoost]: { emoji: '⚡', color: '#ffd166' },
  [PowerUpType.Freeze]: { emoji: '❄️', color: '#9bf6ff' },
  [PowerUpType.ShrinkTerritory]: { emoji: '✂️', color: '#ef476f' },
  [PowerUpType.Ghost]: { emoji: '👻', color: '#b39ddb' },
  [PowerUpType.Magnet]: { emoji: '🧲', color: '#ff9f1c' },
};

/** Render a coloured badge + emoji to a canvas → a texture usable in the scene. */
function makeIconTexture(emoji: string, color: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Soft coloured disc backing.
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.48);
  grad.addColorStop(0, color);
  grad.addColorStop(1, `${color}00`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
  ctx.fill();
  // Emoji icon.
  ctx.font = `${size * 0.58}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size * 0.56);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Collectible power-up drops rendered as pulsing, glowing icon badges. Textures
 * are built once per type; the drop list re-renders on the frame counter and a
 * useFrame pulse animates a gentle bob + scale.
 */
export function PowerUps() {
  useGameStore((s) => s.frame); // re-render when the drop list may have changed
  const groupRef = useRef<THREE.Group>(null);

  const textures = useMemo(() => {
    const map = {} as Record<PowerUpType, THREE.CanvasTexture>;
    (Object.keys(POWERUP_META) as PowerUpType[]).forEach((t) => {
      map[t] = makeIconTexture(POWERUP_META[t].emoji, POWERUP_META[t].color);
    });
    return map;
  }, []);

  const materials = useMemo(() => {
    const map = {} as Record<PowerUpType, THREE.MeshBasicMaterial>;
    (Object.keys(textures) as PowerUpType[]).forEach((t) => {
      map[t] = new THREE.MeshBasicMaterial({ map: textures[t], transparent: true, toneMapped: false });
    });
    return map;
  }, [textures]);

  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.12;
    for (const child of g.children) child.scale.setScalar(s);
  });

  return (
    <group ref={groupRef}>
      {gameBuffer.powerUps.map((d) => (
        <mesh key={d.id} position={[d.cell.x, -d.cell.y, 0.75]} geometry={geometry} material={materials[d.type]} />
      ))}
    </group>
  );
}
