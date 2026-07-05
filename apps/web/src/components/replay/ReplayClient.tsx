'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameStateDelta } from '@paperpiece/shared';
import { gameBuffer } from '@/lib/gameBuffer';
import { replay } from '@/lib/replay';
import { useGameStore } from '@/stores/gameStore';

const GameBoard3D = dynamic(() => import('@/components/game/three/GameBoard3D').then((m) => m.GameBoard3D), {
  ssr: false,
});

const SPEEDS = [0.5, 1, 2, 4];

/** Local replay player: re-applies the recorded snapshot + delta stream through
 *  the game buffer and the normal renderer, with play/pause, speed, and scrub. */
export function ReplayClient() {
  const total = replay.deltas.length;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);

  const idxRef = useRef(0);
  const playingRef = useRef(true);
  const speedRef = useRef(1);
  playingRef.current = playing;
  speedRef.current = speed;

  const applyOne = useCallback((d: GameStateDelta) => {
    gameBuffer.applyDelta(d);
    const gs = useGameStore.getState();
    gs.setPlayerIds(d.players.map((p) => p.id));
    gs.setHud({
      tick: d.tick,
      leaderboard: d.leaderboard,
      timeRemaining: d.timeRemaining ?? null,
      aliveCount: d.players.filter((p) => p.alive).length,
      playerCount: d.players.length,
      playerId: '',
    });
    gs.bumpFrame();
  }, []);

  const seek = useCallback(
    (target: number) => {
      if (!replay.snapshot) return;
      gameBuffer.setSnapshot(replay.snapshot);
      const gs = useGameStore.getState();
      gs.setDims(replay.snapshot.width, replay.snapshot.height);
      const clamped = Math.max(0, Math.min(target, total));
      for (let i = 0; i < clamped; i += 1) applyOne(replay.deltas[i]!);
      idxRef.current = clamped;
      setIdx(clamped);
    },
    [applyOne, total],
  );

  // Initialise + drive playback.
  useEffect(() => {
    if (!replay.available) return;
    useGameStore.getState().startMatch();
    seek(0);
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const tick = (): void => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (!playingRef.current) return;
      acc += dt * speedRef.current;
      while (acc >= 50 && idxRef.current < replay.deltas.length) {
        acc -= 50;
        applyOne(replay.deltas[idxRef.current]!);
        idxRef.current += 1;
      }
      setIdx(idxRef.current);
      if (idxRef.current >= replay.deltas.length) playingRef.current = false;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!replay.available) {
    return (
      <main className="grid-backdrop grid min-h-screen place-items-center px-6 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-lg font-semibold">No replay available</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Finish a match to record one.</p>
          <Link href="/lobby" className="mt-4 inline-block rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 font-semibold transition hover:bg-white/10">
            ← Lobby
          </Link>
        </div>
      </main>
    );
  }

  const atEnd = idx >= total;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--color-canvas)]">
      <GameBoard3D localId="" />

      <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm backdrop-blur">
        Replay · frame {idx}/{total} · pan with WASD
      </div>

      {/* Controls */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-6 py-4">
        <button
          onClick={() => {
            if (atEnd) seek(0);
            setPlaying((p) => !p);
          }}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-semibold text-[var(--color-canvas)]"
        >
          {playing && !atEnd ? '❚❚ Pause' : '▶ Play'}
        </button>

        <input
          type="range"
          min={0}
          max={total}
          value={idx}
          onChange={(e) => {
            setPlaying(false);
            seek(Number(e.target.value));
          }}
          className="flex-1 accent-[var(--color-accent)]"
        />

        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                speed === s ? 'bg-[var(--color-accent)] text-[var(--color-canvas)]' : 'bg-white/10 text-[var(--color-ink-soft)]'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <Link href="/lobby" className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold transition hover:bg-white/10">
          Lobby
        </Link>
      </div>
    </main>
  );
}
