import { type InferSchemaType, model, Schema } from 'mongoose';

/** Per-player result within a completed match. */
const matchPlayerSchema = new Schema(
  {
    playerId: { type: String, required: true },
    username: { type: String, required: true },
    color: { type: String, required: true },
    isBot: { type: Boolean, default: false },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    highestTerritory: { type: Number, default: 0 },
    finalTerritoryPercent: { type: Number, default: 0 },
    placement: { type: Number, default: 0 },
  },
  { _id: false },
);

/** Immutable record of a finished match — the basis for history and stats. */
const matchSchema = new Schema(
  {
    roomCode: { type: String, required: true, index: true },
    mapSize: { type: Number, required: true },
    mode: { type: String, required: true },
    durationSeconds: { type: Number, required: true },
    winnerId: { type: String, default: null },
    players: { type: [matchPlayerSchema], default: [] },
    totalKills: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type MatchDocument = InferSchemaType<typeof matchSchema>;

export const Match = model('Match', matchSchema);
