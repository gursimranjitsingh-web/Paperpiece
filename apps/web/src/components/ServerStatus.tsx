'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { SERVER_URL } from '@/lib/env';

interface HealthResponse {
  status: string;
  uptime: number;
}

/** Live indicator that the game server is reachable — proves the wiring works. */
export function ServerStatus() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ['server-health'],
    queryFn: async (): Promise<HealthResponse> => {
      const res = await fetch(`${SERVER_URL}/api/health`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return res.json() as Promise<HealthResponse>;
    },
    refetchInterval: 5000,
  });

  const online = !isError && !isLoading && data?.status === 'ok';
  const label = isLoading ? 'Connecting…' : online ? 'Server online' : 'Server offline';
  const color = online ? 'var(--color-accent)' : isLoading ? 'var(--color-ink-soft)' : 'var(--color-danger)';

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[var(--color-ink-soft)]">
      <motion.span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
        animate={online ? { scale: [1, 1.35, 1], opacity: [1, 0.6, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.6 }}
      />
      <span>{label}</span>
    </div>
  );
}
