'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressState {
  /** Last account level we've seen for the local player (0 = unknown). */
  lastLevel: number;
  /** Whether the first-time tutorial has been dismissed. */
  tutorialSeen: boolean;
  setLastLevel: (level: number) => void;
  markTutorialSeen: () => void;
}

/**
 * Small persisted store for cross-session progression signals: the last level
 * we celebrated (so a level-up fires exactly once) and whether the newcomer
 * tutorial has been shown.
 */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      lastLevel: 0,
      tutorialSeen: false,
      setLastLevel: (level) => set({ lastLevel: level }),
      markTutorialSeen: () => set({ tutorialSeen: true }),
    }),
    { name: 'paperpiece:progress' },
  ),
);
