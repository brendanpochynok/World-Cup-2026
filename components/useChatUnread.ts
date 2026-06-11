'use client';

import { useState, useEffect } from 'react';

const POLL_MS = 15_000;

// Unread chat count for nav badges. The chat component dispatches
// 'wc-chat-read' after marking messages read so badges clear instantly.
export function useChatUnread(enabled: boolean): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch('/api/chat/unread');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.unread === 'number') setUnread(data.unread);
      } catch { /* retry on next poll */ }
    };

    refresh();
    const id = setInterval(refresh, POLL_MS);
    const onRead = () => setUnread(0);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('wc-chat-read', onRead);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('wc-chat-read', onRead);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return unread;
}
