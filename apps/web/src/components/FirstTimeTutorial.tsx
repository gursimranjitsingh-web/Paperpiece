'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useProgressStore } from '@/stores/progressStore';

const STEPS = [
  {
    icon: '🎨',
    title: 'Claim ground',
    body: 'Leave your home zone to draw a glowing trail. Loop back into your territory to capture everything you enclosed.',
  },
  {
    icon: '⚔️',
    title: 'Cut your rivals',
    body: "Cross an enemy's trail while they're outside their zone to eliminate them — but if they cross yours first, you're out.",
  },
  {
    icon: '🕹️',
    title: 'Controls',
    body: 'Steer with WASD / arrow keys, or turn on mouse steering in room settings. Grab power-ups for shields, speed and more.',
  },
];

/**
 * One-time onboarding modal for brand-new players. Shows the core rules on the
 * first visit and never again (persisted via the progress store). Rendered on
 * the landing page.
 */
export function FirstTimeTutorial() {
  // Avoid SSR/hydration mismatch: only decide visibility after mount, once the
  // persisted store has rehydrated.
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const seen = useProgressStore((s) => s.tutorialSeen);
  const markSeen = useProgressStore((s) => s.markTutorialSeen);

  useEffect(() => setReady(true), []);

  const open = ready && !seen;
  if (!open) return null;

  const last = step === STEPS.length - 1;
  const s = STEPS[step]!;

  const close = (): void => markSeen();
  const next = (): void => {
    if (last) close();
    else setStep((n) => n + 1);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--color-canvas)] p-7 text-center shadow-2xl"
        >
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent)]/15 text-3xl">
            {s.icon}
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
            How to play · {step + 1}/{STEPS.length}
          </p>
          <h2 className="mt-1 text-2xl font-black">{s.title}</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{s.body}</p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={close}
              className="text-sm text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
            >
              Skip
            </button>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i === step ? 'bg-[var(--color-accent)]' : 'bg-white/20'}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-canvas)] transition hover:brightness-110"
            >
              {last ? "Let's play" : 'Next'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
