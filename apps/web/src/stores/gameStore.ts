'use client';

import { create } from 'zustand';
import type { LeaderboardEntry, MatchResult, PlayerDiedEvent } from '@paperpiece/shared';

export interface KillFeedItem {
  id: number;
  text: string;
}

interface GameState {
  active: boolean;
  tick: number;
  leaderboard: LeaderboardEntry[];
  timeRemaining: number | null;
  aliveCount: number;
  playerCount: number;
  /** The local player's live leaderboard row (territory %, kills…). */
  me: LeaderboardEntry | null;
  killFeed: KillFeedItem[];
  result: MatchResult | null;

  /** Map dimensions (cells) — set from the initial snapshot. */
  width: number;
  height: number;
  /** Bumped on every server frame so the 3D trail layer can redraw at tick rate. */
  frame: number;
  /** Stable list of player ids; identity changes only when the roster changes. */
  playerIds: string[];

  setDims: (width: number, height: number) => void;
  bumpFrame: () => void;
  setPlayerIds: (ids: string[]) => void;
  startMatch: () => void;
  setHud: (data: {
    tick: number;
    /** Omitted on ticks that don't ship a leaderboard — the last one is kept. */
    leaderboard?: LeaderboardEntry[];
    timeRemaining: number | null;
    aliveCount: number;
    playerCount: number;
    playerId: string;
  }) => void;
  pushKill: (evt: PlayerDiedEvent, nameOf: (id: string | null) => string) => void;
  setResult: (result: MatchResult) => void;
  reset: () => void;
}

let killId = 1;

/** Reactive HUD state (leaderboard, timer, kill feed, result). Updated at 20 Hz;
 *  the heavy grid lives in the non-reactive gameBuffer. */
export const useGameStore = create<GameState>((set) => ({
  active: false,
  tick: 0,
  leaderboard: [],
  timeRemaining: null,
  aliveCount: 0,
  playerCount: 0,
  me: null,
  killFeed: [],
  result: null,
  width: 0,
  height: 0,
  frame: 0,
  playerIds: [],

  setDims: (width, height) => set({ width, height }),
  bumpFrame: () => set((s) => ({ frame: s.frame + 1 })),
  setPlayerIds: (ids) =>
    set((s) => (s.playerIds.join() === ids.join() ? s : { playerIds: ids })),
  startMatch: () => set({ active: true, result: null, killFeed: [] }),
  setHud: ({ tick, leaderboard, timeRemaining, aliveCount, playerCount, playerId }) =>
    set((s) => {
      const lb = leaderboard ?? s.leaderboard; // retain last when omitted
      return {
        tick,
        leaderboard: lb,
        timeRemaining,
        aliveCount,
        playerCount,
        me: lb.find((e) => e.playerId === playerId) ?? null,
      };
    }),
  pushKill: (evt, nameOf) => {
    const killer = nameOf(evt.killerId);
    const victim = nameOf(evt.victimId);
    const text = evt.killerId ? `${killer} cut down ${victim}` : `${victim} was eliminated`;
    set((s) => ({ killFeed: [...s.killFeed.slice(-5), { id: killId++, text }] }));
  },
  setResult: (result) => set({ result, active: false }),
  reset: () =>
    set({
      active: false,
      tick: 0,
      leaderboard: [],
      me: null,
      killFeed: [],
      result: null,
      width: 0,
      height: 0,
      frame: 0,
      playerIds: [],
    }),
}));
