import { Router } from 'express';
import { roomService } from '../services/RoomService.js';

/** Public matchmaking: list joinable public rooms still in the lobby. */
export const roomsRouter = Router();

roomsRouter.get('/rooms/public', (_req, res) => {
  const rooms = roomService.listPublic().map((r) => ({
    roomCode: r.roomCode,
    players: r.members.length,
    playerLimit: r.settings.playerLimit,
    mapSize: r.settings.mapSize,
    mode: r.settings.mode,
    theme: r.settings.theme,
  }));
  res.json({ rooms });
});
