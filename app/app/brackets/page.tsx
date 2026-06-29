'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BracketBoard from '@/components/BracketBoard';
import { isBracketLocked } from '@/lib/worldcup-data';
import type { BracketsResponse } from '@/app/api/brackets/route';
import type { MatchData } from '@/app/api/scores/route';
import type { MatchOdds } from '@/app/api/odds/route';

export default function BracketsPage() {
  const [data, setData] = useState<BracketsResponse | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [entry, setEntry] = useState(1);
  const [liveByKey, setLiveByKey] = useState<Record<string, MatchData>>({});
  const [oddsByKey, setOddsByKey] = useState<Record<string, MatchOdds>>({});
  const [loading, setLoading] = useState(true);
  const hasLiveRef = useRef(false);

  // Bracket roster + the selected bracket (defaults to the signed-in player).
  const fetchBracket = useCallback(async (user: string | null, e: number) => {
    const qs = new URLSearchParams();
    if (user) qs.set('username', user);
    qs.set('entry', String(e));
    const res = await fetch(`/api/brackets?${qs.toString()}`);
    const json: BracketsResponse = await res.json();
    setData(json);
    if (user === null && json.selected) setUsername(json.selected.username);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBracket(username, entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, entry]);

  // Live knockout scores + odds, polled faster while a game is in progress.
  const fetchLive = useCallback(async () => {
    try {
      const [scoresRes, oddsRes] = await Promise.all([fetch('/api/scores'), fetch('/api/odds')]);
      const scores = await scoresRes.json().catch(() => ({}));
      const odds = await oddsRes.json().catch(() => ({}));
      const ko: MatchData[] = Array.isArray(scores?.knockout) ? scores.knockout : [];
      setLiveByKey(Object.fromEntries(ko.map((k) => [k.matchId, k])));
      hasLiveRef.current = ko.some((k) => k.status === 'live');
      if (odds?.odds) setOddsByKey(odds.odds);
    } catch {
      /* odds/live are best-effort overlays */
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(() => fetchLive(), hasLiveRef.current ? 30_000 : 120_000);
    return () => clearInterval(id);
  }, [fetchLive]);

  const selected = data?.selected ?? null;
  const pickMap: Record<string, string> = selected
    ? Object.fromEntries(selected.picks.map((p) => [`${p.round}-${p.slot}`, p.team]))
    : {};
  const locked = data?.locked ?? isBracketLocked();

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Brackets</h1>
          <p className="text-gray-500 text-sm mt-1.5">
            Full matchups, live scores, odds, and how the pool picked
            {!locked && <span className="text-gray-400"> · others’ brackets unlock at the deadline</span>}
          </p>
        </div>

        {/* Player + entry selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={username ?? ''}
            onChange={(ev) => { setEntry(1); setUsername(ev.target.value); }}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-wc-blue-300 cursor-pointer"
          >
            {data?.players.map((p) => (
              <option key={p.username} value={p.username}>
                {p.displayName || p.username}{p.username === data.me ? ' (you)' : ''}
              </option>
            ))}
          </select>

          {selected && selected.entriesCount > 1 && (
            <div className="flex gap-1">
              {Array.from({ length: selected.entriesCount }, (_, i) => i + 1).map((e) => (
                <button
                  key={e}
                  onClick={() => setEntry(e)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                    entry === e ? 'bg-wc-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Entry {e}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading brackets…</div>
      ) : !selected ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          No bracket to show yet.
        </div>
      ) : !selected.visible ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-700 font-semibold">This bracket is hidden until the deadline</p>
          <p className="text-gray-400 text-sm mt-1">
            You can only view other players’ brackets after the bracket lock. Your own is always visible.
          </p>
        </div>
      ) : selected.picks.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-500">
          {selected.username === data?.me
            ? 'You haven’t made any bracket picks yet.'
            : 'This player hasn’t made any bracket picks for this entry.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
          <BracketBoard
            picks={pickMap}
            r32Teams={data?.r32 ?? {}}
            results={data?.results ?? {}}
            liveByKey={liveByKey}
            oddsByKey={oddsByKey}
            distribution={data?.distribution ?? {}}
          />
        </div>
      )}
    </div>
  );
}
