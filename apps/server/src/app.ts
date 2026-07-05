import cors from 'cors';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import { healthRouter } from './routes/health.js';
import { roomsRouter } from './routes/rooms.js';
import { statsRouter } from './routes/stats.js';

/** Build the Express application (HTTP surface: health + future REST routes). */
export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '64kb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.use('/api', healthRouter);
  // Rate-limit the read API to blunt scraping / abuse (health is exempt above).
  const readLimiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', readLimiter, statsRouter);
  app.use('/api', readLimiter, roomsRouter);
  app.get('/', (_req, res) => res.json({ name: 'paperpiece-server', status: 'running' }));

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
