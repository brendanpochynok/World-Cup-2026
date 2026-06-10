'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

function elapsed(since: Date): string {
  const s = Math.floor((Date.now() - since.getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function StandingsLastUpdated() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadedAt] = useState(() => new Date());
  const [display, setDisplay] = useState('just now');

  useEffect(() => {
    const id = setInterval(() => setDisplay(elapsed(loadedAt)), 15_000);
    return () => clearInterval(id);
  }, [loadedAt]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={refresh}
      disabled={isPending}
      className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-wc-blue-500 rounded"
      title="Refresh standings"
    >
      <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isPending ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span>Updated {display}</span>
    </button>
  );
}
