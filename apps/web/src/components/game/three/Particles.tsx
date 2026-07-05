'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { fx } from '@/lib/fx';

const CAP = 400;

/**
 * Renders the {@link fx} particle pool as a single InstancedMesh of glowing
 * quads (one draw call). Each frame it advances the pool and writes per-instance
 * transforms + colours; unused instances are scaled to zero.
 */
export function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    fx.update(dt);
    const n = Math.min(fx.particles.length, CAP);
    for (let i = 0; i < n; i += 1) {
      const p = fx.particles[i]!;
      const t = p.life / p.maxLife; // 1 → 0
      const s = p.size * t;
      dummy.position.set(p.x, -p.y, 0.9);
      dummy.scale.setScalar(Math.max(0.001, s));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(p.color));
    }
    // Park the remaining instances off-screen / zero-scale.
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = n; i < CAP; i += 1) mesh.setMatrixAt(i, dummy.matrix);

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, CAP]} frustumCulled={false} />;
}
