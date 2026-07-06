'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sound } from '@/lib/sound';
import { fx } from '@/lib/fx';

interface SettingsState {
  /** Master audio volume (0-1). */
  volume: number;
  /** Suppress particles + camera shake + heavy animations. */
  reducedMotion: boolean;
  /** Bloom / glow post-processing (off = faster on low-end GPUs). */
  bloom: boolean;
  setVolume: (v: number) => void;
  setReducedMotion: (v: boolean) => void;
  setBloom: (v: boolean) => void;
  /** Push current settings into the non-reactive subsystems (sound, fx). */
  apply: () => void;
}

/** User graphics/audio preferences, persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      volume: 0.8,
      reducedMotion: false,
      bloom: true,
      setVolume: (volume) => {
        set({ volume });
        sound.setMasterVolume(volume);
      },
      setReducedMotion: (reducedMotion) => {
        set({ reducedMotion });
        fx.enabled = !reducedMotion;
      },
      setBloom: (bloom) => set({ bloom }),
      apply: () => {
        const s = get();
        sound.setMasterVolume(s.volume);
        fx.enabled = !s.reducedMotion;
      },
    }),
    {
      name: 'paperpiece:settings',
      onRehydrateStorage: () => (state) => state?.apply(),
    },
  ),
);
