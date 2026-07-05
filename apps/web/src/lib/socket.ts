'use client';

import { io, type Socket } from 'socket.io-client';
import type {
  Ack,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@paperpiece/shared';
import { SERVER_URL } from './env';

/** Fully-typed client socket. */
export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ClientSocket | null = null;

/**
 * Lazily create (or return) the singleton socket. Identity is sent in the
 * handshake `auth` so the server can recognise the player across reconnects.
 * Autoconnect is disabled; callers `connect()` once identity is known.
 */
export function getSocket(identity: {
  playerId: string;
  username: string;
  avatar?: string;
  shape?: string;
  pattern?: string;
}): ClientSocket {
  if (socket) {
    socket.auth = identity;
    return socket;
  }
  socket = io(SERVER_URL, {
    autoConnect: false,
    auth: identity,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}

/**
 * Promise wrapper around Socket.IO acknowledgements with a timeout, so callers
 * can `await` request/response events and handle typed {@link Ack} results.
 */
export function emitWithAck<TReq, TRes>(
  s: ClientSocket,
  event: string,
  payload: TReq,
  timeoutMs = 8000,
): Promise<Ack<TRes>> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: 'Request timed out.', code: 'TIMEOUT' });
    }, timeoutMs);

    // The typed emit signatures live on ClientToServerEvents; we bridge through
    // a loose cast here because event names are dynamic at this layer.
    (s.emit as (e: string, p: TReq, ack: (res: Ack<TRes>) => void) => void)(
      event,
      payload,
      (res: Ack<TRes>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      },
    );
  });
}
