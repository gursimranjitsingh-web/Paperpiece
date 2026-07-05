'use client';

import { useSoundStore } from '@/stores/soundStore';

/** Small speaker toggle for muting all game audio. */
export function MuteButton({ className = '' }: { className?: string }) {
  const muted = useSoundStore((s) => s.muted);
  const toggle = useSoundStore((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Unmute' : 'Mute'}
      title={muted ? 'Unmute' : 'Mute'}
      className={`grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/40 text-[var(--color-ink)] backdrop-blur transition hover:bg-white/10 ${className}`}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
