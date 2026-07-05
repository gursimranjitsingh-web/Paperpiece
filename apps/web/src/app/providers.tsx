'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import { useSoundStore } from '@/stores/soundStore';

/** App-wide client providers (data cache + audio bootstrap). */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useSoundStore.getState().init();
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
