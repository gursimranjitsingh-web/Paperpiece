'use client';

import { OrthographicCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { OrthographicCamera as OrthoCam } from 'three';
import { gameBuffer } from '@/lib/gameBuffer';
import { fx } from '@/lib/fx';
import { spectator } from '@/lib/spectator';

const TICK_MS = 50;

/**
 * Top-down orthographic camera that smoothly follows the local player. Position
 * eases toward the player's interpolated location; zoom is fixed (pixels per
 * cell). Falls back to the board centre before the player exists.
 */
export function CameraRig({ localId, zoom = 16 }: { localId: string; zoom?: number }) {
  const camRef = useRef<OrthoCam>(null);

  useFrame((_, dt) => {
    const cam = camRef.current;
    if (!cam) return;
    const t = Math.min(1, (performance.now() - gameBuffer.lastFrameAt) / TICK_MS);
    const me = gameBuffer.players.get(localId);
    const prev = gameBuffer.prevPositions.get(localId);

    let targetX: number;
    let targetY: number;
    if (me && me.alive && prev) {
      // Follow the living player.
      spectator.release();
      targetX = prev.x + (me.position.x - prev.x) * t;
      targetY = -(prev.y + (me.position.y - prev.y) * t);
    } else {
      // Dead/spectating → free-fly camera the player pans (see useGame).
      spectator.ensure(cam.position.x, cam.position.y);
      targetX = spectator.x;
      targetY = spectator.y;
    }

    // Critically-damped-ish easing that is frame-rate independent.
    const k = 1 - Math.pow(0.0001, dt);
    cam.position.x += (targetX - cam.position.x) * k;
    cam.position.y += (targetY - cam.position.y) * k;

    // Additive camera shake from the effects bus.
    if (fx.shakeMag > 0) {
      cam.position.x += (Math.random() - 0.5) * fx.shakeMag;
      cam.position.y += (Math.random() - 0.5) * fx.shakeMag;
    }
  });

  return <OrthographicCamera ref={camRef} makeDefault position={[0, 0, 50]} zoom={zoom} near={0.1} far={200} />;
}
