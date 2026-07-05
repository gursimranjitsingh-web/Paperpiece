import type { PlayerPattern, PlayerShape, PowerUpType } from './enums';
import type { RoomSettings } from './types/room';

/**
 * Data Transfer Objects: the exact payloads exchanged over Socket.IO. Kept
 * separate from domain types so the wire contract can evolve independently.
 */

/** Identity a client presents on every connection (guest or authenticated). */
export interface PlayerIdentity {
  /** Persisted user id, or a client-generated guest id. */
  playerId: string;
  username: string;
  /** Chosen avatar (image URL). */
  avatar?: string;
  /** Chosen board shape. */
  shape?: PlayerShape;
  /** Chosen territory fill pattern. */
  pattern?: PlayerPattern;
  /** Optional auth token; validated server-side when present. */
  token?: string;
}

export interface CreateRoomRequest {
  username: string;
  /** Partial settings; server fills defaults for anything omitted. */
  settings?: Partial<RoomSettings>;
}

export interface JoinRoomRequest {
  roomCode: string;
  username: string;
}

export interface UpdateSettingsRequest {
  settings: Partial<RoomSettings>;
}

export interface SetReadyRequest {
  ready: boolean;
}

export interface SetColorRequest {
  color: string;
}

export interface SetAvatarRequest {
  avatar: string;
}

export interface SetShapeRequest {
  shape: PlayerShape;
}

export interface SetPatternRequest {
  pattern: PlayerPattern;
}

export interface SetNicknameRequest {
  username: string;
}

export interface KickPlayerRequest {
  targetPlayerId: string;
}

/** The single input a client is allowed to send during play: a steering heading. */
export interface PlayerInputRequest {
  /** Desired movement heading in radians (free 360° steering). */
  angle: number;
  /** Monotonic client sequence number for reconciliation. */
  seq: number;
  /** Client timestamp (ms) for latency estimation. */
  clientTime: number;
}

export interface UsePowerUpRequest {
  type: PowerUpType;
}

export interface ChatMessageRequest {
  text: string;
}

export interface EmojiReactionRequest {
  emoji: string;
}

/** Generic acknowledgement wrapper for request/response socket calls. */
export type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/** Emitted to clients when a chat message is broadcast. */
export interface ChatMessage {
  playerId: string;
  username: string;
  color: string;
  text: string;
  time: number;
}

/** Emitted to clients when a player reacts with an emoji. */
export interface EmojiReaction {
  playerId: string;
  emoji: string;
  time: number;
}
