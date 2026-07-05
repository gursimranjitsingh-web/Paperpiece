import {
  MatchSimulation,
  chooseBotDirection,
  type SeedPlayer,
} from '@paperpiece/game-engine';
import {
  Direction,
  PLAYER_COLORS,
  SERVER_TICK_MS,
  SOCKET_ROOM_PREFIX,
  SocketEvent,
  directionToAngle,
  type GameStateSnapshot,
} from '@paperpiece/shared';
import { logger } from '../config/logger.js';
import { roomService } from './RoomService.js';
import { recordMatch } from './MatchService.js';
import type { AppServer } from '../sockets/types.js';

const roomKey = (code: string): string => `${SOCKET_ROOM_PREFIX}${code}`;

/** One running match: its simulation, tick timer, and bot roster. */
interface RunningMatch {
  sim: MatchSimulation;
  timer: NodeJS.Timeout;
  botIds: string[];
  mapSize: number;
  mode: string;
}

/**
 * Owns all live matches. On `room:started` it seeds a {@link MatchSimulation}
 * from the finished lobby roster (plus bots), runs the authoritative loop at
 * {@link SERVER_TICK_MS}, and broadcasts delta updates. The server is the sole
 * authority — clients only feed direction inputs.
 */
export class GameManager {
  private readonly matches = new Map<string, RunningMatch>();

  constructor(private readonly io: AppServer) {
    roomService.on('room:started', (code) => this.startMatch(code));
    roomService.on('player:left', (code, { playerId }) => this.matches.get(code)?.sim.removePlayer(playerId));
    roomService.on('room:closed', (code) => this.stopMatch(code));
  }

  /** Snapshot for a client joining or reconnecting to a live match. */
  snapshot(roomCode: string): GameStateSnapshot | null {
    const match = this.matches.get(roomCode);
    return match ? match.sim.snapshot(Date.now()) : null;
  }

  isRunning(roomCode: string): boolean {
    return this.matches.has(roomCode);
  }

  /** Apply a validated steering heading (radians) from a player. */
  input(roomCode: string, playerId: string, angle: number): void {
    this.matches.get(roomCode)?.sim.setInput(playerId, angle);
  }

  // ---- lifecycle ---------------------------------------------------------

  private startMatch(roomCode: string): void {
    if (this.matches.has(roomCode)) return;
    const room = roomService.get(roomCode);
    if (!room) return;
    const view = roomService.toView(room);

    const seeds: SeedPlayer[] = view.members.map((m) => ({
      id: m.id,
      username: m.username,
      color: m.color,
      isBot: m.isBot,
      shape: m.shape,
      pattern: m.pattern,
      avatar: m.avatar,
    }));

    // Optionally fill remaining slots with bots.
    const botIds: string[] = [];
    if (view.settings.fillWithBots) {
      const used = new Set(seeds.map((s) => s.color));
      let n = 1;
      while (seeds.length < view.settings.playerLimit) {
        const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[seeds.length % PLAYER_COLORS.length]!;
        used.add(color);
        const id = `bot_${roomCode}_${n}`;
        seeds.push({ id, username: `Bot ${n}`, color, isBot: true });
        botIds.push(id);
        n += 1;
      }
    }

    const now = Date.now();
    const sim = new MatchSimulation(roomCode, view.settings, seeds, now);
    const timer = setInterval(() => this.step(roomCode), SERVER_TICK_MS);
    this.matches.set(roomCode, { sim, timer, botIds, mapSize: view.settings.mapSize, mode: view.settings.mode });

    // Send the authoritative full snapshot so clients can build the board.
    this.io.to(roomKey(roomCode)).emit(SocketEvent.GameState, sim.snapshot(now));
    logger.info({ roomCode, players: seeds.length, bots: botIds.length }, 'match loop started');
  }

  private step(roomCode: string): void {
    const match = this.matches.get(roomCode);
    if (!match) return;
    const { sim, botIds } = match;

    // Bot decisions before the tick (cardinal choice → heading angle).
    for (const id of botIds) {
      const dir = chooseBotDirection(sim, id);
      if (dir !== Direction.None) sim.setInput(id, directionToAngle(dir));
    }

    const now = Date.now();
    const { delta, deaths, captures, result } = sim.tick(now);

    const room = roomKey(roomCode);
    this.io.to(room).emit(SocketEvent.GameDelta, delta);

    for (const d of deaths) this.io.to(room).emit(SocketEvent.PlayerDied, d);
    for (const c of captures) this.io.to(room).emit(SocketEvent.TerritoryUpdate, c);

    if (result) {
      this.io.to(room).emit(SocketEvent.MatchEnded, result);
      roomService.markFinished(roomCode);
      // Persist the match, stats, and ladder (best-effort; no-op without a DB).
      void recordMatch({
        roomCode,
        mapSize: match.mapSize,
        mode: match.mode,
        result,
        botIds: new Set(botIds),
      });
      this.stopMatch(roomCode);
      logger.info({ roomCode, winner: result.winnerId }, 'match ended');
    }
  }

  private stopMatch(roomCode: string): void {
    const match = this.matches.get(roomCode);
    if (!match) return;
    clearInterval(match.timer);
    this.matches.delete(roomCode);
  }
}

let manager: GameManager | null = null;

/** Initialise the singleton GameManager once the Socket.IO server exists. */
export function initGameManager(io: AppServer): GameManager {
  if (!manager) manager = new GameManager(io);
  return manager;
}

export function getGameManager(): GameManager | null {
  return manager;
}
