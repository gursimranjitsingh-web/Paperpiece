'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PlayerState, directionToAngle } from '@paperpiece/shared';
import { Chat } from '@/components/Chat';
import { EmojiReactions } from '@/components/EmojiReactions';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/stores/gameStore';
import { useRoomStore } from '@/stores/roomStore';
import { gameBuffer } from '@/lib/gameBuffer';
import { replay } from '@/lib/replay';
import { GameHud } from './GameHud';
import { Minimap } from './Minimap';
import { TouchControls } from './TouchControls';

// Three.js is browser-only — load the R3F board without SSR.
const GameBoard3D = dynamic(() => import('./three/GameBoard3D').then((m) => m.GameBoard3D), {
  ssr: false,
});

/** Full match screen: board renderer, HUD overlays, controls, and results. */
export function GameClient() {
  const router = useRouter();
  const { playerId, sendAngle, mouseControl } = useGame();
  const active = useGameStore((s) => s.active);
  const result = useGameStore((s) => s.result);
  const room = useRoomStore((s) => s.room);

  // If we somehow have no room context, go back to the lobby.
  useEffect(() => {
    if (!room) {
      const t = setTimeout(() => {
        if (!useRoomStore.getState().room) router.push('/lobby');
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [room, router]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[var(--color-canvas)]">
      <GameBoard3D localId={playerId} />
      <GameHud playerId={playerId} />
      <Minimap localId={playerId} />
      <Chat variant="game" />
      <EmojiReactions />
      {!mouseControl && <TouchControls onDirection={(dir) => sendAngle(directionToAngle(dir))} />}

      {!active && !result && (
        <div className="absolute inset-0 grid place-items-center bg-black/50 text-center">
          <div>
            <p className="text-lg font-semibold">Connecting to match…</p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Waiting for the first server frame.</p>
          </div>
        </div>
      )}

      {!active && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-[var(--color-ink-soft)]">
          {mouseControl ? 'Steer with your mouse' : 'Move with WASD / arrow keys'} · leave your
          territory to claim ground · return to capture
        </p>
      )}

      {active && <SpectateHint localId={playerId} />}

      {result && <ResultOverlay />}
    </main>
  );
}

/** Banner shown while the local player is dead (respawning or spectating). */
function SpectateHint({ localId }: { localId: string }) {
  useGameStore((s) => s.frame); // re-check each tick
  const me = gameBuffer.players.get(localId);
  if (!me || me.alive) return null;
  const spectating = me.state === PlayerState.Spectating;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-black/60 px-6 py-4 text-center backdrop-blur">
      <p className="text-xl font-bold text-[var(--color-danger)]">
        {spectating ? 'You were eliminated' : 'Respawning…'}
      </p>
      <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
        {spectating ? 'Spectating · pan the camera with WASD / arrows' : 'Hang tight — back in a moment'}
      </p>
    </div>
  );
}

function ResultOverlay() {
  const router = useRouter();
  const result = useGameStore((s) => s.result)!;
  const reset = useGameStore((s) => s.reset);
  const winner = result.leaderboard.find((e) => e.playerId === result.winnerId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-[var(--color-ink-soft)]">Match over</p>
        <h2 className="mt-1 text-3xl font-black text-[var(--color-accent)]">
          {winner ? `${winner.username} wins!` : 'Match ended'}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
          {result.durationSeconds}s · {result.leaderboard.length} players
        </p>

        <ol className="mt-4 flex flex-col gap-1 text-left text-sm">
          {result.leaderboard.slice(0, 5).map((e) => (
            <li key={e.playerId} className="flex items-center gap-2 rounded-md bg-black/20 px-3 py-1.5">
              <span className="w-4 text-[var(--color-ink-soft)]">{e.rank}</span>
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: e.color }} />
              <span className="flex-1 truncate">{e.username}</span>
              <span className="tabular-nums">{e.territoryPercent}% · {e.kills}k</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex gap-3">
          {replay.available && (
            <button
              onClick={() => router.push('/replay')}
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              ▶ Watch replay
            </button>
          )}
          <button
            onClick={() => {
              reset();
              gameBuffer.reset();
              router.push('/lobby');
            }}
            className="flex-1 rounded-xl bg-[var(--color-accent)] px-6 py-3 font-semibold text-[var(--color-canvas)] transition hover:brightness-110"
          >
            Return to lobby
          </button>
        </div>
      </div>
    </motion.div>
  );
}
