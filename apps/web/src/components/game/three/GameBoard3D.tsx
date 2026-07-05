'use client';

import { Line } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useRoomStore } from '@/stores/roomStore';
import { themeOf } from '@/lib/theme';
import { CameraRig } from './CameraRig';
import { CellGrid } from './CellGrid';
import { Particles } from './Particles';
import { Players } from './Players';
import { PowerUps } from './PowerUps';
import { Trails } from './Trails';

/** Glowing rectangular frame around the play field. */
function BoardBorder({ width, height, color }: { width: number; height: number; color: string }) {
  const points = useMemo(() => {
    const x0 = -0.5;
    const y0 = 0.5;
    const x1 = width - 0.5;
    const y1 = -(height - 0.5);
    return [
      [x0, y0, 0.2],
      [x1, y0, 0.2],
      [x1, y1, 0.2],
      [x0, y1, 0.2],
      [x0, y0, 0.2],
    ] as [number, number, number][];
  }, [width, height]);
  return <Line points={points} color={color} lineWidth={2} toneMapped={false} />;
}

/**
 * React Three Fiber match renderer: an InstancedMesh territory grid, Line2 neon
 * trails, interpolated player cubes, a following orthographic camera, and a
 * bloom pass for the glow. Reads the non-reactive game buffer inside the render
 * loop so 20 Hz network updates never re-render React.
 */
export function GameBoard3D({ localId }: { localId: string }) {
  const width = useGameStore((s) => s.width);
  const height = useGameStore((s) => s.height);
  const theme = themeOf(useRoomStore((s) => s.room?.settings.theme));

  if (!width || !height) return null;

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true }} style={{ position: 'absolute', inset: 0 }}>
      <color attach="background" args={[theme.background]} />
      <CameraRig localId={localId} />

      {/* Board backdrop slightly behind the cells. */}
      <mesh position={[width / 2 - 0.5, -(height / 2 - 0.5), -0.2]}>
        <planeGeometry args={[width + 2, height + 2]} />
        <meshBasicMaterial color={theme.board} toneMapped={false} />
      </mesh>

      <CellGrid width={width} height={height} boardColor={theme.board} />
      <Trails />
      <PowerUps />
      <Players localId={localId} />
      <Particles />
      <BoardBorder width={width} height={height} color={theme.border} />

      <EffectComposer>
        <Bloom intensity={theme.bloomIntensity} luminanceThreshold={0.5} luminanceSmoothing={0.25} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
