import { SOCKET_ROOM_PREFIX, SocketEvent } from '@paperpiece/shared';
import { roomService } from '../services/RoomService.js';
import type { AppServer, AppSocket } from './types.js';
import { chatSchema, emojiSchema } from './validation.js';

const roomKey = (code: string): string => `${SOCKET_ROOM_PREFIX}${code}`;

/**
 * Chat + emoji reactions, broadcast to everyone in the sender's room. Messages
 * are validated (length + shape) and rate-limited per socket to prevent spam.
 */
export function registerSocialHandlers(io: AppServer, socket: AppSocket): void {
  let windowStart = Date.now();
  let count = 0;
  const rateLimited = (): boolean => {
    const now = Date.now();
    if (now - windowStart > 5000) {
      windowStart = now;
      count = 0;
    }
    count += 1;
    return count > 15; // ~3 messages/sec sustained
  };

  const senderColor = (): string => {
    const code = socket.data.roomCode;
    if (!code) return '#9aa4bd';
    const room = roomService.get(code);
    return room?.members.get(socket.data.playerId)?.color ?? '#9aa4bd';
  };

  socket.on(SocketEvent.Chat, (payload) => {
    const code = socket.data.roomCode;
    if (!code || rateLimited()) return;
    const parsed = chatSchema.safeParse(payload);
    if (!parsed.success) return;
    io.to(roomKey(code)).emit(SocketEvent.Chat, {
      playerId: socket.data.playerId,
      username: socket.data.username,
      color: senderColor(),
      text: parsed.data.text,
      time: Date.now(),
    });
  });

  socket.on(SocketEvent.Emoji, (payload) => {
    const code = socket.data.roomCode;
    if (!code || rateLimited()) return;
    const parsed = emojiSchema.safeParse(payload);
    if (!parsed.success) return;
    io.to(roomKey(code)).emit(SocketEvent.Emoji, {
      playerId: socket.data.playerId,
      emoji: parsed.data.emoji,
      time: Date.now(),
    });
  });
}
