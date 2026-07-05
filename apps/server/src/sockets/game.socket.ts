import { SocketEvent, type PlayerInputRequest } from '@paperpiece/shared';
import { getGameManager } from '../services/GameManager.js';
import type { AppSocket } from './types.js';

/** Anti-spam: cap accepted inputs per socket. Movement speed is server-owned, so
 *  extra inputs can never make a player move faster — this just bounds abuse.
 *  Mouse steering emits frequently, so allow a generous window. */
const MAX_INPUTS_PER_WINDOW = 120;
const WINDOW_MS = 1000;

/**
 * Register gameplay handlers for a connection. The only gameplay input a client
 * may send is a direction; everything else (movement, collision, capture) is
 * decided by the server. Every payload is validated.
 */
export function registerGameHandlers(socket: AppSocket): void {
  let windowStart = Date.now();
  let countInWindow = 0;

  const rateLimited = (): boolean => {
    const now = Date.now();
    if (now - windowStart > WINDOW_MS) {
      windowStart = now;
      countInWindow = 0;
    }
    countInWindow += 1;
    return countInWindow > MAX_INPUTS_PER_WINDOW;
  };

  socket.on(SocketEvent.PlayerInput, (req: PlayerInputRequest) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    if (!req || typeof req !== 'object') return;
    if (typeof req.angle !== 'number' || !Number.isFinite(req.angle)) return; // reject junk
    if (rateLimited()) return;

    getGameManager()?.input(roomCode, socket.data.playerId, req.angle);
  });

  // Client (re)requests the full snapshot — used to recover from the
  // snapshot/navigation race when entering a match.
  socket.on(SocketEvent.RequestState, () => sendSnapshotIfLive(socket));
}

/** Send the current match snapshot to a socket if a match is live (reconnect). */
export function sendSnapshotIfLive(socket: AppSocket): void {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;
  const snap = getGameManager()?.snapshot(roomCode);
  if (snap) socket.emit(SocketEvent.GameState, snap);
}
