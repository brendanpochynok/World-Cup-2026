'use client';

import { useEffect, useState } from 'react';
import { calculatePayouts } from '@/lib/payouts';

interface Props {
  playerCount: number;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const OPTIONS = [
  { choice: '10', label: '$10 entry', fee: 10 },
  { choice: '20', label: '$20 entry', fee: 20 },
  { choice: 'none', label: "Don't care", fee: null },
] as const;

export default function EntryFeeVoteModal({ playerCount }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tallies, setTallies] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/fee-vote')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.myVote === null) setOpen(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/fee-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice: selected }),
      });
      if (!res.ok) throw new Error();
      const data = await fetch('/api/fee-vote').then((r) => r.json());
      setTallies(data.tallies ?? null);
      setSaved(true);
    } catch {
      setError('Failed to save your vote. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-label="Entry fee vote"
        className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 p-0 sm:p-4">
        <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Vote on the entry fee</h2>
              <p className="text-gray-500 text-sm mt-1">
                Help decide what everyone pays to enter the pool.
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {saved ? (
            /* Post-vote: show current tallies */
            <div className="px-6 py-6 space-y-4">
              <div className="text-center">
                <svg className="w-9 h-9 text-wc-green-500 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="font-bold text-gray-900">Vote recorded.</p>
                <p className="text-gray-500 text-sm mt-1">Here&apos;s where the pool stands:</p>
              </div>
              {tallies && (
                <div className="space-y-2">
                  {OPTIONS.map(({ choice, label }) => {
                    const count = tallies[choice] ?? 0;
                    const total = Object.values(tallies).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={choice} className="rounded-xl border border-gray-200 px-4 py-3">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-semibold text-gray-800">{label}</span>
                          <span className="text-gray-500 tabular-nums">{count} vote{count !== 1 ? 's' : ''} · {pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-wc-blue-500 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button onClick={() => setOpen(false)} className="btn-primary text-sm w-full">Done</button>
            </div>
          ) : (
            /* Voting form */
            <div className="px-6 py-5 space-y-3">
              {OPTIONS.map(({ choice, label, fee }) => {
                const isSelected = selected === choice;
                const pot = fee !== null ? fee * playerCount : null;
                return (
                  <button key={choice} onClick={() => setSelected(choice)}
                    className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all ${
                      isSelected
                        ? 'border-wc-blue-500 bg-wc-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-base ${isSelected ? 'text-wc-blue-600' : 'text-gray-900'}`}>
                        {label}
                      </span>
                      {isSelected && (
                        <svg className="w-5 h-5 text-wc-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {pot !== null ? (
                      <div className="grid grid-cols-3 gap-2 mt-2.5">
                        <div className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
                          <div className="text-[11px] font-bold text-gray-400">Total Pot</div>
                          <div className="text-sm font-bold text-gray-900 tabular-nums">{fmt(pot)}</div>
                        </div>
                        <div className="rounded-lg bg-wc-gold-50 border border-wc-gold-200 px-2.5 py-1.5">
                          <div className="text-[11px] font-bold text-wc-gold-600">1st · 75%</div>
                          <div className="text-sm font-bold text-wc-gold-600 tabular-nums">{fmt(calculatePayouts(pot)[0])}</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
                          <div className="text-[11px] font-bold text-gray-400">2nd · 25%</div>
                          <div className="text-sm font-bold text-gray-700 tabular-nums">{fmt(calculatePayouts(pot)[1])}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs mt-1.5">Happy with whatever the pool decides</p>
                    )}
                  </button>
                );
              })}

              <p className="text-gray-400 text-[11px] text-center">
                Payouts based on the current {playerCount} player{playerCount !== 1 ? 's' : ''} — the pot grows as more join.
              </p>

              {error && <p className="text-wc-red-500 text-xs text-center font-medium">{error}</p>}

              <button onClick={submit} disabled={!selected || saving}
                className="btn-primary text-sm w-full disabled:opacity-40 disabled:cursor-not-allowed">
                {saving ? 'Saving…' : 'Submit vote'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
