import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Consume workspace packages published as TypeScript source.
  transpilePackages: ['@paperpiece/shared', '@paperpiece/game-engine'],
  // Produce a self-contained server bundle for a small Docker image.
  output: 'standalone',
  // In a monorepo, trace files from the repo root so workspace deps are included.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: {
    // Lint is run explicitly via `turbo run lint`; don't block production builds.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
