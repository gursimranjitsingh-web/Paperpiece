import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import {
  AVATAR_MAX_LEN,
  PlayerPattern,
  PlayerShape,
  SOCKET_ROOM_PREFIX,
  SocketEvent,
  sanitizeUsername,
  shortId,
  type PlayerIdentity,
} from '@paperpiece/shared';
import { corsOrigins } from '../config/env.js';
import { logger } from '../config/logger.js';
import { attachRedisAdapter } from '../config/redis.js';
import { roomService } from '../services/RoomService.js';
import { initGameManager } from '../services/GameManager.js';
import { registerRoomHandlers } from './room.socket.js';
import { registerGameHandlers } from './game.socket.js';
import { registerSocialHandlers } from './social.socket.js';
import type { AppServer, AppSocket } from './types.js';

const roomKey = (code: string): string => `${SOCKET_ROOM_PREFIX}${code}`;

/**
 * Create and configure the authoritative Socket.IO server, wire RoomService
 * broadcasts, and register per-connection handlers.
 */
export async function createSocketServer(httpServer: HttpServer): Promise<AppServer> {
  const io: AppServer = new Server(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    pingInterval: 10_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 1e5, // 100 KB; game inputs are tiny — reject oversized packets.
  });

  await attachRedisAdapter(io);
  bindRoomBroadcasts(io);
  initGameManager(io);

  // Authenticate/identify every socket during the handshake.
  io.use((socket, next) => {
    const auth = (socket.handshake.auth ?? {}) as Partial<PlayerIdentity>;
    const username = sanitizeUsername(auth.username ?? '') ?? 'Guest';
    socket.data.playerId = auth.playerId?.trim() || shortId('guest_');
    socket.data.username = username;
    socket.data.avatar = typeof auth.avatar === 'string' ? auth.avatar.slice(0, AVATAR_MAX_LEN) : '';
    socket.data.shape = auth.shape === PlayerShape.Square ? PlayerShape.Square : PlayerShape.Round;
    socket.data.pattern = Object.values(PlayerPattern).includes(auth.pattern as PlayerPattern)
      ? (auth.pattern as PlayerPattern)
      : PlayerPattern.Solid;
    socket.data.roomCode = null;
    next();
  });

  io.on('connection', (socket: AppSocket) => {
    logger.debug({ id: socket.id, player: socket.data.playerId }, 'socket connected');

    // Latency probe for RTT / clock-offset estimation.
    socket.on(SocketEvent.Ping, (_clientTime, ack) => {
      const now = Date.now();
      if (typeof ack === 'function') ack(now);
      socket.emit(SocketEvent.Pong, now);
    });

    registerRoomHandlers(socket);
    registerGameHandlers(socket);
    registerSocialHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.debug({ id: socket.id, reason }, 'socket disconnected');
      if (socket.data.roomCode) {
        roomService.handleDisconnect(socket.data.roomCode, socket.data.playerId);
      }
    });
  });

  return io;
}

/**
 * Translate RoomService domain events into Socket.IO broadcasts. Centralising
 * this keeps the room logic transport-agnostic and the broadcasting in one
 * place (single source of fan-out).
 */
function bindRoomBroadcasts(io: AppServer): void {
  roomService.on('room:update', (code) => {
    const room = roomService.get(code);
    if (room) io.to(roomKey(code)).emit(SocketEvent.RoomUpdate, roomService.toView(room));
  });

  roomService.on('player:joined', (code, payload) => {
    io.to(roomKey(code)).emit(SocketEvent.PlayerJoined, payload);
  });

  roomService.on('player:left', (code, payload) => {
    io.to(roomKey(code)).emit(SocketEvent.PlayerLeft, payload);
  });

  roomService.on('countdown', (code, seconds) => {
    io.to(roomKey(code)).emit(SocketEvent.Countdown, seconds);
  });

  // 'room:started' is consumed by the game manager in Phase 3 to create the
  // authoritative match loop; the Playing status is already broadcast via
  // 'room:update'.
}
