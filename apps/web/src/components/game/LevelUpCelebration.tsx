'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { sound } from '@/lib/sound';
import { useGameStore } from '@/stores/gameStore';
import { useIdentityStore } from '@/stores/identityStore';
import { useProgressStore } from '@/stores/progressStore';

/**
 * When a match ends, checks the freshly-recorded profile for a level increase
 * and, if so, shows a one-shot celebration. Silently does nothing when stats
 * persistence is off (profile fetch fails) or the level is unchanged.
 */
export function LevelUpCelebration() {
  const result = useGameStore((s) => s.result);
  const playerId = useIdentityStore((s) => s.playerId);
  const [newLevel, setNewLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!result || !playerId) return;
    let cancelled = false;

    // The server records the match asynchronously after MatchEnded, so poll the
    // profile a couple of times to catch the updated level.
    const check = async (attempt: number): Promise<void> => {
      try {
        const { profile } = await api.profile(playerId);
        if (cancelled) return;
        const prev = useProgressStore.getState().lastLevel;
        useProgressStore.getState().setLastLevel(profile.level);
        if (prev > 0 && profile.level > prev) {
          setNewLevel(profile.level);
          sound.play('powerup');
          return;
        }
        // No change yet — the write may still be in flight; retry once.
        if (attempt < 2) setTimeout(() => void check(attempt + 1), 2000);
      } catch {
        /* persistence disabled or offline — nothing to celebrate */
      }
    };
    const t = setTimeout(() => void check(0), 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [result, playerId]);

  // Auto-dismiss the banner a few seconds after it appears.
  useEffect(() => {
    if (newLevel === null) return;
    const t = setTimeout(() => setNewLevel(null), 5000);
    return () => clearTimeout(t);
  }, [newLevel]);

  return (
    <AnimatePresence>
      {newLevel !== null && (
        <motion.div
          key="levelup"
          initial={{ opacity: 0, scale: 0.7, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="pointer-events-none absolute left-1/2 top-1/3 z-20 -translate-x-1/2 rounded-2xl border border-[var(--color-accent)]/40 bg-black/70 px-8 py-5 text-center backdrop-blur"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
            Level up!
          </p>
          <p className="mt-1 text-4xl font-black text-[var(--color-ink)]">Level {newLevel}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Nicely played 🎉</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
