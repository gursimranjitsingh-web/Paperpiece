'use client';

import { useCallback, useEffect } from 'react';
import { SocketEvent, type ChatMessage, type EmojiReaction } from '@paperpiece/shared';
import { getSocket } from '@/lib/socket';
import { identityAuth } from '@/stores/identityStore';
import { useChatStore } from '@/stores/chatStore';

/**
 * Wires chat + emoji socket events into the chat store and exposes senders.
 * Safe to mount on both the lobby and match screens (single socket singleton).
 */
export function useChat() {
  useEffect(() => {
    const socket = getSocket(identityAuth());
    const onChat = (m: ChatMessage): void => useChatStore.getState().pushMessage(m);
    const onEmoji = (r: EmojiReaction): void => useChatStore.getState().pushReaction(r.playerId, r.emoji);
    socket.on(SocketEvent.Chat, onChat);
    socket.on(SocketEvent.Emoji, onEmoji);
    return () => {
      socket.off(SocketEvent.Chat, onChat);
      socket.off(SocketEvent.Emoji, onEmoji);
    };
  }, []);

  const sendChat = useCallback((text: string): void => {
    const t = text.trim();
    if (!t) return;
    getSocket(identityAuth()).emit(SocketEvent.Chat, { text: t.slice(0, 300) });
  }, []);

  const sendEmoji = useCallback((emoji: string): void => {
    getSocket(identityAuth()).emit(SocketEvent.Emoji, { emoji });
  }, []);

  return { sendChat, sendEmoji };
}
