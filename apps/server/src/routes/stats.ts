import { Router } from 'express';
import { isDatabaseConnected } from '../database/connection.js';
import { matchById, recentMatchesForPlayer, toHistoryRow } from '../services/MatchService.js';
import { getGlobalLeaderboard, getProfile } from '../services/UserService.js';

/**
 * Read-only stats API backing the profile, leaderboard, and history pages.
 * Every route degrades gracefully when MongoDB is offline (503 + empty data),
 * because live gameplay never depends on persistence.
 */
export const statsRouter = Router();

/** Guard: report persistence availability without failing the whole app. */
statsRouter.use((_req, res, next) => {
  res.setHeader('x-db', isDatabaseConnected() ? 'up' : 'down');
  next();
});

/** GET /api/leaderboard — global all-time ladder. */
statsRouter.get('/leaderboard', async (req, res) => {
  const limit = Number(req.query.limit ?? 50);
  const rows = await getGlobalLeaderboard(Number.isFinite(limit) ? limit : 50);
  res.json({ persisted: isDatabaseConnected(), leaderboard: rows });
});

/** GET /api/profile/:playerId — public profile + derived stats. */
statsRouter.get('/profile/:playerId', async (req, res) => {
  const profile = await getProfile(req.params.playerId);
  if (!profile) {
    return res
      .status(isDatabaseConnected() ? 404 : 503)
      .json({ error: isDatabaseConnected() ? 'Profile not found' : 'Persistence unavailable' });
  }
  res.json({ profile });
});

/** GET /api/profile/:playerId/matches — recent match history for a player. */
statsRouter.get('/profile/:playerId/matches', async (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  const matches = await recentMatchesForPlayer(req.params.playerId, Number.isFinite(limit) ? limit : 20);
  res.json({ matches: matches.map((m) => toHistoryRow(m, req.params.playerId)) });
});

/** GET /api/matches/:id — full detail for one match. */
statsRouter.get('/matches/:id', async (req, res) => {
  const match = await matchById(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json({ match });
});
