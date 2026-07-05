/** Client-visible configuration. Only NEXT_PUBLIC_* vars reach the browser. */
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
