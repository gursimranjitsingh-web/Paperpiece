import { Router } from 'express';
import { isDatabaseConnected } from '../database/connection.js';

/** Liveness / readiness endpoints for load balancers and Docker health checks. */
export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), time: Date.now() });
});

healthRouter.get('/ready', (_req, res) => {
  const db = isDatabaseConnected();
  // The game runs without the DB, so readiness is "ok" but reports DB state.
  res.json({ status: 'ok', database: db ? 'connected' : 'disconnected' });
});
