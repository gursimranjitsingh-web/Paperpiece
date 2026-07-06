import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { ServiceWorker } from '@/components/ServiceWorker';
import { Toasts } from '@/components/Toasts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Paperpiece — Territory Conquest',
  description:
    'A real-time, server-authoritative multiplayer territory-conquest game. Claim ground, cut off rivals, dominate the board.',
  applicationName: 'Paperpiece',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Paperpiece' },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
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
        <ServiceWorker />
      </body>
    </html>
  );
}
