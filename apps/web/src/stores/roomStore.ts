'use client';

import { create } from 'zustand';
import type { RoomView } from '@paperpiece/shared';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

interface RoomState {
  connection: ConnectionStatus;
  room: RoomView | null;
  /** Round-trip latency to the server in ms (null until first ping). */
  pingMs: number | null;
  /** Countdown seconds while a match is starting (null otherwise). */
  countdown: number | null;

  setConnection: (status: ConnectionStatus) => void;
  setRoom: (room: RoomView | null) => void;
  setPing: (ms: number) => void;
  setCountdown: (seconds: number | null) => void;
  reset: () => void;
}

/** Client mirror of the authoritative room state pushed by the server. */
export const useRoomStore = create<RoomState>((set) => ({
  connection: 'idle',
  room: null,
  pingMs: null,
  countdown: null,
  setConnection: (connection) => set({ connection }),
  setRoom: (room) => set({ room }),
  setPing: (pingMs) => set({ pingMs }),
  setCountdown: (countdown) => set({ countdown }),
  reset: () => set({ room: null, countdown: null }),
}));
