'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { ChatMessageData, MessageReaction } from '@/app/api/chat/route';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const POLL_MS = 2_000;
const MAX_LENGTH = 500;
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '⚽', '🔥'];

const URL_RE = /(https?:\/\/[^\s]+)/g;
const IMG_RE = /\.(gif|png|jpe?g|webp)$/i;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return today ? time : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${time}`;
}

// Render image URLs inline (GIFs), other URLs as links, the rest as text
function MessageBody({ body }: { body: string }) {
  return (
    <div className="text-sm text-gray-700 break-words whitespace-pre-wrap">
      {body.split(URL_RE).map((part, i) => {
        if (!/^https?:\/\//.test(part)) return <span key={i}>{part}</span>;
        if (IMG_RE.test(part.split('?')[0])) {
          return (
            <img
              key={i}
              src={part}
              alt="GIF"
              loading="lazy"
              className="block max-w-[220px] max-h-44 rounded-lg border border-gray-200 my-1"
            />
          );
        }
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-wc-blue-500 hover:underline break-all">
            {part}
          </a>
        );
      })}
    </div>
  );
}

interface GifResult { id: string; url: string; preview: string | null }

interface DashboardChatProps {
  me: { userId: number; username: string };
  isAdmin: boolean;
  tall?: boolean;
}

export default function DashboardChat({ me, isAdmin, tall = false }: DashboardChatProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [reactions, setReactions] = useState<Record<number, MessageReaction[]>>({});
  const [reactFor, setReactFor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifConfigured, setGifConfigured] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const lastReadSent = useRef(0);

  const appendMessages = useCallback((incoming: ChatMessageData[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      return fresh.length > 0 ? [...prev, ...fresh] : prev;
    });
  }, []);

  // Initial load + fast incremental polling; paused while the tab is hidden
  useEffect(() => {
    let lastId = 0;
    let cancelled = false;
    let inFlight = false;

    const poll = async (force = false) => {
      if (inFlight || (!force && document.visibilityState === 'hidden')) return;
      inFlight = true;
      try {
        const res = await fetch(lastId ? `/api/chat?after=${lastId}` : '/api/chat');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.messages)) return;
        if (data.reactions) setReactions(data.reactions);
        if (data.messages.length > 0) {
          lastId = data.messages[data.messages.length - 1].id;
          appendMessages(data.messages);
        }
      } catch { /* retry on next poll */ } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    };

    poll(true);
    const id = setInterval(poll, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [appendMessages]);

  // Probe whether GIF search is configured (hides the button when not)
  useEffect(() => {
    fetch('/api/chat/gifs?probe=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGifConfigured(d?.configured === true))
      .catch(() => {});
  }, []);

  // GIF search: trending on open, debounced search while typing
  useEffect(() => {
    if (!showGif) return;
    let cancelled = false;
    setGifLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/gifs${gifQuery.trim() ? `?q=${encodeURIComponent(gifQuery.trim())}` : ''}`);
        const data = await res.json();
        if (!cancelled) setGifs(Array.isArray(data.gifs) ? data.gifs : []);
      } catch {
        if (!cancelled) setGifs([]);
      } finally {
        if (!cancelled) setGifLoading(false);
      }
    }, gifQuery ? 400 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [showGif, gifQuery]);

  // Keep the view pinned to the newest message unless the user scrolled up
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Mark messages read while the chat is on screen; nav badges listen for
  // the wc-chat-read event to clear immediately
  useEffect(() => {
    if (messages.length === 0 || document.visibilityState === 'hidden') return;
    const lastId = messages[messages.length - 1].id;
    if (lastId <= lastReadSent.current) return;
    lastReadSent.current = lastId;
    fetch('/api/chat/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastId }),
    })
      .then((res) => { if (res.ok) window.dispatchEvent(new Event('wc-chat-read')); })
      .catch(() => { lastReadSent.current = 0; });
  }, [messages]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  const send = useCallback(async (text: string) => {
    if (!text || sending) return false;
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
        return false;
      }
      stickToBottom.current = true;
      if (data.message) appendMessages([data.message]);
      return true;
    } catch {
      setError('Failed to send');
      return false;
    } finally {
      setSending(false);
    }
  }, [sending, appendMessages]);

  async function handleSend() {
    if (await send(input.trim())) {
      setInput('');
      setShowEmoji(false);
    }
  }

  async function handleSendGif(url: string) {
    if (await send(url)) {
      setShowGif(false);
      setGifQuery('');
    }
  }

  async function handleDelete(id: number) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/chat?id=${id}`, { method: 'DELETE' }).catch(() => {});
  }

  // Optimistic toggle; the next poll reconciles with the server state
  async function toggleReaction(messageId: number, emoji: string) {
    setReactFor(null);
    setReactions((prev) => {
      const list = [...(prev[messageId] ?? [])];
      const i = list.findIndex((r) => r.emoji === emoji);
      if (i >= 0) {
        const r = list[i];
        const updated = { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) };
        if (updated.count <= 0) list.splice(i, 1);
        else list[i] = updated;
      } else {
        list.push({ emoji, count: 1, mine: true });
      }
      return { ...prev, [messageId]: list };
    });
    await fetch('/api/chat/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, emoji }),
    }).catch(() => {});
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Chat</h3>
        <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-semibold">
          <span className="w-1.5 h-1.5 bg-wc-green-500 rounded-full animate-pulse" />
          live
        </span>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className={`${tall ? 'h-[60vh] min-h-72' : 'h-72'} overflow-y-auto px-5 py-3 space-y-3`}
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
                    <span className="ml-auto flex items-center gap-2 flex-shrink-0 relative">
                      <button
                        onClick={() => setReactFor(reactFor === m.id ? null : m.id)}
                        className="text-gray-300 hover:text-gray-500 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity leading-none"
                        aria-label="Add reaction"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {(isMe || isAdmin) && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-gray-300 hover:text-wc-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                          aria-label="Delete message"
                        >
                          ✕
                        </button>
                      )}
                      {reactFor === m.id && (
                        <div className="absolute right-0 top-full mt-1 z-10 flex gap-0.5 bg-white border border-gray-200 rounded-full shadow-md px-1.5 py-1">
                          {QUICK_REACTIONS.map((e) => (
                            <button
                              key={e}
                              onClick={() => toggleReaction(m.id, e)}
                              className="text-base leading-none px-0.5 hover:scale-125 transition-transform"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </span>
                  </div>
                  <MessageBody body={m.body} />
                  {(reactions[m.id]?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reactions[m.id].map((r) => (
                        <button
                          key={r.emoji}
                          onClick={() => toggleReaction(m.id, r.emoji)}
                          className={`flex items-center gap-1 text-[11px] tabular-nums px-1.5 py-0.5 rounded-full border transition-colors ${
                            r.mine
                              ? 'bg-wc-blue-500/10 border-wc-blue-300 text-wc-blue-600 font-bold'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                          aria-label={`React with ${r.emoji}`}
                        >
                          <span className="text-xs leading-none">{r.emoji}</span>
                          {r.count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* GIF search panel */}
      {showGif && (
        <div className="border-t border-gray-100 px-5 py-3">
          <input
            type="text"
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            placeholder="Search GIFs…"
            autoFocus
            className="w-full text-sm px-3 py-2 mb-2 rounded-lg border border-gray-200 focus:outline-none focus:border-wc-blue-300 focus:ring-2 focus:ring-wc-blue-500/10 placeholder:text-gray-400"
          />
          <div className="h-40 overflow-y-auto">
            {gifLoading ? (
              <p className="text-gray-400 text-sm text-center py-8">Searching…</p>
            ) : gifs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No GIFs found</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {gifs.map((g) => (
                  <button key={g.id} onClick={() => handleSendGif(g.url)} className="block">
                    <img
                      src={g.preview ?? g.url}
                      alt=""
                      loading="lazy"
                      className="w-full h-20 object-cover rounded-lg border border-gray-200 hover:border-wc-blue-300 transition-colors"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emoji picker panel */}
      {showEmoji && (
        <div className="border-t border-gray-100">
          <EmojiPicker
            onEmojiClick={(e) => setInput((prev) => prev + e.emoji)}
            width="100%"
            height={320}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <div className="px-5 py-3 border-t border-gray-100">
        {error && <p className="text-xs text-wc-red-500 font-semibold mb-1.5">{error}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowEmoji((v) => !v); setShowGif(false); }}
            className={`text-lg leading-none flex-shrink-0 transition-transform hover:scale-110 ${showEmoji ? '' : 'grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
            aria-label="Emoji picker"
          >
            😀
          </button>
          {gifConfigured && (
            <button
              onClick={() => { setShowGif((v) => !v); setShowEmoji(false); }}
              className={`text-[11px] font-bold px-1.5 py-1 rounded border flex-shrink-0 transition-colors ${
                showGif
                  ? 'bg-wc-blue-500 text-white border-wc-blue-500'
                  : 'text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300'
              }`}
              aria-label="GIF picker"
            >
              GIF
            </button>
          )}
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
