'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import LiveScoreCard from '@/components/LiveScoreCard';
import type { MatchData } from '@/app/api/scores/route';

function formatDateHeading(dateStr: string): string {
  // dateStr is YYYY-MM-DD; parse as UTC noon to avoid timezone edge cases
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

function SectionHeader({ label, live = false, count }: { label: string; live?: boolean; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {live ? (
        <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-wc-red-500 opacity-20 animate-ping" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-wc-red-500" />
        </div>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block flex-shrink-0" />
      )}
      <h2 className={`text-sm font-black uppercase tracking-[0.1em] ${live ? 'text-wc-red-500' : 'text-gray-500'}`}>
        {label}
      </h2>
      {count !== undefined && (
        <span className="text-xs text-gray-400 font-semibold tabular-nums">{count}</span>
      )}
    </div>
  );
}

function DateGroup({ date, matches }: { date: string; matches: MatchData[] }) {
  return (
    <section className="space-y-3">
      <SectionHeader label={formatDateHeading(date)} count={matches.length} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {matches.map((m) => <LiveScoreCard key={m.matchId} match={m} />)}
      </div>
    </section>
  );
}

export default function ScoresPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [serverDate, setServerDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [pastOpen, setPastOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/scores');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMatches(data.matches ?? []);
        setServerDate(data.serverDate ?? '');
        setLastUpdated(new Date());
        setError('');
      }
    } catch {
      setError('Failed to load scores');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up polling; use shorter interval when live games are running
  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const hasLive = matches.some((m) => m.status === 'live');
    intervalRef.current = setInterval(fetchScores, hasLive ? 30_000 : 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchScores, matches]);

  // Use serverDate as the "today" cutoff so server and client agree
  const today = serverDate || new Date().toISOString().slice(0, 10);

  const liveMatches = matches.filter((m) => m.status === 'live');

  // Today's non-live matches
  const todayMatches = matches.filter((m) => m.date === today && m.status !== 'live');

  // Future dates grouped by date ascending
  const upcomingMap = new Map<string, MatchData[]>();
  for (const m of matches) {
    if (m.date > today) {
      const list = upcomingMap.get(m.date) ?? [];
      list.push(m);
      upcomingMap.set(m.date, list);
    }
  }
  const upcomingDates = Array.from(upcomingMap.keys()).sort();

  // Past dates (before today) grouped by date descending
  const pastMap = new Map<string, MatchData[]>();
  for (const m of matches) {
    if (m.date < today) {
      const list = pastMap.get(m.date) ?? [];
      list.push(m);
      pastMap.set(m.date, list);
    }
  }
  const pastDates = Array.from(pastMap.keys()).sort().reverse(); // newest first
  const pastTotal = pastDates.reduce((n, d) => n + (pastMap.get(d)?.length ?? 0), 0);

  const showNothing =
    !loading &&
    liveMatches.length === 0 &&
    todayMatches.length === 0 &&
    upcomingDates.length === 0 &&
    pastDates.length === 0 &&
    !error;

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1.5">Real-time</p>
          <h1 className="text-3xl font-black text-gray-900">Scores</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
              : 'Auto-refreshes every minute'}
          </p>
        </div>
        <button
          onClick={fetchScores}
          disabled={loading}
          className="flex items-center gap-2 btn-secondary text-sm py-2 px-4"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card border-red-200 bg-red-50 flex items-start gap-3">
          <svg className="w-5 h-5 text-wc-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-wc-red-600 text-sm font-semibold">{error}</p>
            <p className="text-gray-500 text-xs mt-0.5">The ESPN API may be temporarily unavailable.</p>
          </div>
        </div>
      )}

      {loading && matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <svg className="w-8 h-8 text-wc-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-gray-500 text-sm font-medium">Loading scores…</span>
        </div>
      ) : (
        <div className="space-y-10">

          {/* ─── Live Now ─── */}
          {liveMatches.length > 0 && (
            <section>
              <SectionHeader label="Live Now" live />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveMatches.map((m) => <LiveScoreCard key={m.matchId} match={m} />)}
              </div>
            </section>
          )}

          {/* ─── Today ─── */}
          {todayMatches.length > 0 && (
            <section>
              <SectionHeader label={`Today · ${formatDateHeading(today)}`} count={todayMatches.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayMatches.map((m) => <LiveScoreCard key={m.matchId} match={m} />)}
              </div>
            </section>
          )}

          {/* ─── Upcoming (grouped by date) ─── */}
          {upcomingDates.length > 0 && (
            <div className="space-y-8">
              {upcomingDates.map((date) => (
                <DateGroup key={date} date={date} matches={upcomingMap.get(date)!} />
              ))}
            </div>
          )}

          {/* ─── No matches at all ─── */}
          {showNothing && (
            <div className="card text-center py-16">
              <h3 className="text-xl font-black text-gray-900 mb-2">No matches scheduled</h3>
              <p className="text-gray-500 text-sm">Group stage runs June 11 – June 27, 2026.</p>
            </div>
          )}

          {/* ─── Past Scores (collapsed) ─── */}
          {pastDates.length > 0 && (
            <section>
              <button
                onClick={() => setPastOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-3 py-4 px-5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                  <span className="text-sm font-black uppercase tracking-[0.1em] text-gray-500 group-hover:text-gray-700 transition-colors">
                    Past Scores
                  </span>
                  <span className="text-xs text-gray-400 font-semibold tabular-nums">
                    {pastTotal} match{pastTotal !== 1 ? 'es' : ''}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${pastOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {pastOpen && (
                <div className="mt-6 space-y-8">
                  {pastDates.map((date) => (
                    <DateGroup key={date} date={date} matches={pastMap.get(date)!} />
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      )}
    </div>
  );
}
