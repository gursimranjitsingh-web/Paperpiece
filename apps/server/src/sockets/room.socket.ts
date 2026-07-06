import {
  SOCKET_ROOM_PREFIX,
  SocketEvent,
  normalizeRoomCode,
  type Ack,
  type PlayerIdentity,
  type RoomSettings,
  type RoomView,
} from '@paperpiece/shared';
import type { ZodSchema } from 'zod';
import { logger } from '../config/logger.js';
import { RoomError, RoomErrors } from '../services/errors.js';
import { roomService } from '../services/RoomService.js';
import { sendSnapshotIfLive } from './game.socket.js';
import type { AppSocket } from './types.js';
import {
  createRoomSchema,
  joinRoomSchema,
  kickPlayerSchema,
  setAvatarSchema,
  setColorSchema,
  setNicknameSchema,
  setPatternSchema,
  setReadySchema,
  setShapeSchema,
  updateSettingsSchema,
} from './validation.js';

/** Socket.IO room name for a game room code. */
const roomKey = (code: string): string => `${SOCKET_ROOM_PREFIX}${code}`;

/** Build a success / failure acknowledgement. */
const ok = <T>(data: T): Ack<T> => ({ ok: true, data });
const fail = (err: unknown): Ack<never> => {
  if (err instanceof RoomError) return { ok: false, error: err.message, code: err.code };
  logger.error({ err: (err as Error).message }, 'unexpected room handler error');
  return { ok: false, error: 'Something went wrong.', code: 'INTERNAL' };
};

/** Validate a payload with a zod schema, throwing a RoomError on failure. */
function parse<T>(schema: ZodSchema<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const first = result.error.issues[0];
    throw RoomErrors.invalidInput(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid input.');
  }
  return result.data;
}

const identityOf = (socket: AppSocket, username: string): PlayerIdentity => ({
  playerId: socket.data.playerId,
  username,
  avatar: socket.data.avatar,
  shape: socket.data.shape,
  pattern: socket.data.pattern,
});

/**
 * Register all lobby / room event handlers for a single connection. Actual
 * broadcasting is driven centrally by RoomService events (see index.ts); these
 * handlers validate input, mutate authoritative state, and manage the socket's
 * membership in the underlying Socket.IO room.
 */
/** Per-socket room-action rate limiter (anti-spam): ~30 actions / 10s. */
const rateState = new WeakMap<AppSocket, { windowStart: number; actions: number }>();
function checkRate(socket: AppSocket): void {
  const now = Date.now();
  let s = rateState.get(socket);
  if (!s || now - s.windowStart > 10_000) {
    s = { windowStart: now, actions: 0 };
    rateState.set(socket, s);
  }
  s.actions += 1;
  if (s.actions > 30) throw RoomErrors.rateLimited();
}

