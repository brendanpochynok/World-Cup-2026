'use client';

import { useState, useEffect, useCallback } from 'react';
import LiveScoreCard from '@/components/LiveScoreCard';

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  clock: string;
  date: string;
  competition: string;
}

function SectionHeader({ label, live = false }: { label: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {live ? (
        <div className="relative flex items-center justify-center w-5 h-5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-wc-red-500 opacity-20 animate-ping" />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-wc-red-500" />
        </div>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
      )}
      <h2 className={`text-sm font-black uppercase tracking-[0.1em] ${live ? 'text-wc-red-500' : 'text-gray-500'}`}>
        {label}
      </h2>
    </div>
  );
}

export default function ScoresPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/scores');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setGames(data.games || []);
        setLastUpdated(new Date());
        setError('');
      }
    } catch {
      setError('Failed to load scores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, 60000);
    return () => clearInterval(interval);
  }, [fetchScores]);

  const liveGames    = games.filter((g) => g.status === 'in' || g.status === '1' || g.status === '2');
  const finishedGames = games.filter((g) => g.status === 'post');
  const upcomingGames = games.filter((g) => g.status === 'pre');

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

      {/* Error state */}
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

      {loading && !games.length ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <svg className="w-8 h-8 text-wc-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-gray-500 text-sm font-medium">Loading scores…</span>
        </div>
      ) : (
        <>
          {liveGames.length > 0 && (
            <section>
              <SectionHeader label="Live Now" live />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveGames.map((game) => <LiveScoreCard key={game.id} {...game} />)}
              </div>
            </section>
          )}

          {upcomingGames.length > 0 && (
            <section>
              <SectionHeader label="Upcoming" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingGames.map((game) => <LiveScoreCard key={game.id} {...game} />)}
              </div>
            </section>
          )}

          {finishedGames.length > 0 && (
            <section>
              <SectionHeader label="Final Results" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {finishedGames.map((game) => <LiveScoreCard key={game.id} {...game} />)}
              </div>
            </section>
          )}

          {!loading && games.length === 0 && !error && (
            <div className="card text-center py-16">
              <h3 className="text-xl font-black text-gray-900 mb-2">No matches today</h3>
              <p className="text-gray-500 text-sm">Group stage runs June 11 – June 27, 2026.</p>
              <p className="text-gray-400 text-xs mt-1">Check back soon!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
