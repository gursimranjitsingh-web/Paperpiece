'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MAX_USERNAME_LENGTH, PlayerShape, ROOM_CODE_LENGTH } from '@paperpiece/shared';
import { api } from '@/lib/api';
import { AVATARS } from '@/lib/avatars';
import { Avatar } from '@/components/Avatar';
import { useIdentityStore } from '@/stores/identityStore';
import { toast } from '@/stores/toastStore';

interface Props {
  defaultJoin: boolean;
  initialCode?: string;
  onCreate: (username: string) => Promise<{ ok: boolean }>;
  onJoin: (code: string, username: string) => Promise<{ ok: boolean }>;
}

/** Pre-room screen: pick a nickname, then create or join by code. */
export function EntryScreen({ defaultJoin, initialCode, onCreate, onJoin }: Props) {
  const { username, setUsername, hydrated, avatar, setAvatar, shape, setShape } = useIdentityStore();
  const [name, setName] = useState('');
  const [code, setCode] = useState((initialCode ?? '').toUpperCase().slice(0, ROOM_CODE_LENGTH));
  const [mode, setMode] = useState<'create' | 'join'>(defaultJoin ? 'join' : 'create');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && username) setName(username);
  }, [hydrated, username]);

  const validName = (): string | null => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error('Nickname must be at least 2 characters.');
      return null;
    }
    return trimmed;
  };

  const handleCreate = async (): Promise<void> => {
    const n = validName();
    if (!n) return;
    setUsername(n);
    setBusy(true);
    await onCreate(n);
    setBusy(false);
  };

  const handleJoin = async (): Promise<void> => {
    const n = validName();
    if (!n) return;
    if (code.trim().length !== ROOM_CODE_LENGTH) {
      toast.error(`Room code must be ${ROOM_CODE_LENGTH} characters.`);
      return;
    }
    setUsername(n);
    setBusy(true);
    await onJoin(code.trim(), n);
    setBusy(false);
  };

  const joinCode = async (roomCode: string): Promise<void> => {
    const n = validName();
    if (!n) return;
    setUsername(n);
    setBusy(true);
    await onJoin(roomCode, n);
    setBusy(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md space-y-4"
    >
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">
        Nickname
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={MAX_USERNAME_LENGTH}
        placeholder="Your name"
        className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
      />

      {/* Appearance */}
      <div className="mb-5 flex items-center gap-3">
        <Avatar src={avatar} name={name || 'You'} size={44} ring={false} />
        <div className="min-w-0 flex-1">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`shrink-0 rounded-full transition ${
                  avatar === a ? 'ring-2 ring-[var(--color-accent)]' : 'opacity-70 hover:opacity-100'
                }`}
                aria-label="choose avatar"
              >
                <Avatar src={a} name="?" size={28} ring={false} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          {(
            [
              { s: PlayerShape.Round, icon: '●' },
              { s: PlayerShape.Square, icon: '■' },
            ] as const
          ).map(({ s, icon }) => (
            <button
              key={s}
              onClick={() => setShape(s)}
              className={`px-3 py-2 text-sm ${
                shape === s ? 'bg-[var(--color-accent)] text-[var(--color-canvas)]' : 'bg-black/30 text-[var(--color-ink-soft)]'
              }`}
              aria-label={`shape ${s}`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1">
        {(['create', 'join'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${
              mode === m ? 'bg-[var(--color-accent)] text-[var(--color-canvas)]' : 'text-[var(--color-ink-soft)]'
            }`}
          >
            {m === 'create' ? 'Create room' : 'Join room'}
          </button>
        ))}
      </div>

      {mode === 'join' && (
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, ROOM_CODE_LENGTH))}
          placeholder="ROOM CODE"
          className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent-2)]"
        />
      )}

      <button
        disabled={busy}
        onClick={mode === 'create' ? handleCreate : handleJoin}
        className="w-full rounded-xl bg-[var(--color-accent)] px-6 py-3 font-semibold text-[var(--color-canvas)] shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? 'Please wait…' : mode === 'create' ? 'Create room' : 'Join room'}
      </button>
      </div>

      <PublicRoomsPanel onJoin={joinCode} />
    </motion.div>
  );
}

/** Live list of public rooms you can jump straight into. */
function PublicRoomsPanel({ onJoin }: { onJoin: (code: string) => void }) {
  const { data } = useQuery({
    queryKey: ['public-rooms'],
    queryFn: api.publicRooms,
    refetchInterval: 5000,
  });
  const rooms = data?.rooms ?? [];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
        Public games
      </p>
      {rooms.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          No public games right now — create one and make it Public!
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rooms.map((r) => (
            <li
              key={r.roomCode}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm"
            >
              <span className="font-mono font-bold tracking-widest text-[var(--color-accent)]">
                {r.roomCode}
              </span>
              <span className="flex-1 text-[var(--color-ink-soft)]">
                {r.mapSize}×{r.mapSize} · {r.players}/{r.playerLimit}
              </span>
              <button
                onClick={() => onJoin(r.roomCode)}
                disabled={r.players >= r.playerLimit}
                className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-canvas)] transition hover:brightness-110 disabled:opacity-40"
              >
                {r.players >= r.playerLimit ? 'Full' : 'Join'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
