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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-wc-navy-400 text-xs uppercase tracking-widest font-medium mb-1">Live</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Scores</h1>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-wc-navy-400">
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={fetchScores} disabled={loading} className="btn-secondary text-sm py-1.5 px-3">
            {loading ? '…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-wc-red-600/40 bg-wc-red-700/10">
          <p className="text-wc-red-300 text-sm">{error}</p>
          <p className="text-wc-navy-400 text-xs mt-1">The ESPN API may be temporarily unavailable.</p>
        </div>
      )}

      {loading && !games.length ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-wc-navy-300 animate-pulse">Loading scores…</div>
        </div>
      ) : (
        <>
          {liveGames.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-wc-red-500 rounded-full animate-pulse" />
                <h2 className="text-sm font-bold text-wc-red-400 uppercase tracking-wider">Live Now</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveGames.map((game) => <LiveScoreCard key={game.id} {...game} />)}
              </div>
            </section>
          )}

          {upcomingGames.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-wc-navy-400 uppercase tracking-widest mb-3">Upcoming</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingGames.map((game) => <LiveScoreCard key={game.id} {...game} />)}
              </div>
            </section>
          )}

          {finishedGames.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-wc-navy-400 uppercase tracking-widest mb-3">Final Results</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {finishedGames.map((game) => <LiveScoreCard key={game.id} {...game} />)}
              </div>
            </section>
          )}

          {!loading && games.length === 0 && !error && (
            <div className="card text-center py-12">
              <h3 className="text-lg font-bold text-white mb-2">No matches today</h3>
              <p className="text-wc-navy-400 text-sm">Group stage runs June 11 – June 27, 2026.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
