import { EventEmitter } from 'node:events';
import {
  AVATAR_MAX_LEN,
  MAX_PLAYERS,
  PLAYER_COLORS,
  PlayerPattern,
  PlayerShape,
  RECONNECT_GRACE_MS,
  RoomStatus,
  STARTING_COUNTDOWN_SECONDS,
  defaultRoomSettings,
  generateRoomCode,
  sanitizeSettings,
  sanitizeUsername,
  type PlayerIdentity,
  type RoomMember,
  type RoomSettings,
  type RoomView,
} from '@paperpiece/shared';
import { logger } from '../config/logger.js';
import { RoomErrors } from './errors.js';

/** A room member as tracked in server memory (superset of the wire view). */
interface MemberInternal {
  playerId: string;
  username: string;
  color: string;
  avatar: string;
  shape: PlayerShape;
  pattern: PlayerPattern;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  connected: boolean;
  socketId: string | null;
  disconnectedAt: number | null;
}

/** A live room. Never persisted — this is authoritative in-memory state. */
interface Room {
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  members: Map<string, MemberInternal>;
  createdAt: number;
  /** Per-player reconnect eviction timers. */
  reconnectTimers: Map<string, NodeJS.Timeout>;
  /** Countdown interval while status === Starting. */
  countdownTimer: NodeJS.Timeout | null;
}

/** Strongly-typed events the service emits for the socket layer to broadcast. */
export interface RoomServiceEvents {
  'room:update': [roomCode: string];
  'room:closed': [roomCode: string];
  'player:joined': [roomCode: string, payload: { playerId: string; username: string }];
  'player:left': [roomCode: string, payload: { playerId: string; username: string }];
  countdown: [roomCode: string, secondsRemaining: number];
  'room:started': [roomCode: string];
}

/**
 * Owns the lifecycle of all lobby rooms. Pure in-memory (a `Map`), server
 * authoritative, and decoupled from the transport: it emits events that the
 * socket layer turns into broadcasts. This keeps room logic unit-testable and
 * transport-agnostic (SOLID: single responsibility + dependency inversion).
 */
export class RoomService extends EventEmitter<RoomServiceEvents> {
  private readonly rooms = new Map<string, Room>();

  /** Look up a room or throw. */
  private require(roomCode: string): Room {
    const room = this.rooms.get(roomCode);
    if (!room) throw RoomErrors.notFound();
    return room;
  }

