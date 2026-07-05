import { Suspense } from 'react';
import { LobbyClient } from '@/components/lobby/LobbyClient';

/** Lobby route — real room system (create/join, roster, ready, host controls). */
export default function LobbyPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-[var(--color-ink-soft)]">Loading lobby…</div>}>
      <LobbyClient />
    </Suspense>
  );
}
