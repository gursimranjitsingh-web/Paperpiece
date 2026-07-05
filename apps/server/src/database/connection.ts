import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let connected = false;

/**
 * Connect to MongoDB. Persistence is used only for users, matches, stats, and
 * leaderboards — never for live game state. The server can still run (in a
 * degraded, non-persistent mode) if the database is unavailable, so a failed
 * connection is logged rather than fatal.
 */
export async function connectDatabase(): Promise<boolean> {
  if (connected) return true;
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    connected = true;
    logger.info({ uri: redact(env.MONGODB_URI) }, '✅ MongoDB connected');

    mongoose.connection.on('disconnected', () => {
      connected = false;
      logger.warn('MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      connected = true;
      logger.info('MongoDB reconnected');
    });
    return true;
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      '⚠️  MongoDB connection failed — running without persistence',
    );
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

/** Hide credentials from a Mongo URI before logging it. */
function redact(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}
