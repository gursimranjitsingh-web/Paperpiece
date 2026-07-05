'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  PlayerPattern,
  PlayerShape,
  SocketEvent,
  type Ack,
  type RoomSettings,
  type RoomView,
} from '@paperpiece/shared';
import { emitWithAck, getSocket, type ClientSocket } from '@/lib/socket';
import { sound } from '@/lib/sound';
import { identityAuth, useIdentityStore } from '@/stores/identityStore';
import { useRoomStore } from '@/stores/roomStore';
import { toast } from '@/stores/toastStore';

/** Emit an ack event that takes no request payload (leave-room, start-game). */
function emitNoArg(s: ClientSocket, event: string, timeoutMs = 8000): Promise<Ack<unknown>> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ ok: false, error: 'Request timed out.', code: 'TIMEOUT' });
      }
    }, timeoutMs);
    (s.emit as (e: string, ack: (res: Ack<unknown>) => void) => void)(event, (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res);
    });
  });
}

/**
 * Connects the socket, mirrors authoritative room state into the store, and
 * exposes the lobby action set. All actions are server-validated; failures
 * surface as toasts and reject-free {@link Ack} results.
 */
export function useLobby() {
  const { playerId, hydrated, ensureId } = useIdentityStore();
  const setConnection = useRoomStore((s) => s.setConnection);
  const setRoom = useRoomStore((s) => s.setRoom);
  const setPing = useRoomStore((s) => s.setPing);
  const setCountdown = useRoomStore((s) => s.setCountdown);
  const reset = useRoomStore((s) => s.reset);

  /** Room code we're currently in — used to auto-rejoin after a reconnect. */
  const activeRoomRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    ensureId();
    const id = useIdentityStore.getState();
    const socket = getSocket(identityAuth());

    const onConnect = (): void => {
      setConnection('connected');
      // Auto-rejoin the same room after a transient disconnect.
      const code = activeRoomRef.current;
      if (code) {
        void emitWithAck<{ roomCode: string; username: string }, RoomView>(socket, SocketEvent.JoinRoom, {
          roomCode: code,
          username: id.username || 'Guest',
        }).then((res) => {
          if (res.ok) setRoom(res.data);
        });
      }
    };
    const onDisconnect = (): void => setConnection('disconnected');
    const onRoomUpdate = (room: RoomView): void => {
      activeRoomRef.current = room.roomCode;
      setRoom(room);
    };
    const onPlayerJoined = (p: { username: string }): void => toast.info(`${p.username} joined`);
    const onPlayerLeft = (p: { username: string }): void => toast.info(`${p.username} left`);
    const onCountdown = (secs: number): void => {
      setCountdown(secs > 0 ? secs : null);
      if (secs > 0) sound.play('countdown');
    };
    const onError = (p: { message: string }): void => toast.error(p.message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SocketEvent.RoomUpdate, onRoomUpdate);
    socket.on(SocketEvent.PlayerJoined, onPlayerJoined);
    socket.on(SocketEvent.PlayerLeft, onPlayerLeft);
    socket.on(SocketEvent.Countdown, onCountdown);
    socket.on(SocketEvent.ErrorMessage, onError);

    setConnection('connecting');
    if (!socket.connected) socket.connect();

    // Latency probe every 3s.
    const pingTimer = setInterval(() => {
      if (!socket.connected) return;
      const t0 = Date.now();
      socket.emit(SocketEvent.Ping, t0, () => setPing(Date.now() - t0));
    }, 3000);

    return () => {
      clearInterval(pingTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SocketEvent.RoomUpdate, onRoomUpdate);
      socket.off(SocketEvent.PlayerJoined, onPlayerJoined);
      socket.off(SocketEvent.PlayerLeft, onPlayerLeft);
      socket.off(SocketEvent.Countdown, onCountdown);
      socket.off(SocketEvent.ErrorMessage, onError);
    };
    // Reconnect only needs to run once identity is hydrated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const socket = (): ClientSocket => getSocket(identityAuth());

  const createRoom = useCallback(
    async (name: string, settings?: Partial<RoomSettings>): Promise<Ack<RoomView>> => {
      useIdentityStore.getState().setUsername(name);
      const res = await emitWithAck<{ username: string; settings?: Partial<RoomSettings> }, RoomView>(
        socket(),
        SocketEvent.CreateRoom,
        { username: name, settings },
      );
      if (res.ok) setRoom(res.data);
      else toast.error(res.error);
      return res;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const joinRoom = useCallback(
    async (roomCode: string, name: string): Promise<Ack<RoomView>> => {
      useIdentityStore.getState().setUsername(name);
      const res = await emitWithAck<{ roomCode: string; username: string }, RoomView>(
        socket(),
        SocketEvent.JoinRoom,
        { roomCode: roomCode.toUpperCase(), username: name },
      );
      if (res.ok) setRoom(res.data);
      else toast.error(res.error);
      return res;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const leaveRoom = useCallback(async (): Promise<void> => {
    await emitNoArg(socket(), SocketEvent.LeaveRoom);
    activeRoomRef.current = null;
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setReady = useCallback(async (ready: boolean): Promise<void> => {
    await emitWithAck(socket(), SocketEvent.SetReady, { ready });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setColor = useCallback(async (color: string): Promise<void> => {
    const res = await emitWithAck<{ color: string }, RoomView>(socket(), SocketEvent.SetColor, { color });
    if (!res.ok) toast.error(res.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAvatar = useCallback(async (avatar: string): Promise<void> => {
    useIdentityStore.getState().setAvatar(avatar);
    const s = socket();
    s.auth = identityAuth();
    await emitWithAck<{ avatar: string }, RoomView>(s, SocketEvent.SetAvatar, { avatar });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setShape = useCallback(async (shape: PlayerShape): Promise<void> => {
    useIdentityStore.getState().setShape(shape);
    const s = socket();
    s.auth = identityAuth();
    await emitWithAck<{ shape: PlayerShape }, RoomView>(s, SocketEvent.SetShape, { shape });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPattern = useCallback(async (pattern: PlayerPattern): Promise<void> => {
    useIdentityStore.getState().setPattern(pattern);
    const s = socket();
    s.auth = identityAuth();
    await emitWithAck<{ pattern: PlayerPattern }, RoomView>(s, SocketEvent.SetPattern, { pattern });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setNickname = useCallback(async (name: string): Promise<void> => {
    useIdentityStore.getState().setUsername(name);
    const res = await emitWithAck<{ username: string }, RoomView>(socket(), SocketEvent.SetNickname, {
      username: name,
    });
    if (!res.ok) toast.error(res.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettings = useCallback(async (settings: Partial<RoomSettings>): Promise<void> => {
    const res = await emitWithAck<{ settings: Partial<RoomSettings> }, RoomView>(
      socket(),
      SocketEvent.UpdateSettings,
      { settings },
    );
    if (!res.ok) toast.error(res.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kickPlayer = useCallback(async (targetPlayerId: string): Promise<void> => {
    const res = await emitWithAck<{ targetPlayerId: string }, RoomView>(
      socket(),
      SocketEvent.KickPlayer,
      { targetPlayerId },
    );
    if (!res.ok) toast.error(res.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback(async (): Promise<void> => {
    const res = await emitNoArg(socket(), SocketEvent.StartGame);
    if (!res.ok) toast.error(res.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    playerId,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    setColor,
    setAvatar,
    setShape,
    setPattern,
    setNickname,
    updateSettings,
    kickPlayer,
    startGame,
  };
}
