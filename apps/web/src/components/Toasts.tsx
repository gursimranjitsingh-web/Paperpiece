'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '@/stores/toastStore';

const KIND_STYLES: Record<string, string> = {
  info: 'border-white/15 bg-white/10 text-[var(--color-ink)]',
  success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
  error: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
};

/** Fixed, animated toast stack (bottom-right). */
export function Toasts() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-left text-sm shadow-lg backdrop-blur ${
              KIND_STYLES[t.kind] ?? KIND_STYLES.info
            }`}
          >
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
