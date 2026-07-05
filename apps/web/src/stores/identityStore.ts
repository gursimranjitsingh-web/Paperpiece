'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlayerPattern, PlayerShape } from '@paperpiece/shared';
import { DEFAULT_AVATAR } from '@/lib/avatars';

/** A short, stable guest id generated once and persisted in localStorage. */
function makeGuestId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `guest_${Date.now().toString(36)}${rand}`;
}

interface IdentityState {
  playerId: string;
  username: string;
  avatar: string;
  shape: PlayerShape;
  pattern: PlayerPattern;
  /** Whether the identity has been rehydrated from storage (avoids SSR flicker). */
  hydrated: boolean;
  setUsername: (username: string) => void;
  setAvatar: (avatar: string) => void;
  setShape: (shape: PlayerShape) => void;
  setPattern: (pattern: PlayerPattern) => void;
  ensureId: () => void;
}

/**
 * The player's persistent identity + cosmetics. `playerId` is generated once and
 * reused so the server recognises the same player across reconnects/sessions.
 */
export const useIdentityStore = create<IdentityState>()(
  persist(
    (set, get) => ({
      playerId: '',
      username: '',
      avatar: DEFAULT_AVATAR,
      shape: PlayerShape.Round,
      pattern: PlayerPattern.Solid,
      hydrated: false,
      setUsername: (username) => set({ username: username.slice(0, 16) }),
      setAvatar: (avatar) => set({ avatar }),
      setShape: (shape) => set({ shape }),
      setPattern: (pattern) => set({ pattern }),
      ensureId: () => {
        if (!get().playerId) set({ playerId: makeGuestId() });
      },
    }),
    {
      name: 'paperpiece:identity',
      partialize: (s) => ({
        playerId: s.playerId,
        username: s.username,
        avatar: s.avatar,
        shape: s.shape,
        pattern: s.pattern,
      }),
      onRehydrateStorage: () => (state) => {
        state?.ensureId();
        if (state) {
          if (!state.avatar) state.avatar = DEFAULT_AVATAR;
          state.hydrated = true;
        }
      },
    },
  ),
);

/** Full identity payload for the socket handshake. */
export function identityAuth(): {
  playerId: string;
  username: string;
  avatar: string;
  shape: PlayerShape;
  pattern: PlayerPattern;
} {
  const s = useIdentityStore.getState();
  return {
    playerId: s.playerId,
    username: s.username || 'Guest',
    avatar: s.avatar,
    shape: s.shape,
    pattern: s.pattern,
  };
}