  get(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  /** Public list of rooms flagged public and still in the lobby (matchmaking). */
  listPublic(): RoomView[] {
    return [...this.rooms.values()]
      .filter((r) => r.settings.isPublic && r.status === RoomStatus.Lobby)
      .map((r) => this.toView(r));
  }

  // ---- lifecycle ---------------------------------------------------------

  createRoom(identity: PlayerIdentity, patch: Partial<RoomSettings> | undefined): RoomView {
    const roomCode = this.uniqueCode();
    const username = sanitizeUsername(identity.username) ?? 'Host';
    const settings = sanitizeSettings(defaultRoomSettings(), patch);

    const room: Room = {
      roomCode,
      hostId: identity.playerId,
      status: RoomStatus.Lobby,
      settings,
      members: new Map(),
      createdAt: Date.now(),
      reconnectTimers: new Map(),
      countdownTimer: null,
    };
    room.members.set(identity.playerId, {
      playerId: identity.playerId,
      username,
      color: this.pickColor(room),
      avatar: identity.avatar ?? '',
      shape: identity.shape ?? PlayerShape.Round,
      pattern: identity.pattern ?? PlayerPattern.Solid,
      isHost: true,
      isReady: true, // the host is always "ready"
      isBot: false,
      connected: true,
      socketId: null,
      disconnectedAt: null,
    });
    this.rooms.set(roomCode, room);
    logger.info({ roomCode, host: identity.playerId }, 'room created');
    return this.toView(room);
  }

  joinRoom(roomCode: string, identity: PlayerIdentity, socketId: string): RoomView {
    const room = this.require(roomCode);

    const existing = room.members.get(identity.playerId);
    if (existing) {
      // Reconnect / re-join: refresh transport, cancel any eviction timer.
      this.cancelEviction(room, identity.playerId);
      existing.connected = true;
      existing.disconnectedAt = null;
      existing.socketId = socketId;
      this.emit('room:update', roomCode);
      return this.toView(room);
    }

    if (room.status !== RoomStatus.Lobby) throw RoomErrors.alreadyStarted();
    if (room.members.size >= room.settings.playerLimit || room.members.size >= MAX_PLAYERS) {
      throw RoomErrors.full();
    }

    const username = sanitizeUsername(identity.username) ?? `Player${room.members.size + 1}`;
    room.members.set(identity.playerId, {
      playerId: identity.playerId,
      username,
      color: this.pickColor(room),
      avatar: identity.avatar ?? '',
      shape: identity.shape ?? PlayerShape.Round,
      pattern: identity.pattern ?? PlayerPattern.Solid,
      isHost: false,
      isReady: false,
      isBot: false,
      connected: true,
      socketId,
      disconnectedAt: null,
    });
    logger.info({ roomCode, player: identity.playerId }, 'player joined');
    this.emit('player:joined', roomCode, { playerId: identity.playerId, username });
    this.emit('room:update', roomCode);
    return this.toView(room);
  }

  /** Fully remove a player (explicit leave or eviction). Handles host migration. */
  leaveRoom(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const member = room.members.get(playerId);
    if (!member) return;

    this.cancelEviction(room, playerId);
    room.members.delete(playerId);
    this.emit('player:left', roomCode, { playerId, username: member.username });
    logger.info({ roomCode, player: playerId }, 'player left');

    if (room.members.size === 0) {
      this.closeRoom(roomCode);
      return;
    }
    if (room.hostId === playerId) this.migrateHost(room);
    this.emit('room:update', roomCode);
  }

  /** Mark a player disconnected and schedule eviction after the grace window. */
  handleDisconnect(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    const member = room?.members.get(playerId);
    if (!room || !member) return;

    member.connected = false;
    member.disconnectedAt = Date.now();
    member.socketId = null;
    this.emit('room:update', roomCode);

    const timer = setTimeout(() => this.leaveRoom(roomCode, playerId), RECONNECT_GRACE_MS);
    room.reconnectTimers.set(playerId, timer);
  }

  // ---- lobby actions -----------------------------------------------------

  setReady(roomCode: string, playerId: string, ready: boolean): RoomView {
    const { room, member } = this.member(roomCode, playerId);
    if (!member.isHost) member.isReady = ready; // host stays ready
    this.emit('room:update', roomCode);
    return this.toView(room);
  }

  setColor(roomCode: string, playerId: string, color: string): RoomView {
    const { room, member } = this.member(roomCode, playerId);
    if (!PLAYER_COLORS.includes(color as (typeof PLAYER_COLORS)[number])) {
      throw RoomErrors.invalidInput('Unknown colour.');
    }
    const taken = [...room.members.values()].some((m) => m.playerId !== playerId && m.color === color);
    if (taken) throw RoomErrors.colorTaken();
    member.color = color;
    this.emit('room:update', roomCode);
    return this.toView(room);
  }

  setAvatar(roomCode: string, playerId: string, avatar: string): RoomView {
    const { room, member } = this.member(roomCode, playerId);
    member.avatar = avatar.slice(0, AVATAR_MAX_LEN);
    this.emit('room:update', roomCode);
    return this.toView(room);
  }

  setShape(roomCode: string, playerId: string, shape: PlayerShape): RoomView {
    const { room, member } = this.member(roomCode, playerId);
    member.shape = shape === PlayerShape.Square ? PlayerShape.Square : PlayerShape.Round;
    this.emit('room:update', roomCode);
    return this.toView(room);
  }

  setPattern(roomCode: string, playerId: string, pattern: PlayerPattern): RoomView {
    const { room, member } = this.member(roomCode, playerId);
    member.pattern = Object.values(PlayerPattern).includes(pattern) ? pattern : PlayerPattern.Solid;
    this.emit('room:update', roomCode);
    return this.toView(room);
  }

  setNickname(roomCode: string, playerId: string, username: string): RoomView {
    const { room, member } = this.member(roomCode, playerId);
    const clean = sanitizeUsername(username);
    if (!clean) throw RoomErrors.invalidInput('Invalid nickname.');
    member.username = clean;
    this.emit('room:update', roomCode);
    return this.toView(room);
  }

  updateSettings(roomCode: string, playerId: string, patch: Partial<RoomSettings>): RoomView {
    const room = this.require(roomCode);
    this.assertHost(room, playerId);
    if (room.status !== RoomStatus.Lobby) throw RoomErrors.alreadyStarted();
    room.settings = sanitizeSettings(room.settings, patch);
    // Trim members if the player limit was lowered below the current count.
    this.emit('room:update', roomCode);
    return this.toView(room);
  }

  kick(roomCode: string, playerId: string, targetId: string): RoomView {
    const room = this.require(roomCode);
    this.assertHost(room, playerId);
    if (!room.members.has(targetId)) throw RoomErrors.targetNotFound();
    if (targetId === playerId) throw RoomErrors.invalidInput('You cannot kick yourself.');
    this.leaveRoom(roomCode, targetId);
    return this.toView(this.require(roomCode));
  }

  /** Host starts the match: validate, then run the pre-game countdown. */
  startGame(roomCode: string, playerId: string): void {
    const room = this.require(roomCode);
    this.assertHost(room, playerId);
    if (room.status !== RoomStatus.Lobby) throw RoomErrors.alreadyStarted();

    const humans = [...room.members.values()].filter((m) => !m.isBot);
    if (humans.length < 1) throw RoomErrors.notEnoughPlayers();
    const everyoneReady = humans.every((m) => m.isReady);
    if (!everyoneReady) throw RoomErrors.notAllReady();

    room.status = RoomStatus.Starting;
    this.emit('room:update', roomCode);

    let remaining = STARTING_COUNTDOWN_SECONDS;
    this.emit('countdown', roomCode, remaining);
    room.countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        this.emit('countdown', roomCode, remaining);
        return;
      }
      this.clearCountdown(room);
      room.status = RoomStatus.Playing;
      this.emit('countdown', roomCode, 0);
      this.emit('room:update', roomCode);
      // Phase 3 listens for this to spin up the authoritative game loop.
      this.emit('room:started', roomCode);
      logger.info({ roomCode }, 'match started');
    }, 1000);
  }

  /** Mark a room's match as finished (called by the game manager on match end). */
  markFinished(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    room.status = RoomStatus.Finished;
    this.emit('room:update', roomCode);
  }

  /** Reset a finished room back to the lobby so players can rematch. */
  returnToLobby(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    room.status = RoomStatus.Lobby;
    for (const m of room.members.values()) m.isReady = m.isHost;
    this.emit('room:update', roomCode);
  }

  // ---- views & helpers ---------------------------------------------------

  toView(room: Room): RoomView {
    const members: RoomMember[] = [...room.members.values()].map((m) => ({
      id: m.playerId,
      username: m.username,
      color: m.color,
      avatar: m.avatar,
      shape: m.shape,
      pattern: m.pattern,
      isHost: m.isHost,
      isReady: m.isReady,
      isBot: m.isBot,
      connected: m.connected,
    }));
    return {
      roomCode: room.roomCode,
      hostId: room.hostId,
      status: room.status,
      settings: room.settings,
      members,
      createdAt: room.createdAt,
    };
  }

  private member(roomCode: string, playerId: string): { room: Room; member: MemberInternal } {
    const room = this.require(roomCode);
    const member = room.members.get(playerId);
    if (!member) throw RoomErrors.notInRoom();
    return { room, member };
  }

  private assertHost(room: Room, playerId: string): void {
    if (room.hostId !== playerId) throw RoomErrors.notHost();
  }

  private migrateHost(room: Room): void {
    const next =
      [...room.members.values()].find((m) => m.connected && !m.isBot) ??
      [...room.members.values()][0];
    if (!next) return;
    room.hostId = next.playerId;
    for (const m of room.members.values()) m.isHost = m.playerId === next.playerId;
    next.isReady = true;
    logger.info({ roomCode: room.roomCode, host: next.playerId }, 'host migrated');
  }

  private pickColor(room: Room): string {
    const used = new Set([...room.members.values()].map((m) => m.color));
    const free = PLAYER_COLORS.find((c) => !used.has(c));
    // Fall back to a deterministic cycle if the palette is exhausted.
    return free ?? PLAYER_COLORS[room.members.size % PLAYER_COLORS.length]!;
  }

  private uniqueCode(): string {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    return code;
  }

  private cancelEviction(room: Room, playerId: string): void {
    const timer = room.reconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      room.reconnectTimers.delete(playerId);
    }
  }

  private clearCountdown(room: Room): void {
    if (room.countdownTimer) {
      clearInterval(room.countdownTimer);
      room.countdownTimer = null;
    }
  }

  private closeRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    for (const t of room.reconnectTimers.values()) clearTimeout(t);
    this.clearCountdown(room);
    this.rooms.delete(roomCode);
    this.emit('room:closed', roomCode);
    logger.info({ roomCode }, 'room closed (empty)');
  }
}

/** Singleton — one authoritative room registry per server process. */
export const roomService = new RoomService();
