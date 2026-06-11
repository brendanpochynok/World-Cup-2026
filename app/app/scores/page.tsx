'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import LiveScoreCard from '@/components/LiveScoreCard';
import type { MatchData } from '@/app/api/scores/route';
import type { MatchOdds } from '@/app/api/odds/route';
import type { PickDistribution } from '@/app/api/picks/distribution/route';

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
      <h2 className={`text-sm font-bold ${live ? 'text-wc-red-500' : 'text-gray-500'}`}>
        {label}
      </h2>
      {count !== undefined && (
        <span className="text-xs text-gray-400 font-semibold tabular-nums">{count}</span>
      )}
    </div>
  );
}

function DateGroup({ date, matches, matchPicks, distribution, oddsMap, onPickChange }: {
  date: string;
  matches: MatchData[];
  matchPicks: Record<string, string> | null;
  distribution: Record<string, PickDistribution>;
  oddsMap: Record<string, MatchOdds>;
  onPickChange: (matchId: string, pick: string) => void;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader label={formatDateHeading(date)} count={matches.length} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {matches.map((m) => (
          <LiveScoreCard
            key={m.matchId}
            match={m}
            odds={oddsMap[m.matchId] ?? null}
            currentPick={matchPicks?.[m.matchId] ?? null}
            distribution={distribution[m.matchId] ?? null}
            onPickChange={matchPicks !== null ? onPickChange : undefined}
          />
        ))}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [matchPicks, setMatchPicks] = useState<Record<string, string> | null>(null);
  const [distribution, setDistribution] = useState<Record<string, PickDistribution>>({});
  const [oddsMap, setOddsMap] = useState<Record<string, MatchOdds>>({});
  const [entriesCount, setEntriesCount] = useState(1);
  const [activeEntry, setActiveEntry] = useState(1);
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

  // Fetch entries, distribution, and odds once on mount
  useEffect(() => {
    fetch('/api/me/entries')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.entriesCount) setEntriesCount(d.entriesCount); })
      .catch(() => {});

    fetch('/api/picks/distribution')
      .then((r) => r.json())
      .then((d) => setDistribution(d))
      .catch(() => {});

    fetch('/api/odds')
      .then((r) => r.json())
      .then((d) => { if (d?.odds) setOddsMap(d.odds); })
      .catch(() => {});
  }, []);

  // Fetch picks for the active entry (re-runs on entry tab switch)
  useEffect(() => {
    fetch(`/api/picks/groups?entry=${activeEntry}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.picks) setMatchPicks(d.picks); })
      .catch(() => {});
  }, [activeEntry]);

  async function handlePickChange(matchId: string, pick: string) {
    setMatchPicks((prev) => ({ ...(prev ?? {}), [matchId]: pick }));
    await fetch('/api/picks/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, pick, entry: activeEntry }),
    });
  }

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

  // Apply search filter
  const q = searchQuery.trim().toLowerCase();
  const visible = q
    ? matches.filter((m) =>
        m.home.toLowerCase().includes(q) || m.away.toLowerCase().includes(q)
      )
    : matches;

  const liveMatches = visible.filter((m) => m.status === 'live');

  // Today's non-live matches
  const todayMatches = visible.filter((m) => m.date === today && m.status !== 'live');

  // Future dates grouped by date ascending
  const upcomingMap = new Map<string, MatchData[]>();
  for (const m of visible) {
    if (m.date > today) {
      const list = upcomingMap.get(m.date) ?? [];
      list.push(m);
      upcomingMap.set(m.date, list);
    }
  }
  const upcomingDates = Array.from(upcomingMap.keys()).sort();

  // Past dates (before today) grouped by date descending
  const pastMap = new Map<string, MatchData[]>();
  for (const m of visible) {
    if (m.date < today) {
      const list = pastMap.get(m.date) ?? [];
      list.push(m);
      pastMap.set(m.date, list);
    }
  }
  const pastDates = Array.from(pastMap.keys()).sort().reverse(); // newest first
  const pastTotal = pastDates.reduce((n, d) => n + (pastMap.get(d)?.length ?? 0), 0);

  // Auto-open Past Scores when a search would reveal results there
  const effectivePastOpen = pastOpen || q.length > 0;

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
          <h1 className="text-3xl font-bold text-gray-900">Scores</h1>
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

      {/* ─── Search bar ─── */}
      {!loading && matches.length > 0 && (
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by team name…"
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wc-blue-400 focus:border-transparent transition bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* ─── Entry Tabs (only when player has multiple entries) ─── */}
      {entriesCount > 1 && (
        <div className="flex gap-1 border-b border-gray-200">
          {Array.from({ length: entriesCount }, (_, i) => i + 1).map((entry) => (
            <button
              key={entry}
              onClick={() => setActiveEntry(entry)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors relative ${
                activeEntry === entry
                  ? 'text-wc-blue-500'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Entry {entry}
              {activeEntry === entry && (
                <span className="absolute bottom-0 inset-x-0 h-[2px] bg-wc-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}

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
                {liveMatches.map((m) => (
                  <LiveScoreCard
                    key={m.matchId} match={m}
                    odds={oddsMap[m.matchId] ?? null}
                    currentPick={matchPicks?.[m.matchId] ?? null}
                    distribution={distribution[m.matchId] ?? null}
                    onPickChange={matchPicks !== null ? handlePickChange : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ─── Today ─── */}
          {todayMatches.length > 0 && (
            <section>
              <SectionHeader label={`Today · ${formatDateHeading(today)}`} count={todayMatches.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayMatches.map((m) => (
                  <LiveScoreCard
                    key={m.matchId} match={m}
                    odds={oddsMap[m.matchId] ?? null}
                    currentPick={matchPicks?.[m.matchId] ?? null}
                    distribution={distribution[m.matchId] ?? null}
                    onPickChange={matchPicks !== null ? handlePickChange : undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ─── Upcoming (grouped by date) ─── */}
          {upcomingDates.length > 0 && (
            <div className="space-y-8">
              {upcomingDates.map((date) => (
                <DateGroup
                  key={date} date={date} matches={upcomingMap.get(date)!}
                  matchPicks={matchPicks} distribution={distribution}
                  oddsMap={oddsMap} onPickChange={handlePickChange}
                />
              ))}
            </div>
          )}

          {/* ─── No matches ─── */}
          {showNothing && (
            <div className="card text-center py-16">
              {q ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No matches found</h3>
                  <p className="text-gray-500 text-sm">No team matches &ldquo;{searchQuery}&rdquo;.</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-wc-blue-500 text-sm font-semibold hover:underline"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No matches scheduled</h3>
                  <p className="text-gray-500 text-sm">Group stage runs June 11 – June 27, 2026.</p>
                </>
              )}
            </div>
          )}

          {/* ─── Past Scores (collapsed, auto-opens when searching) ─── */}
          {pastDates.length > 0 && (
            <section>
              <button
                onClick={() => setPastOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-3 py-4 px-5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                  <span className="text-sm font-bold text-gray-500 group-hover:text-gray-700 transition-colors">
                    Past Scores
                  </span>
                  <span className="text-xs text-gray-400 font-semibold tabular-nums">
                    {pastTotal} match{pastTotal !== 1 ? 'es' : ''}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${effectivePastOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {effectivePastOpen && (
                <div className="mt-6 space-y-8">
                  {pastDates.map((date) => (
                    <DateGroup
                      key={date} date={date} matches={pastMap.get(date)!}
                      matchPicks={matchPicks} distribution={distribution}
                      oddsMap={oddsMap} onPickChange={handlePickChange}
                    />
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
