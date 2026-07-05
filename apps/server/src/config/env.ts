import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Load .env from the app directory AND the monorepo root (dev runs with cwd set
// to apps/server, but the .env lives at the repo root). Docker injects env vars
// directly, so a missing file here is harmless. Existing process.env wins.
loadDotenv({
  path: [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../../.env'),
  ],
});

/**
 * Validated, typed environment. The process refuses to start with an invalid
 * configuration — fail fast rather than misbehave at runtime.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/paperpiece'),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env: Env = parsed.data;

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

/**
 * Allowed CORS origins (comma-separated list supported). Trailing slashes are
 * stripped because browsers send the `Origin` header without one — a stray
 * slash in CORS_ORIGIN would otherwise fail every cross-origin request.
 */
export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
