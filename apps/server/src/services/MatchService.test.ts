import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { MatchResult } from '@paperpiece/shared';

/**
 * Integration test for the persistence layer against a real (in-memory) MongoDB.
 * Modules are imported dynamically AFTER MONGODB_URI is pointed at the memory
 * server, so `connectDatabase()` picks up the right URI.
 */
let mongod: MongoMemoryServer;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let svc: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let users: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('paperpiece');
  db = await import('../database/connection.js');
  await db.connectDatabase();
  svc = await import('./MatchService.js');
  users = await import('./UserService.js');
}, 60_000);

afterAll(async () => {
  await db?.disconnectDatabase();
  await mongod?.stop();
});

function result(): MatchResult {
  return {
    roomCode: 'ABC123',
    winnerId: 'A',
    durationSeconds: 62,
    endedAt: Date.now(),
    leaderboard: [
      { rank: 1, playerId: 'A', username: 'Alice', color: '#06d6a0', territoryPercent: 41.2, territorySize: 4120, kills: 3, deaths: 0, alive: true },
      { rank: 2, playerId: 'bot_x', username: 'Bot 1', color: '#ef476f', territoryPercent: 8.1, territorySize: 810, kills: 0, deaths: 1, alive: false },
    ],
  };
}

describe('persistence: recordMatch → stats + leaderboard + history', () => {
  it('persists the match and rolls up human stats (bots excluded)', async () => {
    expect(db.isDatabaseConnected()).toBe(true);

    await svc.recordMatch({
      roomCode: 'ABC123',
      mapSize: 200,
      mode: 'FFA',
      result: result(),
      botIds: new Set(['bot_x']),
    });

    // Winner profile updated with derived stats.
    const profile = await users.getProfile('A');
    expect(profile).not.toBeNull();
    expect(profile.gamesPlayed).toBe(1);
    expect(profile.wins).toBe(1);
    expect(profile.kills).toBe(3);
    expect(profile.winRate).toBe(100);
    expect(profile.highestTerritory).toBe(4120);
    expect(profile.level).toBeGreaterThanOrEqual(1);

    // Bots are recorded in the match but never persisted as users.
    expect(await users.getProfile('bot_x')).toBeNull();

    // Global leaderboard contains the human, not the bot.
    const lb = await users.getGlobalLeaderboard();
    expect(lb.some((r: { playerId: string }) => r.playerId === 'A')).toBe(true);
    expect(lb.some((r: { playerId: string }) => r.playerId === 'bot_x')).toBe(false);

    // Match history for the player.
    const matches = await svc.recentMatchesForPlayer('A');
    expect(matches.length).toBe(1);
    expect(matches[0].winnerId).toBe('A');
    expect(matches[0].players.length).toBe(2);
  });

  it('aggregates a second match onto the same profile', async () => {
    await svc.recordMatch({
      roomCode: 'ABC124',
      mapSize: 200,
      mode: 'FFA',
      result: { ...result(), roomCode: 'ABC124', winnerId: 'bot_x' }, // A loses this one
      botIds: new Set(['bot_x']),
    });
    const profile = await users.getProfile('A');
    expect(profile.gamesPlayed).toBe(2);
    expect(profile.wins).toBe(1); // still only the first win
    expect(profile.winRate).toBe(50);
  });
});
