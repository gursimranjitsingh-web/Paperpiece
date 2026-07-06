'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { RoomStatus } from '@paperpiece/shared';
import { useLobby } from '@/hooks/useLobby';
import { useIdentityStore } from '@/stores/identityStore';
import { useRoomStore } from '@/stores/roomStore';
import { Chat } from '@/components/Chat';
import { EmojiReactions } from '@/components/EmojiReactions';
import { EntryScreen } from './EntryScreen';
import { RoomLobby } from './RoomLobby';

/** Orchestrates the lobby: connection, entry vs in-room, and match navigation. */
export function LobbyClient() {
  const router = useRouter();
  const params = useSearchParams();
  const lobby = useLobby();

  const room = useRoomStore((s) => s.room);
  const connection = useRoomStore((s) => s.connection);

  // When the host starts and the server flips the room to Playing, enter the match.
  useEffect(() => {
    if (room?.status === RoomStatus.Playing) router.push('/play');
  }, [room?.status, router]);

  // Quick Play: once connected, auto-create a bot-filled room and start it, so
  // the player drops straight into a match. Guarded to fire exactly once.
  const quick = params.get('quick') === '1';
  const quickFired = useRef(false);
  useEffect(() => {
    if (!quick || quickFired.current) return;
    if (connection !== 'connected' || room) return;
    quickFired.current = true;
    void (async () => {
      const name = useIdentityStore.getState().username || 'Player';
      const res = await lobby.createRoom(name, { fillWithBots: true, isPublic: false });
      if (res.ok) await lobby.startGame();
    })();
  }, [quick, connection, room, lobby]);

  const defaultJoin = params.get('join') === '1' || params.has('code');

  return (
    <main className="grid-backdrop relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" className="text-sm text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]">
          ← Home
        </Link>
        <ConnectionBadge status={connection} />
      </div>

      {room ? (
        <div className="mx-auto grid w-full max-w-4xl gap-5">
          <RoomLobby actions={lobby} />
          <Chat variant="lobby" />
        </div>
      ) : (
        <EntryScreen
          defaultJoin={defaultJoin}
          initialCode={params.get('code') ?? undefined}
          onCreate={lobby.createRoom}
          onJoin={lobby.joinRoom}
        />
      )}
      <EmojiReactions />
    </main>
  );
}

function ConnectionBadge({ status }: { status: string }) {
  const online = status === 'connected';
  const color = online ? 'var(--color-accent)' : status === 'connecting' ? 'var(--color-ink-soft)' : 'var(--color-danger)';
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--color-ink-soft)]">
      <motion.span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        animate={online ? { scale: [1, 1.3, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.6 }}
      />
      {status}
    </span>
  );
}
