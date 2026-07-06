'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { useSoundStore } from '@/stores/soundStore';
import { useSettingsStore } from '@/stores/settingsStore';

/** App-wide client providers (data cache + audio/settings bootstrap). */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useSoundStore.getState().init();
    useSettingsStore.getState().apply();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
