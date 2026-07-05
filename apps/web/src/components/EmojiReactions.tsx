'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useChatStore } from '@/stores/chatStore';

/** Emoji reactions that float up and fade — shown in the lobby and in-match. */
export function EmojiReactions() {
  const reactions = useChatStore((s) => s.reactions);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-30 flex justify-center">
      <div className="relative h-48 w-full max-w-md">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: -140, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, ease: 'easeOut' }}
              style={{ left: `${15 + ((r.id * 37) % 65)}%` }}
              className="absolute bottom-0 text-4xl drop-shadow-lg"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
