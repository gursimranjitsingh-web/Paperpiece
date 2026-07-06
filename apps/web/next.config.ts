import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// STATIC_EXPORT=1 → build a static site (apps/web/out) that the game server can
// serve on the same origin (local single-URL hosting). Otherwise build the
// normal standalone/SSR output used by Vercel.
const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Consume workspace packages published as TypeScript source.
  transpilePackages: ['@paperpiece/shared', '@paperpiece/game-engine'],
  eslint: {
    // Lint is run explicitly via `turbo run lint`; don't block production builds.
    ignoreDuringBuilds: true,
  },
  ...(staticExport
    ? { output: 'export', images: { unoptimized: true } }
    : {
        output: 'standalone',
        outputFileTracingRoot: path.join(__dirname, '../../'),
      }),
};

export default nextConfig;
