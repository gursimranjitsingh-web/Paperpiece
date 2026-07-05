import { type InferSchemaType, model, Schema } from 'mongoose';

/**
 * Optional persisted record of a room's existence for analytics. Live room and
 * game state live only in server memory — this collection never stores the
 * grid, trails, or player positions.
 */
const roomSchema = new Schema(
  {
    roomCode: { type: String, required: true, unique: true, index: true },
    hostId: { type: String, required: true },
    status: { type: String, required: true },
    settings: { type: Schema.Types.Mixed, required: true },
    // TTL: rooms auto-expire from this analytics collection after 24h.
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true },
);

roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RoomDocument = InferSchemaType<typeof roomSchema>;

export const RoomModel = model('Room', roomSchema);
