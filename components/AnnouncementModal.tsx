'use client';

import { useState, useEffect } from 'react';
import EntriesControl from './EntriesControl';
import { ENTRY_FEE_USD, MAX_ENTRIES } from '@/lib/worldcup-data';

export default function AnnouncementModal() {
  const [show, setShow] = useState(false);
  const [entriesCount, setEntriesCount] = useState(1);
  const [locked, setLocked] = useState(false);
  const [acking, setAcking] = useState(false);

  useEffect(() => {
    fetch('/api/me/entries')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (!d.announcementAcked) setShow(true);
        setEntriesCount(d.entriesCount ?? 1);
        setLocked(d.locked ?? false);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  async function handleAck() {
    setAcking(true);
    try {
      await fetch('/api/me/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ackAnnouncement: true }),
      });
    } catch { /* ignore */ }
    setShow(false);
    setAcking(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-wc-blue-600 to-wc-blue-500 px-6 py-5 text-white">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">📢</span>
            <h2 className="text-xl font-black">Pool Announcement</h2>
          </div>
          <p className="text-wc-blue-100 text-sm">Read carefully — acknowledgment required</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              After taking a vote, we&apos;re going with <strong className="text-gray-900">${ENTRY_FEE_USD} per entry</strong> with a max of{' '}
              <strong className="text-gray-900">{MAX_ENTRIES} entries per player</strong>.
            </p>
            <p>
              Each entry is <strong className="text-gray-900">independent</strong> — it has its own group stage picks and bracket.
              You can enter up to {MAX_ENTRIES} times to increase your stake in the prize pool.
            </p>
            <div className="rounded-xl bg-wc-gold-50 border border-wc-gold-200 px-4 py-3 space-y-1.5">
              <p className="font-bold text-gray-900 text-xs uppercase tracking-wider">Prizes</p>
              <div className="flex justify-between text-sm">
                <span>🥇 1st place</span>
                <span className="font-bold text-wc-gold-600">75% of pot</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>🥈 2nd place</span>
                <span className="font-bold text-gray-600">25% of pot</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>🥉 3rd place</span>
                <span className="font-bold text-green-600">Free entry to the next pool</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Entry count locks at the first kickoff. Adjust yours below before then.
            </p>
          </div>

          {/* Entry adjuster */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-6 py-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">
              How many entries?
            </p>
            <div className="flex justify-center">
              <EntriesControl
                entriesCount={entriesCount}
                locked={locked}
                onChange={setEntriesCount}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleAck}
            disabled={acking}
            className="w-full py-3 rounded-xl bg-wc-blue-500 hover:bg-wc-blue-600 text-white font-black text-sm transition-colors disabled:opacity-60"
          >
            {acking ? 'Saving…' : 'Got it — I understand'}
          </button>
        </div>
      </div>
    </div>
  );
}
