'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { ChatMessageData } from '@/app/api/chat/route';

const POLL_MS = 15_000;
const MAX_LENGTH = 500;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return today ? time : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`;
}

interface DashboardChatProps {
  me: { userId: number; username: string } | null;
  isAdmin: boolean;
}

export default function DashboardChat({ me, isAdmin }: DashboardChatProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const appendMessages = useCallback((incoming: ChatMessageData[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  }, []);

  // Initial load + incremental polling
  useEffect(() => {
    if (!me) return;
    let lastId = 0;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(lastId ? `/api/chat?after=${lastId}` : '/api/chat');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.messages)) return;
        if (data.messages.length > 0) {
          lastId = data.messages[data.messages.length - 1].id;
          appendMessages(data.messages);
        }
      } catch { /* retry on next poll */ } finally {
        if (!cancelled) setLoading(false);
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [me, appendMessages]);

  // Keep the view pinned to the newest message unless the user scrolled up
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send');
      } else {
        setInput('');
        stickToBottom.current = true;
        if (data.message) appendMessages([data.message]);
      }
    } catch {
      setError('Failed to send');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: number) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/chat?id=${id}`, { method: 'DELETE' }).catch(() => {});
  }

  if (!me) {
    return (
      <div className="card text-center py-8">
        <h3 className="font-bold text-gray-900">Pool Chat</h3>
        <p className="text-gray-400 text-sm mt-1">
          <Link href="/login" className="text-wc-blue-500 font-semibold hover:text-wc-blue-600">Sign in</Link>
          {' '}to talk trash with the pool
        </p>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Pool Chat</h3>
        <span className="text-[11px] text-gray-400 font-semibold">updates every 15s</span>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="h-72 overflow-y-auto px-5 py-3 space-y-3"
      >
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-8">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No messages yet — say hi!</p>
        ) : (
          messages.map((m) => {
            const isMe = m.userId === me.userId;
            const name = m.displayName ?? m.username;
            return (
              <div key={m.id} className="group flex items-start gap-2.5">
                {m.avatarUrl ? (
                  <img
                    src={m.avatarUrl}
                    alt={name}
                    className="w-7 h-7 rounded-lg object-cover border border-gray-200 flex-shrink-0 mt-0.5"
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isMe ? 'bg-wc-blue-500/10 border border-wc-blue-200' : 'bg-gray-100 border border-gray-200'
                  }`}>
                    <span className={`text-[11px] font-bold uppercase leading-none ${
                      isMe ? 'text-wc-blue-500' : 'text-gray-500'
                    }`}>
                      {name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xs font-bold truncate ${isMe ? 'text-wc-blue-600' : 'text-gray-900'}`}>
                      {name}
                    </span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(m.createdAt)}</span>
                    {(isMe || isAdmin) && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="ml-auto text-gray-300 hover:text-wc-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none flex-shrink-0"
                        aria-label="Delete message"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-100">
        {error && <p className="text-xs text-wc-red-500 font-semibold mb-1.5">{error}</p>}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message the pool…"
            maxLength={MAX_LENGTH}
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-wc-blue-300 focus:ring-2 focus:ring-wc-blue-500/10 placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
