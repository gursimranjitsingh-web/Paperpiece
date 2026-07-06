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

  // Resolve the sender's authoritative name + colour from the room roster (the
  // socket's handshake username can be a stale "Guest" if they connected before
  // choosing a nickname).
  const sender = (): { username: string; color: string } => {
    const code = socket.data.roomCode;
    const member = code ? roomService.get(code)?.members.get(socket.data.playerId) : null;
    return {
      username: member?.username ?? socket.data.username,
      color: member?.color ?? '#9aa4bd',
    };
  };

  socket.on(SocketEvent.Chat, (payload) => {
    const code = socket.data.roomCode;
    if (!code || rateLimited()) return;
    const parsed = chatSchema.safeParse(payload);
    if (!parsed.success) return;
    const { username, color } = sender();
    io.to(roomKey(code)).emit(SocketEvent.Chat, {
      playerId: socket.data.playerId,
      username,
      color,
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
