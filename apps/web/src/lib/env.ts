/**
 * Client-visible server URL. Only NEXT_PUBLIC_* vars reach the browser.
 * - If NEXT_PUBLIC_SERVER_URL is set (Vercel/Railway), use it.
 * - Otherwise fall back to the SAME ORIGIN the page was served from — this is
 *   the single-origin local mode where the game server also serves the web
 *   build (one URL, no CORS). Trailing slash stripped so `${SERVER_URL}/api/...`
 *   never double-slashes.
 */
export const SERVER_URL = (
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')
).replace(/\/+$/, '');
