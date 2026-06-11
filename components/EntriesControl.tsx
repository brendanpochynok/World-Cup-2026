'use client';

import { useState } from 'react';
import { MAX_ENTRIES, ENTRY_FEE_USD } from '@/lib/worldcup-data';

interface Props {
  entriesCount: number;
  locked: boolean;
  onChange?: (newCount: number) => void;
}

export default function EntriesControl({ entriesCount, locked, onChange }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function setCount(newCount: number) {
    if (locked || pending) return;
    if (newCount < 1 || newCount > MAX_ENTRIES) return;

    if (newCount < entriesCount) {
      const confirmed = window.confirm(
        `Remove Entry ${entriesCount}? All picks for that entry will be permanently deleted.`
      );
      if (!confirmed) return;
    }

    setPending(true);
    setError('');
    try {
      const res = await fetch('/api/me/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: newCount }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'Failed to update entries');
        return;
      }
      onChange?.(newCount);
    } catch {
      setError('Network error');
    } finally {
      setPending(false);
    }
  }

  const totalBuyIn = entriesCount * ENTRY_FEE_USD;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        {/* Decrease button */}
        <button
          onClick={() => setCount(entriesCount - 1)}
          disabled={locked || pending || entriesCount <= 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all
            bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-sm"
          aria-label="Remove entry"
        >
          ▼
        </button>

        {/* Count display */}
        <div className="text-center min-w-[60px]">
          <div className="text-4xl font-black text-gray-900 tabular-nums leading-none">
            {entriesCount}
          </div>
          <div className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">
            {entriesCount === 1 ? 'Entry' : 'Entries'}
          </div>
        </div>

        {/* Increase button */}
        <button
          onClick={() => setCount(entriesCount + 1)}
          disabled={locked || pending || entriesCount >= MAX_ENTRIES}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all
            bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-sm"
          aria-label="Add entry"
        >
          ▲
        </button>
      </div>

      <div className="text-sm font-semibold text-gray-600">
        ${totalBuyIn} buy-in
      </div>

      {locked && (
        <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Entry changes locked
        </div>
      )}

      {pending && (
        <div className="text-xs text-gray-400 font-medium">Saving…</div>
      )}

      {error && (
        <div className="text-xs text-red-500 font-semibold">{error}</div>
      )}
    </div>
  );
}
