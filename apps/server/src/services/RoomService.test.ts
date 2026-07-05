import { afterEach, describe, expect, it, vi } from 'vitest';
import { RoomStatus } from '@paperpiece/shared';
import { RoomService } from './RoomService.js';
import { RoomError } from './errors.js';

const host = { playerId: 'host', username: 'Hosty' };
const p2 = { playerId: 'p2', username: 'Bob' };
const p3 = { playerId: 'p3', username: 'Cara' };

function fresh(): RoomService {
  return new RoomService();
}

afterEach(() => vi.useRealTimers());

describe('RoomService', () => {
  it('creates a room with the host ready and assigns a code', () => {
    const svc = fresh();
    const view = svc.createRoom(host, undefined);
    expect(view.roomCode).toHaveLength(6);
    expect(view.hostId).toBe('host');
    expect(view.members).toHaveLength(1);
    expect(view.members[0]!.isHost).toBe(true);
    expect(view.members[0]!.isReady).toBe(true);
  });

  it('assigns distinct colours and enforces the player limit', () => {
    const svc = fresh();
    const { roomCode } = svc.createRoom(host, { playerLimit: 2 });
    const joined = svc.joinRoom(roomCode, p2, 'sock2');
    expect(joined.members).toHaveLength(2);
    expect(new Set(joined.members.map((m) => m.color)).size).toBe(2);

    expect(() => svc.joinRoom(roomCode, p3, 'sock3')).toThrowError(RoomError);
    try {
      svc.joinRoom(roomCode, p3, 'sock3');
    } catch (e) {
      expect((e as RoomError).code).toBe('ROOM_FULL');
    }
  });

  it('rejects a colour already taken', () => {
    const svc = fresh();
    const { roomCode } = svc.createRoom(host, undefined);
    svc.joinRoom(roomCode, p2, 'sock2');
    const hostColor = svc.toView(svc.get(roomCode)!).members.find((m) => m.id === 'host')!.color;
    expect(() => svc.setColor(roomCode, 'p2', hostColor)).toThrowError(/taken/i);
  });

  it('only the host can change settings and kick', () => {
    const svc = fresh();
    const { roomCode } = svc.createRoom(host, undefined);
    svc.joinRoom(roomCode, p2, 'sock2');

    expect(() => svc.updateSettings(roomCode, 'p2', { mapSize: 500 })).toThrowError(/host/i);
    const updated = svc.updateSettings(roomCode, 'host', { mapSize: 500 });
    expect(updated.settings.mapSize).toBe(500);

    expect(() => svc.kick(roomCode, 'p2', 'host')).toThrowError(/host/i);
    const afterKick = svc.kick(roomCode, 'host', 'p2');
    expect(afterKick.members).toHaveLength(1);
  });

  it('migrates the host when the host leaves', () => {
    const svc = fresh();
    const { roomCode } = svc.createRoom(host, undefined);
    svc.joinRoom(roomCode, p2, 'sock2');
    svc.leaveRoom(roomCode, 'host');
    const view = svc.toView(svc.get(roomCode)!);
    expect(view.hostId).toBe('p2');
    expect(view.members.find((m) => m.id === 'p2')!.isHost).toBe(true);
  });

  it('deletes the room when the last member leaves', () => {
    const svc = fresh();
    const { roomCode } = svc.createRoom(host, undefined);
    svc.leaveRoom(roomCode, 'host');
    expect(svc.get(roomCode)).toBeUndefined();
  });

  it('gates start on all players being ready, then counts down to PLAYING', () => {
    vi.useFakeTimers();
    const svc = fresh();
    const { roomCode } = svc.createRoom(host, undefined);
    svc.joinRoom(roomCode, p2, 'sock2');

    expect(() => svc.startGame(roomCode, 'host')).toThrowError(/ready/i);
    svc.setReady(roomCode, 'p2', true);

    let started = false;
    svc.on('room:started', () => (started = true));
    svc.startGame(roomCode, 'host');
    expect(svc.get(roomCode)!.status).toBe(RoomStatus.Starting);

    // Advance through the 3s countdown.
    vi.advanceTimersByTime(3100);
    expect(started).toBe(true);
    expect(svc.get(roomCode)!.status).toBe(RoomStatus.Playing);
  });
});
