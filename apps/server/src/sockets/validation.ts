import { z } from 'zod';
import {
  AVATAR_MAX_LEN,
  GameMode,
  MapTheme,
  MAX_PLAYERS,
  MAX_USERNAME_LENGTH,
  MIN_PLAYERS,
  PlayerPattern,
  PlayerShape,
  ROOM_CODE_LENGTH,
} from '@paperpiece/shared';

/** Accept a remote http(s) URL or a small base64 image data-URL. */
const avatarString = z
  .string()
  .max(AVATAR_MAX_LEN)
  .refine(
    (v) => /^https?:\/\//.test(v) || /^data:image\/(png|jpeg|webp);base64,/.test(v),
    'invalid avatar',
  );

/**
 * Every socket payload is validated at the boundary. The server never trusts
 * client input — malformed packets are rejected before touching game state.
 * Enum/literal fields emit their narrowed types so they match RoomSettings.
 */

const settingsPatch = z
  .object({
    mapSize: z.union([z.literal(100), z.literal(200), z.literal(500)]),
    playerLimit: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS),
    spawnTerritorySize: z.union([z.literal(5), z.literal(8)]),
    respawnSeconds: z.number().int().min(0).max(30),
    matchDurationSeconds: z.number().int().min(0).max(3600),
    speedMultiplier: z.number().min(0.5).max(3),
    fogEnabled: z.boolean(),
    friendlyFire: z.boolean(),
    fillWithBots: z.boolean(),
    mode: z.nativeEnum(GameMode),
    isPublic: z.boolean(),
    theme: z.nativeEnum(MapTheme),
    mouseControl: z.boolean(),
  })
  .partial();

export const createRoomSchema = z.object({
  username: z.string().min(1).max(MAX_USERNAME_LENGTH),
  settings: settingsPatch.optional(),
});

export const joinRoomSchema = z.object({
  roomCode: z.string().length(ROOM_CODE_LENGTH),
  username: z.string().min(1).max(MAX_USERNAME_LENGTH),
});

export const updateSettingsSchema = z.object({ settings: settingsPatch });
export const setReadySchema = z.object({ ready: z.boolean() });
export const setColorSchema = z.object({ color: z.string().regex(/^#[0-9a-fA-F]{6}$/) });
export const setAvatarSchema = z.object({ avatar: avatarString });
export const setShapeSchema = z.object({ shape: z.nativeEnum(PlayerShape) });
export const setPatternSchema = z.object({ pattern: z.nativeEnum(PlayerPattern) });
export const setNicknameSchema = z.object({ username: z.string().min(1).max(MAX_USERNAME_LENGTH) });
export const kickPlayerSchema = z.object({ targetPlayerId: z.string().min(1).max(64) });

export const chatSchema = z.object({ text: z.string().min(1).max(300) });
export const emojiSchema = z.object({ emoji: z.string().min(1).max(16) });
