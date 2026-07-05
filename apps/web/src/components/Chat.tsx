'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/stores/chatStore';
import { useIdentityStore } from '@/stores/identityStore';

export const QUICK_EMOJIS = ['👍', '😂', '😮', '😢', '🔥', '❤️', '😎', '🎉'];

/**
 * Chat panel with a message log, text input, and quick emoji reactions.
 * `variant="game"` renders a collapsible overlay; `"lobby"` a docked card.
 */
export function Chat({ variant = 'lobby' }: { variant?: 'lobby' | 'game' }) {
  const { sendChat, sendEmoji } = useChat();
  const messages = useChatStore((s) => s.messages);
  const unread = useChatStore((s) => s.unread);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const myId = useIdentityStore((s) => s.playerId);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(variant === 'lobby');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (open) clearUnread();
  }, [messages, open, clearUnread]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    sendChat(text);
    setText('');
  };

  const body = (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto pr-1 text-sm">
        {messages.length === 0 && (
          <p className="text-xs text-[var(--color-ink-soft)]">No messages yet. Say hi 👋</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.playerId === myId ? 'text-right' : ''}>
            <span className="font-semibold" style={{ color: m.color }}>
              {m.username}
            </span>{' '}
            <span className="text-[var(--color-ink)]">{m.text}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => sendEmoji(e)}
            className="rounded-md px-1.5 py-0.5 text-base transition hover:bg-white/10"
            aria-label={`react ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Message…"
          className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-canvas)]"
        >
          Send
        </button>
      </form>
    </div>
  );

  if (variant === 'lobby') {
    return (
      <div className="flex h-72 flex-col rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
          Chat
        </h3>
        {body}
      </div>
    );
  }

  // Game overlay (collapsible, bottom-left above the kill feed).
  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20 w-80 max-w-[80vw]">
      {open ? (
        <div className="flex h-64 flex-col rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
              Chat
            </span>
            <button onClick={() => setOpen(false)} className="text-xs text-[var(--color-ink-soft)] hover:text-white">
              ✕
            </button>
          </div>
          {body}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm backdrop-blur"
        >
          💬 Chat {unread > 0 && <span className="ml-1 rounded-full bg-[var(--color-accent)] px-1.5 text-xs text-[var(--color-canvas)]">{unread}</span>}
        </button>
      )}
    </div>
  );
}
