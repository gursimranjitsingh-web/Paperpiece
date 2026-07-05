import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
} from '../constants';

/** Clamp a number into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Generate a random room code (e.g. "AB7K2Q"). Uses an unambiguous alphabet
 * (no O/0, I/1). Callers must ensure uniqueness against active rooms.
 */
export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[idx];
  }
  return code;
}

/** Normalise and validate a room code entered by a user. Returns null if invalid. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  if (code.length !== ROOM_CODE_LENGTH) return null;
  for (const ch of code) {
    if (!ROOM_CODE_ALPHABET.includes(ch)) return null;
  }
  return code;
}

/** Trim and validate a username; returns a sanitized value or null. */
export function sanitizeUsername(input: string): string | null {
  const name = input.trim().replace(/\s+/g, ' ');
  if (name.length < MIN_USERNAME_LENGTH || name.length > MAX_USERNAME_LENGTH) return null;
  // Disallow control characters; allow letters, numbers, spaces, common punctuation.
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(name)) return null;
  return name;
}

/** Percentage (0-100) of the map a territory occupies, rounded to 1 decimal. */
export function territoryPercent(territorySize: number, totalCells: number): number {
  if (totalCells <= 0) return 0;
  return Math.round((territorySize / totalCells) * 1000) / 10;
}

/** A short, URL-safe random id (guest ids, powerup ids, etc.). */
export function shortId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rand}`;
}
