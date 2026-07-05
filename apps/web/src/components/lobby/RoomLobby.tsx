'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { RoomStatus, type PlayerPattern, type PlayerShape, type RoomSettings } from '@paperpiece/shared';
import { useIdentityStore } from '@/stores/identityStore';
import { useRoomStore } from '@/stores/roomStore';
import { toast } from '@/stores/toastStore';
import { Avatar } from '@/components/Avatar';
import { CosmeticsPanel } from './CosmeticsPanel';
import { SettingsPanel } from './SettingsPanel';

interface Actions {
  leaveRoom: () => Promise<void>;
  setReady: (ready: boolean) => Promise<void>;
  setColor: (color: string) => Promise<void>;
  setAvatar: (avatar: string) => Promise<void>;
  setShape: (shape: PlayerShape) => Promise<void>;
  setPattern: (pattern: PlayerPattern) => Promise<void>;
  setNickname: (name: string) => Promise<void>;
  updateSettings: (patch: Partial<RoomSettings>) => Promise<void>;
  kickPlayer: (targetPlayerId: string) => Promise<void>;
  startGame: () => Promise<void>;
}

/** The in-room lobby: roster, personalisation, host controls, and start. */
export function RoomLobby({ actions }: { actions: Actions }) {
  const room = useRoomStore((s) => s.room);
  const pingMs = useRoomStore((s) => s.pingMs);
  const countdown = useRoomStore((s) => s.countdown);
  const playerId = useIdentityStore((s) => s.playerId);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  if (!room) return null;

  const me = room.members.find((m) => m.id === playerId);
  const isHost = room.hostId === playerId;
  const usedColors = new Set(room.members.filter((m) => m.id !== playerId).map((m) => m.color));
  const everyoneReady = room.members.every((m) => m.isReady);
  const starting = room.status !== RoomStatus.Lobby;

  const copyCode = (): void => {
    void navigator.clipboard?.writeText(room.roomCode).then(() => toast.success('Room code copied'));
  };
  const copyInvite = (): void => {
    const url = `${window.location.origin}/lobby?join=1&code=${room.roomCode}`;
    void navigator.clipboard?.writeText(url).then(() => toast.success('Invite link copied'));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto grid w-full max-w-4xl gap-5 lg:grid-cols-[1.1fr_1fr]"
    >
      {/* Left: roster + code */}
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--color-ink-soft)]">Room code</p>
              <p className="font-mono text-3xl font-black tracking-[0.3em] text-[var(--color-accent)]">
                {room.roomCode}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                Copy
              </button>
              <button
                onClick={copyInvite}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                Invite
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
            {room.members.length}/{room.settings.playerLimit} players · ping {pingMs ?? '—'} ms
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
            Players
          </h3>
          <ul className="flex flex-col gap-2">
            {room.members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
              >
                <Avatar
                  src={m.isBot ? undefined : m.avatar}
                  name={m.username}
                  color={m.color}
                  size={32}
                />
                <span className="flex-1 truncate font-medium">
                  {m.username}
                  {m.id === playerId && <span className="text-[var(--color-ink-soft)]"> (you)</span>}
                </span>
                {m.isHost && (
                  <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    Host
                  </span>
                )}
                {!m.connected && <span className="text-xs text-[var(--color-ink-soft)]">reconnecting…</span>}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    m.isReady ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-[var(--color-ink-soft)]'
                  }`}
                >
                  {m.isReady ? 'Ready' : 'Not ready'}
                </span>
                {isHost && m.id !== playerId && (
                  <button
                    onClick={() => void actions.kickPlayer(m.id)}
                    className="rounded-lg px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/15"
                  >
                    Kick
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: personalise + settings + actions */}
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">You</h3>

          <div className="mb-4 flex items-center gap-2">
            {editingName ? (
              <>
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                />
                <button
                  onClick={() => {
                    void actions.setNickname(nameDraft.trim());
                    setEditingName(false);
                  }}
                  className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-canvas)]"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setNameDraft(me?.username ?? '');
                  setEditingName(true);
                }}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                Change nickname
              </button>
            )}
          </div>
        </div>

        <CosmeticsPanel
          me={me}
          usedColors={usedColors}
          onColor={(c) => void actions.setColor(c)}
          onAvatar={(a) => void actions.setAvatar(a)}
          onShape={(s) => void actions.setShape(s)}
          onPattern={(p) => void actions.setPattern(p)}
        />

        <SettingsPanel
          settings={room.settings}
          isHost={isHost}
          onChange={(patch) => void actions.updateSettings(patch)}
        />

        <div className="flex flex-col gap-3">
          {!isHost && (
            <button
              onClick={() => void actions.setReady(!me?.isReady)}
              className={`rounded-xl px-6 py-3 font-semibold transition ${
                me?.isReady
                  ? 'border border-white/15 bg-white/5 text-[var(--color-ink)]'
                  : 'bg-[var(--color-accent)] text-[var(--color-canvas)] hover:brightness-110'
              }`}
            >
              {me?.isReady ? 'Cancel ready' : "I'm ready"}
            </button>
          )}

          {isHost && (
            <button
              disabled={!everyoneReady || starting}
              onClick={() => void actions.startGame()}
              className="rounded-xl bg-[var(--color-accent)] px-6 py-3 font-semibold text-[var(--color-canvas)] shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting
                ? countdown != null
                  ? `Starting in ${countdown}…`
                  : 'Starting…'
                : everyoneReady
                  ? 'Start game'
                  : 'Waiting for players to ready up'}
            </button>
          )}

          <button
            onClick={() => void actions.leaveRoom()}
            className="rounded-xl border border-white/10 bg-black/20 px-6 py-2.5 text-sm text-[var(--color-ink-soft)] transition hover:bg-white/5"
          >
            Leave room
          </button>
        </div>
      </div>
    </motion.div>
  );
}
