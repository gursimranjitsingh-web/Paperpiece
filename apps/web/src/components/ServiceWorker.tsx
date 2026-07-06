'use client';

import { useEffect } from 'react';

/**
 * Registers the offline service worker once on the client. Kept out of the
 * critical path (fires after load) and silent on failure so it never blocks the
 * app. Skipped in development to avoid caching a stale dev bundle.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const register = (): void => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline support is best-effort */
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
