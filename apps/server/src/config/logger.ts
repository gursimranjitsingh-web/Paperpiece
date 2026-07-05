import { pino } from 'pino';
import { env, isProd } from './env.js';

/**
 * Structured logger. Pretty-printed in development, JSON in production so it can
 * be shipped to a log aggregator.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
