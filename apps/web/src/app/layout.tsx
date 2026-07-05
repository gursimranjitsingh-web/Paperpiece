import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { Toasts } from '@/components/Toasts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Paperpiece — Territory Conquest',
  description:
    'A real-time, server-authoritative multiplayer territory-conquest game. Claim ground, cut off rivals, dominate the board.',
  applicationName: 'Paperpiece',
};

export const viewport: Viewport = {
  themeColor: '#0b0f1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
        <Toasts />
      </body>
    </html>
  );
}
