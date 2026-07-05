/**
 * Avatar catalogue. Uses DiceBear (https://www.dicebear.com) — free,
 * open-source, procedurally generated cartoon avatars served as SVG over a
 * public API, so no copyrighted art is bundled or copied. Each entry is a
 * distinct style + seed for visual variety.
 */
const DICEBEAR = 'https://api.dicebear.com/9.x';

interface AvatarSpec {
  style: string;
  seed: string;
}

const SPECS: AvatarSpec[] = [
  { style: 'adventurer', seed: 'Comet' },
  { style: 'adventurer', seed: 'Nova' },
  { style: 'bottts', seed: 'Volt' },
  { style: 'bottts', seed: 'Rusty' },
  { style: 'fun-emoji', seed: 'Sunny' },
  { style: 'fun-emoji', seed: 'Zappy' },
  { style: 'thumbs', seed: 'Ace' },
  { style: 'big-smile', seed: 'Milo' },
  { style: 'big-smile', seed: 'Pixie' },
  { style: 'micah', seed: 'Kai' },
  { style: 'open-peeps', seed: 'Juno' },
  { style: 'lorelei', seed: 'Wren' },
  { style: 'notionists', seed: 'Bolt' },
  { style: 'personas', seed: 'Echo' },
  { style: 'miniavs', seed: 'Ziggy' },
];

/** Build the avatar URL for a spec (SVG, transparent background). */
function url(spec: AvatarSpec): string {
  return `${DICEBEAR}/${spec.style}/svg?seed=${encodeURIComponent(spec.seed)}&backgroundType=gradientLinear&radius=20`;
}

/** The selectable avatar gallery (stable order). */
export const AVATARS: string[] = SPECS.map(url);

/** The default avatar for a brand-new player. */
export const DEFAULT_AVATAR = AVATARS[0]!;
