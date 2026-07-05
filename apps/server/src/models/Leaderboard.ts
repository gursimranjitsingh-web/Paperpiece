import { type InferSchemaType, model, Schema } from 'mongoose';

/**
 * Global, all-time leaderboard aggregate — one row per player, updated after
 * each match. Distinct from the in-match live leaderboard (memory only).
 */
const leaderboardSchema = new Schema(
  {
    playerId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    wins: { type: Number, default: 0, index: true },
    kills: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    highestTerritory: { type: Number, default: 0, index: true },
    rankPoints: { type: Number, default: 1000, index: true },
  },
  { timestamps: true },
);

export type LeaderboardDocument = InferSchemaType<typeof leaderboardSchema>;

export const Leaderboard = model('Leaderboard', leaderboardSchema);
