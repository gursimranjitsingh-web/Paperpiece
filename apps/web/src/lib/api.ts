'use client';

import { SERVER_URL } from './env';

/** Client-side types mirroring the server stats API responses. */
export interface MissionProgress {
  id: string;
  label: string;
  target: number;
  progress: number;
  completed: boolean;
}

export interface Profile {
  playerId: string;
  username: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForLevel: number;
  gamesPlayed: number;
  wins: number;
  kills: number;
  deaths: number;
  highestTerritory: number;
  kd: number;
  winRate: number;
  selectedSkin: string;
  missions: MissionProgress[];
}

export interface LeaderboardRow {
  rank: number;
  playerId: string;
  username: string;
  wins: number;
  kills: number;
  gamesPlayed: number;
  highestTerritory: number;
  rankPoints: number;
}

export interface PublicRoom {
  roomCode: string;
  players: number;
  playerLimit: number;
  mapSize: number;
  mode: string;
  theme: string;
}

export interface MatchHistoryRow {
  id: string;
  roomCode: string;
  mapSize: number;
  durationSeconds: number;
  createdAt: string;
  players: number;
  won: boolean;
  placement: number | null;
  kills: number;
  territoryPercent: number;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${SERVER_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const api = {
  leaderboard: () =>
    getJson<{ persisted: boolean; leaderboard: LeaderboardRow[] }>('/api/leaderboard'),
  profile: (playerId: string) => getJson<{ profile: Profile }>(`/api/profile/${playerId}`),
  matches: (playerId: string) =>
    getJson<{ matches: MatchHistoryRow[] }>(`/api/profile/${playerId}/matches`),
  publicRooms: () => getJson<{ rooms: PublicRoom[] }>('/api/rooms/public'),
};
