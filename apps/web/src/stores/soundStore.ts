'use client';

import { create } from 'zustand';
import { sound } from '@/lib/sound';

interface SoundState {
  muted: boolean;
  ready: boolean;
  /** Initialise from persisted state (call once on mount). */
  init: () => void;
  toggle: () => void;
}

/** Reactive mirror of the sound manager's mute state for UI toggles. */
export const useSoundStore = create<SoundState>((set, get) => ({
  muted: false,
  ready: false,
  init: () => {
    if (get().ready) return;
    sound.init();
    set({ muted: sound.isMuted(), ready: true });
  },
  toggle: () => {
    const next = !get().muted;
    sound.setMuted(next);
    set({ muted: next });
  },
}));
