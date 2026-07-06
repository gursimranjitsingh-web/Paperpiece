import type {
  Ack,
  ChatMessage,
  ChatMessageRequest,
  CreateRoomRequest,
  EmojiReaction,
  EmojiReactionRequest,
  JoinRoomRequest,
  KickPlayerRequest,
  PlayerInputRequest,
  SetAvatarRequest,
  SetColorRequest,
  SetNicknameRequest,
  SetPatternRequest,
  SetReadyRequest,
  SetShapeRequest,
  UpdateSettingsRequest,
  UsePowerUpRequest,
} from './dto';
import type {
  GameStateDelta,
  GameStateSnapshot,
  LeaderboardEntry,
  MatchResult,
  PlayerDiedEvent,
  TerritoryCapturedEvent,
} from './types/game';
import type { RoomView } from './types/room';
import type { PlayerPattern, PlayerShape } from './enums';

/**
 * Canonical event-name constants. Using a frozen map avoids string typos and
 * keeps names in sync between client and server.
 */
export const SocketEvent = {
  // room / lobby
  CreateRoom: 'create-room',
  JoinRoom: 'join-room',
  LeaveRoom: 'leave-room',
  UpdateSettings: 'update-settings',
  SetReady: 'player-ready',
  SetColor: 'set-color',
  SetAvatar: 'set-avatar',
  SetShape: 'set-shape',
  SetPattern: 'set-pattern',
  SetNickname: 'set-nickname',
  KickPlayer: 'kick-player',
  StartGame: 'start-game',
  Rematch: 'rematch',
  RoomUpdate: 'room-update',
  PlayerJoined: 'player-joined',
  PlayerLeft: 'player-left',

  // gameplay
  PlayerInput: 'player-input',
  UsePowerUp: 'use-powerup',
  /** Client asks the server to (re)send the full match snapshot. */
  RequestState: 'request-state',
  GameState: 'game-state',
  GameDelta: 'game-delta',
  TerritoryUpdate: 'territory-update',
  PlayerDied: 'player-died',
  ScoreUpdate: 'score-update',
  LeaderboardUpdate: 'leaderboard-update',
  Countdown: 'countdown',
  MatchEnded: 'match-ended',

  // social
  Chat: 'chat',
  Emoji: 'emoji',

  // connection / health
  Ping: 'ping',
  Pong: 'pong',
  ErrorMessage: 'error-message',
} as const;

export type SocketEventName = (typeof SocketEvent)[keyof typeof SocketEvent];

/**
 * Events the client may emit to the server. Request/response events take an
 * acknowledgement callback typed with {@link Ack}.
 */
export interface ClientToServerEvents {
  'create-room': (req: CreateRoomRequest, ack: (res: Ack<RoomView>) => void) => void;
  'join-room': (req: JoinRoomRequest, ack: (res: Ack<RoomView>) => void) => void;
  'leave-room': (ack?: (res: Ack<null>) => void) => void;
  'update-settings': (req: UpdateSettingsRequest, ack?: (res: Ack<RoomView>) => void) => void;
  'player-ready': (req: SetReadyRequest, ack?: (res: Ack<RoomView>) => void) => void;
  'set-color': (req: SetColorRequest, ack?: (res: Ack<RoomView>) => void) => void;
  'set-avatar': (req: SetAvatarRequest, ack?: (res: Ack<RoomView>) => void) => void;
  'set-shape': (req: SetShapeRequest, ack?: (res: Ack<RoomView>) => void) => void;
  'set-pattern': (req: SetPatternRequest, ack?: (res: Ack<RoomView>) => void) => void;
  'set-nickname': (req: SetNicknameRequest, ack?: (res: Ack<RoomView>) => void) => void;
  'kick-player': (req: KickPlayerRequest, ack?: (res: Ack<RoomView>) => void) => void;
  'start-game': (ack?: (res: Ack<null>) => void) => void;
  'rematch': (ack?: (res: Ack<RoomView>) => void) => void;

  'player-input': (req: PlayerInputRequest) => void;
  'use-powerup': (req: UsePowerUpRequest) => void;
  'request-state': (roomCode?: string) => void;

  chat: (req: ChatMessageRequest) => void;
  emoji: (req: EmojiReactionRequest) => void;

  ping: (clientTime: number, ack: (serverTime: number) => void) => void;
}

/** Events the server may emit to clients. */
export interface ServerToClientEvents {
  'room-update': (room: RoomView) => void;
  'player-joined': (payload: { playerId: string; username: string }) => void;
  'player-left': (payload: { playerId: string; username: string }) => void;

  'game-state': (snapshot: GameStateSnapshot) => void;
  'game-delta': (delta: GameStateDelta) => void;
  'territory-update': (payload: TerritoryCapturedEvent) => void;
  'player-died': (payload: PlayerDiedEvent) => void;
  'score-update': (payload: { playerId: string; score: number }) => void;
  'leaderboard-update': (leaderboard: LeaderboardEntry[]) => void;
  countdown: (secondsRemaining: number) => void;
  'match-ended': (result: MatchResult) => void;

  chat: (message: ChatMessage) => void;
  emoji: (reaction: EmojiReaction) => void;

  pong: (serverTime: number) => void;
  'error-message': (payload: { message: string; code?: string }) => void;
}

/** Events exchanged between server nodes (via the Redis adapter). */
export interface InterServerEvents {
  ping: () => void;
}

/** Per-socket data the server attaches after authentication. */
export interface SocketData {
  playerId: string;
  username: string;
  avatar: string;
  shape: PlayerShape;
  pattern: PlayerPattern;
  roomCode: string | null;
}
