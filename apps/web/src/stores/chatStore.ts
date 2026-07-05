'use client';

import { create } from 'zustand';
import type { ChatMessage } from '@paperpiece/shared';

export interface FloatingReaction {
  id: number;
  playerId: string;
  emoji: string;
}

interface ChatState {
  messages: ChatMessage[];
  reactions: FloatingReaction[];
  unread: number;
  pushMessage: (m: ChatMessage) => void;
  pushReaction: (playerId: string, emoji: string) => void;
  clearUnread: () => void;
  reset: () => void;
}

let reactionId = 1;

/** Chat log + transient emoji reactions, shared by the lobby and match screens. */
export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  reactions: [],
  unread: 0,
  pushMessage: (m) =>
    set((s) => ({ messages: [...s.messages.slice(-59), m], unread: s.unread + 1 })),
  pushReaction: (playerId, emoji) => {
    const id = reactionId++;
    set((s) => ({ reactions: [...s.reactions, { id, playerId, emoji }] }));
    setTimeout(() => set((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })), 2600);
  },
  clearUnread: () => set({ unread: 0 }),
  reset: () => set({ messages: [], reactions: [], unread: 0 }),
}));
