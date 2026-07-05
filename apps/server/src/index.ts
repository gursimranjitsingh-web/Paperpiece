import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { closeRedis } from './config/redis.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { createSocketServer } from './sockets/index.js';

/** Compose the HTTP + WebSocket server and start listening. */
async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  const httpServer = createServer(app);
  const io = await createSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 paperpiece-server listening on http://localhost:${env.PORT}`);
  });

  // Graceful shutdown — drain sockets, close DB/Redis, then exit.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down…');
    io.close();
    httpServer.close();
    await Promise.allSettled([disconnectDatabase(), closeRedis()]);
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
}

void bootstrap();
