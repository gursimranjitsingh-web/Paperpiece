'use client';

/**
 * Renders a player avatar image with a coloured ring. Falls back to an initial
 * on a coloured tile when no avatar is set (e.g. bots). Uses a plain <img> so no
 * remote-image domain config is needed.
 */
export function Avatar({
  src,
  name,
  color,
  size = 40,
  ring = true,
}: {
  src?: string;
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
}) {
  const style = {
    width: size,
    height: size,
    boxShadow: ring && color ? `0 0 0 2px ${color}` : undefined,
  } as const;

  if (!src) {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-full font-bold text-[var(--color-canvas)]"
        style={{ ...style, backgroundColor: color ?? '#9aa4bd', fontSize: size * 0.42 }}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-white/5 object-cover"
      style={style}
    />
  );
}
