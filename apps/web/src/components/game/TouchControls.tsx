'use client';

import { Direction } from '@paperpiece/shared';

/** On-screen D-pad for touch devices; hidden on pointer-fine (desktop). */
export function TouchControls({ onDirection }: { onDirection: (dir: Direction) => void }) {
  const Btn = ({ dir, label, className }: { dir: Direction; label: string; className: string }) => (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onDirection(dir);
      }}
      className={`pointer-events-auto flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-black/40 text-xl text-[var(--color-ink)] backdrop-blur active:bg-white/20 ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="pointer-events-none absolute bottom-6 right-6 grid grid-cols-3 grid-rows-3 gap-1 [@media(pointer:fine)]:hidden">
      <Btn dir={Direction.Up} label="↑" className="col-start-2 row-start-1" />
      <Btn dir={Direction.Left} label="←" className="col-start-1 row-start-2" />
      <Btn dir={Direction.Right} label="→" className="col-start-3 row-start-2" />
      <Btn dir={Direction.Down} label="↓" className="col-start-2 row-start-3" />
    </div>
  );
}
