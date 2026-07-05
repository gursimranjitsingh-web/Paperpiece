'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  SocketEvent,
  type GameStateDelta,
  type GameStateSnapshot,
  type MatchResult,
  type PlayerDiedEvent,
} from '@paperpiece/shared';
import { getSocket } from '@/lib/socket';
import { gameBuffer } from '@/lib/gameBuffer';
import { fx } from '@/lib/fx';
import { sound } from '@/lib/sound';
import { spectator } from '@/lib/spectator';
import { replay } from '@/lib/replay';
import { useGameStore } from '@/stores/gameStore';
import { identityAuth, useIdentityStore } from '@/stores/identityStore';
import { useRoomStore } from '@/stores/roomStore';

/** Movement keys → unit vectors (y is DOWN, matching grid/screen space). */
const KEY_VECTORS: Record<string, [number, number]> = {
  arrowup: [0, -1],
  arrowdown: [0, 1],
  arrowleft: [-1, 0],
  arrowright: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

/**
 * Subscribes to authoritative match events, mirrors them into the game buffer
 * (grid) and HUD store, and sends the only permitted input: direction. Movement
 * is fully server-decided; we merely forward intent.
 */
export function useGame() {
  const playerId = useIdentityStore((s) => s.playerId);
  const seqRef = useRef(0);
  const lastAngleRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

  const nameOf = useCallback(
    (id: string | null): string => (id ? (gameBuffer.players.get(id)?.username ?? 'Player') : 'Player'),
    [],
  );

  useEffect(() => {
    const id = useIdentityStore.getState();
    const socket = getSocket(identityAuth());
    const store = useGameStore.getState();

    const updateHud = (payload: {
      tick: number;
      leaderboard: GameStateDelta['leaderboard'];
      timeRemaining: number | null | undefined;
      players: GameStateSnapshot['players'];
    }): void => {
      const gs = useGameStore.getState();
      gs.setHud({
        tick: payload.tick,
        leaderboard: payload.leaderboard, // undefined → store keeps its last copy
        timeRemaining: payload.timeRemaining ?? null,
        aliveCount: payload.players.filter((p) => p.alive).length,
        playerCount: payload.players.length,
        playerId: id.playerId,
      });
      gs.setPlayerIds(payload.players.map((p) => p.id));
      gs.bumpFrame();
    };

    let announced = false;
    const onState = (snap: GameStateSnapshot): void => {
      gameBuffer.setSnapshot(snap);
      store.startMatch();
      useGameStore.getState().setDims(snap.width, snap.height);
      if (!announced) {
        announced = true;
        sound.play('start');
        sound.startMusic();
        replay.start();
      }
      replay.recordSnapshot(snap);
      updateHud({
        tick: snap.tick,
        leaderboard: snap.leaderboard,
        timeRemaining: snap.timeRemaining,
        players: snap.players,
      });
    };
    let prevPowerCount = 0;
    const onDelta = (delta: GameStateDelta): void => {
      gameBuffer.applyDelta(delta);
      replay.recordDelta(delta);
      // Detect the local player picking up a power-up (active count grew).
      const mine = gameBuffer.players.get(id.playerId)?.activePowerUps.length ?? 0;
      if (mine > prevPowerCount) sound.play('powerup');
      prevPowerCount = mine;
      updateHud({
        tick: delta.tick,
        leaderboard: delta.leaderboard,
        timeRemaining: delta.timeRemaining,
        players: delta.players,
      });
    };
    const onDied = (evt: PlayerDiedEvent): void => {
      useGameStore.getState().pushKill(evt, nameOf);
      // Particle burst at the victim's last position.
      const victim = gameBuffer.players.get(evt.victimId);
      if (victim) fx.burst(victim.position.x, victim.position.y, victim.color, 26, 8);
      if (evt.victimId === id.playerId) {
        lastAngleRef.current = null;
        sound.play('death');
        fx.shake(1.4);
      } else if (evt.killerId === id.playerId) {
        sound.play('kill');
        fx.shake(0.6);
      }
    };
    const onCapture = (evt: { playerId: string }): void => {
      const p = gameBuffer.players.get(evt.playerId);
      if (p) fx.burst(p.position.x, p.position.y, p.color, 10, 4);
      if (evt.playerId === id.playerId) {
        sound.play('capture');
        fx.shake(0.25);
      }
    };
    const onEnded = (result: MatchResult): void => {
      useGameStore.getState().setResult(result);
      replay.stop();
      sound.stopMusic();
      sound.play('win');
    };

    socket.on(SocketEvent.GameState, onState);
    socket.on(SocketEvent.GameDelta, onDelta);
    socket.on(SocketEvent.PlayerDied, onDied);
    socket.on(SocketEvent.TerritoryUpdate, onCapture);
    socket.on(SocketEvent.MatchEnded, onEnded);
    if (!socket.connected) socket.connect();

    // Request the full board snapshot on mount and KEEP retrying until it
    // arrives (active === true). This closes the snapshot/navigation race where
    // we start receiving deltas before the initial snapshot — otherwise the
    // board never builds and we're stuck on "Connecting to match…". The retry
    // also covers the case where our request beats the server creating the match.
    const requestSnapshot = (): void => {
      socket.emit(SocketEvent.RequestState);
    };
    const kick = (): void => requestSnapshot();
    if (socket.connected) kick();
    else socket.once('connect', kick);

    let resyncTries = 0;
    const resyncTimer = setInterval(() => {
      if (useGameStore.getState().active || resyncTries > 20) {
        clearInterval(resyncTimer);
        return;
      }
      resyncTries += 1;
      if (socket.connected) requestSnapshot();
    }, 500);

    // Keep latency fresh while in the match (the lobby ping loop is unmounted).
    const pingTimer = setInterval(() => {
      if (!socket.connected) return;
      const t0 = Date.now();
      socket.emit(SocketEvent.Ping, t0, () => useRoomStore.getState().setPing(Date.now() - t0));
    }, 3000);

    return () => {
      clearInterval(pingTimer);
      clearInterval(resyncTimer);
      sound.stopMusic();
      fx.reset();
      socket.off('connect', kick);
      socket.off(SocketEvent.GameState, onState);
      socket.off(SocketEvent.GameDelta, onDelta);
      socket.off(SocketEvent.PlayerDied, onDied);
      socket.off(SocketEvent.TerritoryUpdate, onCapture);
      socket.off(SocketEvent.MatchEnded, onEnded);
    };
  }, [nameOf]);

  /** Emit a steering heading (radians). Deduped by angle delta + throttled so
   *  smooth mouse motion produces smooth curves without flooding the socket. */
  const sendAngle = useCallback((angle: number): void => {
    const now = Date.now();
    const last = lastAngleRef.current;
    const delta = last === null ? Infinity : Math.abs(Math.atan2(Math.sin(angle - last), Math.cos(angle - last)));
    if (delta < 0.05 && now - lastSentRef.current < 100) return; // negligible change
    if (now - lastSentRef.current < 33) return; // ~30 Hz cap
    lastAngleRef.current = angle;
    lastSentRef.current = now;
    seqRef.current += 1;
    getSocket(identityAuth()).emit(SocketEvent.PlayerInput, {
      angle,
      seq: seqRef.current,
      clientTime: now,
    });
  }, []);

  const isAlive = (): boolean => gameBuffer.players.get(playerId)?.alive ?? false;

  // Keyboard steering (WASD + arrows, 8-directional via combined keys).
  // While dead, the same keys pan the free-fly spectator camera instead.
  useEffect(() => {
    const pressed = new Set<string>();
    const recompute = (): void => {
      let vx = 0;
      let vy = 0;
      for (const k of pressed) {
        const v = KEY_VECTORS[k];
        if (v) {
          vx += v[0];
          vy += v[1];
        }
      }
      if (vx === 0 && vy === 0) return;
      if (isAlive()) sendAngle(Math.atan2(vy, vx));
      else spectator.pan(vx * 3, -vy * 3); // world y is up → invert
    };
    const onDown = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      if (!(k in KEY_VECTORS)) return;
      e.preventDefault();
      pressed.add(k);
      recompute();
    };
    const onUp = (e: KeyboardEvent): void => {
      pressed.delete(e.key.toLowerCase());
      recompute();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [sendAngle]);

  // Mouse / touch steering (when the room enables it): the local player is
  // camera-centred, so the exact vector from screen-centre to the pointer is the
  // desired heading — full 360° freedom.
  const mouseControl = useRoomStore((s) => s.room?.settings.mouseControl ?? false);
  useEffect(() => {
    if (!mouseControl) return;
    const steer = (clientX: number, clientY: number): void => {
      if (!isAlive()) return; // no steering while spectating
      const dx = clientX - window.innerWidth / 2;
      const dy = clientY - window.innerHeight / 2;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return; // dead-zone at centre
      sendAngle(Math.atan2(dy, dx));
    };
    const onMove = (e: MouseEvent): void => steer(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent): void => {
      const t = e.touches[0];
      if (t) steer(t.clientX, t.clientY);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [mouseControl, sendAngle]);

  return { playerId, sendAngle, mouseControl };
}
