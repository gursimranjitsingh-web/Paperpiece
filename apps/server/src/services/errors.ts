/** Domain error carrying a stable machine-readable code for the client. */
export class RoomError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'RoomError';
    this.code = code;
  }
}

export const RoomErrors = {
  notFound: () => new RoomError('ROOM_NOT_FOUND', 'That room does not exist.'),
  full: () => new RoomError('ROOM_FULL', 'This room is full.'),
  notInRoom: () => new RoomError('NOT_IN_ROOM', 'You are not in a room.'),
  notHost: () => new RoomError('NOT_HOST', 'Only the host can do that.'),
  alreadyStarted: () => new RoomError('ALREADY_STARTED', 'The match has already started.'),
  notEnoughPlayers: () => new RoomError('NOT_ENOUGH_PLAYERS', 'Not enough players to start.'),
  notAllReady: () => new RoomError('NOT_ALL_READY', 'All players must be ready to start.'),
  invalidInput: (msg: string) => new RoomError('INVALID_INPUT', msg),
  colorTaken: () => new RoomError('COLOR_TAKEN', 'That colour is already taken.'),
  targetNotFound: () => new RoomError('TARGET_NOT_FOUND', 'That player is not in the room.'),
  rateLimited: () => new RoomError('RATE_LIMITED', 'Slow down — too many requests.'),
} as const;
