'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSoundStore } from '@/stores/soundStore';

/** Gear button that opens a small settings popover (audio + graphics). */
export function SettingsMenu({
  className = '',
  placement = 'bottom',
}: {
  className?: string;
  placement?: 'bottom' | 'top';
}) {
  const [open, setOpen] = useState(false);
  const volume = useSettingsStore((s) => s.volume);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const setReducedMotion = useSettingsStore((s) => s.setReducedMotion);
  const bloom = useSettingsStore((s) => s.bloom);
  const setBloom = useSettingsStore((s) => s.setBloom);
  const muted = useSoundStore((s) => s.muted);
  const toggleMute = useSoundStore((s) => s.toggle);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        title="Settings"
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/40 text-[var(--color-ink)] backdrop-blur transition hover:bg-white/10"
      >
        ⚙️
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className={`absolute right-0 z-50 w-64 rounded-2xl border border-white/10 bg-[var(--color-canvas)]/95 p-4 shadow-xl backdrop-blur ${
                placement === 'top' ? 'bottom-full mb-2' : 'mt-2'
              }`}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
                Settings
              </p>

              <label className="mb-3 block">
                <span className="mb-1 flex justify-between text-sm">
                  <span>Volume</span>
                  <span className="text-[var(--color-ink-soft)]">{Math.round(volume * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
              </label>

              <Row label="Mute all" value={muted} onChange={toggleMute} />
              <Row label="Reduced motion" value={reducedMotion} onChange={() => setReducedMotion(!reducedMotion)} />
              <Row label="Glow effects" value={bloom} onChange={() => setBloom(!bloom)} />

              <p className="mt-3 text-[10px] leading-snug text-[var(--color-ink-soft)]">
                Turn off glow / reduced motion for smoother play on low-end devices.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="mb-1.5 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm transition hover:bg-white/5"
    >
      <span>{label}</span>
      <span
        className={`flex h-5 w-9 items-center rounded-full px-0.5 transition ${
          value ? 'bg-[var(--color-accent)]' : 'bg-white/15'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition ${value ? 'translate-x-4' : ''}`}
        />
      </span>
    </button>
  );
}
