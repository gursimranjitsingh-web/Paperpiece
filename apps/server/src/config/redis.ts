import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server } from 'socket.io';
import { env } from './env.js';
import { logger } from './logger.js';

let pub: Redis | null = null;
let sub: Redis | null = null;

/**
 * When REDIS_URL is configured, attach the Socket.IO Redis adapter so multiple
 * server instances share rooms and broadcasts (horizontal scaling / Pub-Sub).
 * A no-op when Redis is not configured — single-node dev works unchanged.
 */
export async function attachRedisAdapter(io: Server): Promise<boolean> {
  if (!env.REDIS_URL) {
    logger.info('Redis not configured — running single-node (no cross-instance broadcast)');
    return false;
  }
  try {
    pub = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    io.adapter(createAdapter(pub, sub));
    logger.info('✅ Socket.IO Redis adapter attached');
    return true;
  } catch (err) {
    logger.error({ err: (err as Error).message }, '⚠️  Redis adapter failed — continuing single-node');
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  await Promise.allSettled([pub?.quit(), sub?.quit()]);
  pub = null;
  sub = null;
}
