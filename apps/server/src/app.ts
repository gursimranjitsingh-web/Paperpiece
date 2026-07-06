import cors from 'cors';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsOrigins, env } from './config/env.js';
import { logger } from './config/logger.js';
import { healthRouter } from './routes/health.js';
import { roomsRouter } from './routes/rooms.js';
import { statsRouter } from './routes/stats.js';

/** Build the Express application (HTTP surface: health + future REST routes). */
export function createApp(): Application {
  const app = express();

  // Behind a platform proxy (Railway/Render/Fly) the real client IP is in
  // X-Forwarded-For. Trust it so rate limiting is PER USER — otherwise every
  // player shares one bucket (the proxy's IP) and a few players trip 429s.
  app.set('trust proxy', 1);

  app.disable('x-powered-by');
  // When also serving the web app (single-origin local mode), relax CSP/CORP so
  // the Next bundle, inline bootstrap, and external avatars load. The API-only
  // deploy keeps helmet's stricter defaults.
  app.use(
    helmet(
      env.STATIC_DIR
        ? { contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }
        : undefined,
    ),
  );
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.use('/api', healthRouter);
  // Rate-limit the read API to blunt scraping / abuse (health is exempt above).
  // Generous per-IP budget so normal polling (public rooms, profile) never trips.
  const readLimiter = rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', readLimiter, statsRouter);
  app.use('/api', readLimiter, roomsRouter);

  if (env.STATIC_DIR) {
    // Single-origin mode: serve the static web build (each route is a prebuilt
    // .html). Client uses same-origin, so no CORS and one tunnel suffices.
    app.use(express.static(env.STATIC_DIR, { extensions: ['html'], index: 'index.html' }));
  } else {
    app.get('/', (_req, res) => res.json({ name: 'paperpiece-server', status: 'running' }));
  }

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // Central error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err: err.message }, 'Unhandled HTTP error');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
