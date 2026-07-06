'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { gameBuffer } from '@/lib/gameBuffer';
import { useSettingsStore } from '@/stores/settingsStore';

const WHITE = new THREE.Color('#ffffff');
/** Seconds a newly-captured cell stays lit during the flood-in animation. */
const FLASH_SECONDS = 0.5;

/**
 * The whole territory/trail grid rendered as a single {@link THREE.InstancedMesh}
 * (one draw call, never a mesh per tile). Instance transforms are set once;
 * only the colours of cells that changed this tick are rewritten — matching the
 * server's delta model. Owned cells use the player colour; trail cells a
 * brightened tint (which blooms into a glow).
 */
export function CellGrid({
  width,
  height,
  boardColor,
}: {
  width: number;
  height: number;
  boardColor: string;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = width * height;
  // Cells currently mid flood-in, mapped to the clock time their flash ends.
  const flashUntil = useRef(new Map<number, number>());
  const BOARD_COLOR = useMemo(() => new THREE.Color(boardColor), [boardColor]);

  // Full-size cells (no inter-cell gap) so territory reads as a smooth painted
  // surface rather than a grid of boxes.
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);

  // Per-hex THREE.Color caches (owner + brightened trail variant).
  const cache = useMemo(() => new Map<string, { owner: THREE.Color; trail: THREE.Color }>(), []);
  // Per-cell brightness multiplier that paints the owner's chosen pattern at
  // cell resolution (no shader needed — baked into the instance colour).
  const patternFactor = (pattern: number, x: number, y: number): number => {
    switch (pattern) {
      case 1: // stripes (diagonal bands)
        return (x + y) % 4 < 2 ? 1.0 : 0.68;
      case 2: // dots
        return x % 3 === 1 && y % 3 === 1 ? 1.35 : 0.82;
      case 3: // checker
        return (x + y) % 2 === 0 ? 1.12 : 0.74;
      case 4: // grid lines
        return x % 4 === 0 || y % 4 === 0 ? 0.62 : 1.05;
      default: // solid
        return 1.0;
    }
  };

  const colorFor = useMemo(() => {
    return (index: number, out: THREE.Color): THREE.Color => {
      const trailOwner = gameBuffer.trails[index];
      const owner = gameBuffer.owners[index];
      const hex = trailOwner ?? owner;
      if (!hex) return out.copy(BOARD_COLOR);
      const key = gameBuffer.colorOf.get(hex) ?? '#888888';
      let entry = cache.get(key);
      if (!entry) {
        const base = new THREE.Color(key);
        // Territory is dimmed (reads as solid fill, minimal bloom); trails are
        // brightened so only they + player heads glow under the bloom pass.
        entry = { owner: base.clone().multiplyScalar(0.62), trail: base.clone().lerp(WHITE, 0.3) };
        cache.set(key, entry);
      }
      if (trailOwner) return out.copy(entry.trail); // trails stay clean/solid
      // Owned territory: apply the owner's fill pattern.
      const pattern = gameBuffer.patternOf.get(hex) ?? 0;
      const f = pattern === 0 ? 1 : patternFactor(pattern, index % width, Math.floor(index / width));
      return out.copy(entry.owner).multiplyScalar(f);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, BOARD_COLOR, width]);

  // Lay out instance transforms once (positions never change; only colour does).
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      const x = i % width;
      const y = Math.floor(i / width);
      m.setPosition(x, -y, 0);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    gameBuffer.fullRepaint = true; // force a colour repaint on the next frame
  }, [width, height, count]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh || gameBuffer.width !== width) return;
    const c = new THREE.Color();
    const now = clock.elapsedTime;
    const flashes = flashUntil.current;
    const animate = !useSettingsStore.getState().reducedMotion;
    let touched = false;

    const isFreshTerritory = (idx: number): boolean =>
      !!gameBuffer.owners[idx] && !gameBuffer.trails[idx];

    if (gameBuffer.fullRepaint) {
      for (let i = 0; i < count; i += 1) mesh.setColorAt(i, colorFor(i, c));
      gameBuffer.fullRepaint = false;
      gameBuffer.dirty = [];
      flashes.clear();
      touched = true;
    } else if (gameBuffer.dirty.length) {
      for (const idx of gameBuffer.dirty) {
        if (idx < 0 || idx >= count) continue;
        mesh.setColorAt(idx, colorFor(idx, c));
        // Newly-owned territory kicks off a flood-in flash.
        if (animate && isFreshTerritory(idx)) flashes.set(idx, now + FLASH_SECONDS);
      }
      gameBuffer.dirty = [];
      touched = true;
    }

    // Advance active flood-in flashes: lerp the cell toward white by how much
    // of its flash window remains, then settle to the normal colour.
    if (flashes.size) {
      for (const [idx, until] of flashes) {
        const remaining = (until - now) / FLASH_SECONDS;
        if (remaining <= 0) {
          mesh.setColorAt(idx, colorFor(idx, c));
          flashes.delete(idx);
        } else {
          mesh.setColorAt(idx, colorFor(idx, c).lerp(WHITE, remaining * 0.8));
        }
      }
      touched = true;
    }

    if (touched && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />;
}
