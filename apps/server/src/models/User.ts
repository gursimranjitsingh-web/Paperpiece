import { type InferSchemaType, model, Schema } from 'mongoose';

/**
 * Persistent player account / profile. Guests are ephemeral and never written
 * here; only authenticated or claimed accounts are persisted.
 */
const userSchema = new Schema(
  {
    /** Stable client-generated (or authenticated) id — the identity key. */
    playerId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, trim: true, index: true },
    avatar: { type: String, default: null },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    kills: { type: Number, default: 0 },
    deaths: { type: Number, default: 0 },
    highestTerritory: { type: Number, default: 0 },
    totalTerritory: { type: Number, default: 0 },
    selectedSkin: { type: String, default: 'default' },
    ownedSkins: { type: [String], default: ['default'] },
    achievements: { type: [String], default: [] },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    /** Daily mission state (resets each UTC day). */
    missions: {
      type: {
        date: String,
        progress: { type: Schema.Types.Mixed, default: {} },
        completed: { type: [String], default: [] },
      },
      default: null,
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User = model('User', userSchema);
