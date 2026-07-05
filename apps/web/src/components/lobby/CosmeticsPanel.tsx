'use client';

import { useRef } from 'react';
import { PLAYER_COLORS, PlayerPattern, PlayerShape, type RoomMember } from '@paperpiece/shared';
import { AVATARS } from '@/lib/avatars';
import { cropImageToDataUrl } from '@/lib/imageCrop';
import { Avatar } from '@/components/Avatar';
import { toast } from '@/stores/toastStore';

interface Props {
  me: RoomMember | undefined;
  usedColors: Set<string>;
  onColor: (color: string) => void;
  onAvatar: (avatar: string) => void;
  onShape: (shape: PlayerShape) => void;
  onPattern: (pattern: PlayerPattern) => void;
}

const PATTERNS: { p: PlayerPattern; label: string; css: string }[] = [
  { p: PlayerPattern.Solid, label: 'Solid', css: 'currentColor' },
  {
    p: PlayerPattern.Stripes,
    label: 'Stripes',
    css: 'repeating-linear-gradient(45deg, currentColor 0 4px, transparent 4px 8px)',
  },
  {
    p: PlayerPattern.Dots,
    label: 'Dots',
    css: 'radial-gradient(currentColor 1.5px, transparent 2px) 0 0 / 6px 6px',
  },
  {
    p: PlayerPattern.Checker,
    label: 'Checker',
    css: 'conic-gradient(currentColor 90deg, transparent 90deg 180deg, currentColor 180deg 270deg, transparent 270deg) 0 0 / 8px 8px',
  },
  {
    p: PlayerPattern.Grid,
    label: 'Grid',
    css: 'repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 6px), repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 6px)',
  },
];

/** The "You" panel: avatar gallery, ball shape, and colour picker. */
export function CosmeticsPanel({ me, usedColors, onColor, onAvatar, onShape, onPattern }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onAvatar(await cropImageToDataUrl(file));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
        Appearance
      </h3>

      {/* Avatar gallery */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar src={me?.avatar} name={me?.username ?? '?'} color={me?.color} size={28} />
          <p className="text-xs text-[var(--color-ink-soft)]">Avatar</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs transition hover:bg-white/10"
        >
          ⬆ Upload photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      <div className="mb-4 grid grid-cols-8 gap-2 sm:grid-cols-8">
        {AVATARS.map((a) => {
          const active = me?.avatar === a;
          return (
            <button
              key={a}
              onClick={() => onAvatar(a)}
              className={`rounded-full transition hover:scale-110 ${
                active ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-canvas)]' : 'opacity-80'
              }`}
              aria-label="choose avatar"
            >
              <Avatar src={a} name="?" size={34} ring={false} />
            </button>
          );
        })}
      </div>

      {/* Shape */}
      <p className="mb-2 text-xs text-[var(--color-ink-soft)]">Ball shape</p>
      <div className="mb-4 flex gap-2">
        {(
          [
            { s: PlayerShape.Round, label: 'Round', icon: '●' },
            { s: PlayerShape.Square, label: 'Square', icon: '■' },
          ] as const
        ).map(({ s, label, icon }) => (
          <button
            key={s}
            onClick={() => onShape(s)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              me?.shape === s
                ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'border-white/10 bg-black/30 text-[var(--color-ink-soft)] hover:bg-white/5'
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Pattern */}
      <p className="mb-2 text-xs text-[var(--color-ink-soft)]">Territory pattern</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {PATTERNS.map(({ p, label, css }) => {
          const active = (me?.pattern ?? PlayerPattern.Solid) === p;
          return (
            <button
              key={p}
              onClick={() => onPattern(p)}
              title={label}
              className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 transition ${
                active ? 'border-[var(--color-accent)]/60 bg-white/10' : 'border-white/10 bg-black/30 hover:bg-white/5'
              }`}
            >
              <span
                className="h-8 w-8 rounded-md"
                style={{ color: me?.color ?? '#06d6a0', background: css, backgroundColor: 'rgba(255,255,255,0.04)' }}
              />
              <span className="text-[10px] text-[var(--color-ink-soft)]">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Colour */}
      <p className="mb-2 text-xs text-[var(--color-ink-soft)]">Colour</p>
      <div className="flex flex-wrap gap-2">
        {PLAYER_COLORS.map((c) => {
          const taken = usedColors.has(c);
          const mine = me?.color === c;
          return (
            <button
              key={c}
              disabled={taken && !mine}
              onClick={() => onColor(c)}
              style={{ backgroundColor: c }}
              className={`h-8 w-8 rounded-lg transition ${
                mine ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--color-canvas)]' : ''
              } ${taken && !mine ? 'cursor-not-allowed opacity-25' : 'hover:scale-110'}`}
              aria-label={`colour ${c}`}
            />
          );
        })}
      </div>
    </div>
  );
}