export function registerRoomHandlers(socket: AppSocket): void {
  const respond = <T>(ack: ((res: Ack<T>) => void) | undefined, res: Ack<T>): void => {
    if (typeof ack === 'function') ack(res);
  };

  socket.on(SocketEvent.CreateRoom, (payload, ack) => {
    try {
      checkRate(socket);
      const req = parse(createRoomSchema, payload);
      const view = roomService.createRoom(
        identityOf(socket, req.username),
        req.settings as Partial<RoomSettings> | undefined,
      );
      socket.data.username = req.username;
      joinSocketToRoom(socket, view);
      respond<RoomView>(ack, ok(view));
    } catch (err) {
      respond<RoomView>(ack, fail(err));
    }
  });

  socket.on(SocketEvent.JoinRoom, (payload, ack) => {
    try {
      checkRate(socket);
      const req = parse(joinRoomSchema, payload);
      const code = normalizeRoomCode(req.roomCode);
      if (!code) throw RoomErrors.invalidInput('Invalid room code.');
      // Join the transport room first so synchronous broadcasts reach us too.
      socket.join(roomKey(code));
      try {
        const view = roomService.joinRoom(code, identityOf(socket, req.username), socket.id);
        socket.data.roomCode = code;
        socket.data.username = req.username;
        respond<RoomView>(ack, ok(view));
        // If a match is already running (reconnect / late join), send the board.
        sendSnapshotIfLive(socket);
      } catch (inner) {
        socket.leave(roomKey(code));
        throw inner;
      }
    } catch (err) {
      respond<RoomView>(ack, fail(err));
    }
  });

  socket.on(SocketEvent.LeaveRoom, (ack) => {
    try {
      const code = socket.data.roomCode;
      if (code) {
        roomService.leaveRoom(code, socket.data.playerId);
        socket.leave(roomKey(code));
        socket.data.roomCode = null;
      }
      respond<null>(ack, ok(null));
    } catch (err) {
      respond<null>(ack, fail(err));
    }
  });

  socket.on(SocketEvent.SetReady, (payload, ack) => {
    withRoom(socket, ack, (code) => {
      const req = parse(setReadySchema, payload);
      return roomService.setReady(code, socket.data.playerId, req.ready);
    });
  });

  socket.on(SocketEvent.SetColor, (payload, ack) => {
    withRoom(socket, ack, (code) => {
      const req = parse(setColorSchema, payload);
      return roomService.setColor(code, socket.data.playerId, req.color);
    });
  });

  socket.on(SocketEvent.SetAvatar, (payload, ack) => {
    withRoom(socket, ack, (code) => {
      const req = parse(setAvatarSchema, payload);
      socket.data.avatar = req.avatar;
      return roomService.setAvatar(code, socket.data.playerId, req.avatar);
    });
  });

  socket.on(SocketEvent.SetShape, (payload, ack) => {
    withRoom(socket, ack, (code) => {
      const req = parse(setShapeSchema, payload);
      socket.data.shape = req.shape;
      return roomService.setShape(code, socket.data.playerId, req.shape);
    });
  });

  socket.on(SocketEvent.SetPattern, (payload, ack) => {
    withRoom(socket, ack, (code) => {
      const req = parse(setPatternSchema, payload);
      socket.data.pattern = req.pattern;
      return roomService.setPattern(code, socket.data.playerId, req.pattern);
    });
  });

  socket.on(SocketEvent.SetNickname, (payload, ack) => {
    withRoom(socket, ack, (code) => {
      const req = parse(setNicknameSchema, payload);
      const view = roomService.setNickname(code, socket.data.playerId, req.username);
      socket.data.username = req.username;
      return view;
    });
  });

  socket.on(SocketEvent.UpdateSettings, (payload, ack) => {
    withRoom(socket, ack, (code) => {
      const req = parse(updateSettingsSchema, payload);
      return roomService.updateSettings(code, socket.data.playerId, req.settings as Partial<RoomSettings>);
    });
  });

  socket.on(SocketEvent.KickPlayer, (payload, ack) => {
    withRoom(socket, ack, (code) => {
      const req = parse(kickPlayerSchema, payload);
      return roomService.kick(code, socket.data.playerId, req.targetPlayerId);
    });
  });

  socket.on(SocketEvent.StartGame, (ack) => {
    try {
      checkRate(socket);
      const code = socket.data.roomCode;
      if (!code) throw RoomErrors.notInRoom();
      roomService.startGame(code, socket.data.playerId);
      respond<null>(ack, ok(null));
    } catch (err) {
      respond<null>(ack, fail(err));
    }
  });

  // Host restarts a finished match: reset the room back to the lobby.
  socket.on(SocketEvent.Rematch, (ack) => {
    withRoom(socket, ack, (code) => {
      const room = roomService.get(code);
      if (!room) throw RoomErrors.notFound();
      if (room.hostId !== socket.data.playerId) throw RoomErrors.notHost();
      roomService.returnToLobby(code);
      return roomService.toView(room);
    });
  });
}

/** Add the socket to the transport room and record it on the socket. */
function joinSocketToRoom(socket: AppSocket, view: RoomView): void {
  socket.join(roomKey(view.roomCode));
  socket.data.roomCode = view.roomCode;
}

/** Shared wrapper for actions that require the socket to be in a room. */
function withRoom(
  socket: AppSocket,
  ack: ((res: Ack<RoomView>) => void) | undefined,
  fn: (roomCode: string) => RoomView,
): void {
  try {
    checkRate(socket);
    const code = socket.data.roomCode;
    if (!code) throw RoomErrors.notInRoom();
    const view = fn(code);
    if (typeof ack === 'function') ack(ok(view));
  } catch (err) {
    if (typeof ack === 'function') ack(fail(err));
  }
}
