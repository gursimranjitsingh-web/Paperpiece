/** Client-visible configuration. Only NEXT_PUBLIC_* vars reach the browser.
 *  A trailing slash is stripped so `${SERVER_URL}/api/...` never double-slashes. */
export const SERVER_URL = (
  process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000'
).replace(/\/+$/, '');
