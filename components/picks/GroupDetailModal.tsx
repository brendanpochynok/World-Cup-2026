'use client';

import { useEffect, useCallback, useMemo } from 'react';
import {
  Group,
  getGroupMatches,
  getTeamMeta,
  getFlagUrl,
  isMatchLocked,
  computeGroupStandings,
  groupHasTie,
} from '@/lib/worldcup-data';
import type { MatchOdds } from '@/app/api/odds/route';

interface GroupDetailModalProps {
  group: Group;
  matchPicks: Record<string, string>;
  onPickChange: (matchId: string, pick: string) => void;
  onClose: () => void;
  oddsMap?: Record<string, MatchOdds>;
  kickoffTimes?: Record<string, string>;
  tiebreakerOrder?: string[];
  onTiebreakerChange?: (order: string[]) => void;
}

function shortenName(name: string): string {
  const map: Record<string, string> = {
    'Bosnia and Herzegovina': 'Bosnia',
    'United States': 'USA',
    "Cote d'Ivoire": 'Ivory Coast',
    'Saudi Arabia': 'S. Arabia',
    'South Africa': 'S. Africa',
    'South Korea': 'S. Korea',
    'New Zealand': 'N. Zealand',
  };
  return map[name] ?? (name.length > 13 ? name.slice(0, 12) + '…' : name);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatKickoff(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function pct(p: number) {
  return `${Math.round(p * 100)}%`;
}


export default function GroupDetailModal({
  group,
  matchPicks,
  onPickChange,
  onClose,
  oddsMap = {},
  kickoffTimes = {},
  tiebreakerOrder,
  onTiebreakerChange,
}: GroupDetailModalProps) {
  const matches = getGroupMatches(group.id);
  const pickedCount = matches.filter((m) => matchPicks[m.matchId]).length;
  const allPicked = pickedCount === matches.length;

  const standings = useMemo(
    () => computeGroupStandings(group.id, matchPicks, tiebreakerOrder),
    [group.id, matchPicks, tiebreakerOrder]
  );

  const hasTie = allPicked && groupHasTie(standings);
  const tieResolved = hasTie && !!tiebreakerOrder;

  function handleSwap(i: number, direction: 'up' | 'down') {
    const j = direction === 'up' ? i - 1 : i + 1;
    const newOrder = standings.map((s) => s.team);
    const tmp = newOrder[i]; newOrder[i] = newOrder[j]; newOrder[j] = tmp;
    onTiebreakerChange?.(newOrder);
  }

  function isTiedWithNext(i: number) {
    return i < standings.length - 1 &&
      standings[i].pts === standings[i + 1].pts &&
      standings[i].w === standings[i + 1].w;
  }

  function isTiedWithPrev(i: number) {
    return i > 0 &&
      standings[i].pts === standings[i - 1].pts &&
      standings[i].w === standings[i - 1].w;
  }

  const hasAnyPick = pickedCount > 0;

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  // Determine if any odds come from Polymarket
  const hasPolymarket = matches.some(
    (m) => oddsMap[m.matchId]?.source === 'polymarket'
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${group.name} match picks`}
        className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 p-0 sm:p-4"
      >
        <div className="bg-green-950 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl max-h-[92vh] flex flex-col shadow-2xl">

          {/* Header */}
          <div className="sticky top-0 bg-green-950 border-b border-green-800 px-5 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
            <div>
              <h2 className="text-yellow-400 font-bold text-lg tracking-wide">{group.name}</h2>
              <p className="text-green-500 text-xs mt-0.5">
                {pickedCount}/{matches.length} picks made · correct +1 · wrong -1
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-green-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-green-800"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4">

            {/* Live standings table */}
            <div className="rounded-xl border border-green-800 overflow-hidden">
              <div className="bg-green-900/60 px-3 py-2 flex items-center justify-between">
                <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
                  Predicted Standings
                </span>
                {!hasAnyPick && (
                  <span className="text-green-600 text-[11px]">Pick matches below to update</span>
                )}
              </div>

              {/* Tiebreaker banner */}
              {hasTie && (
                <div className={`px-3 py-2 text-xs flex items-center gap-2 ${tieResolved ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-300'}`}>
                  <span>{tieResolved ? '✓ Tiebreaker set' : '⚠ Tiebreaker needed'}</span>
                  <span className="text-green-600">
                    {tieResolved ? '— tap arrows to adjust' : '— use the arrows to set the order'}
                  </span>
                </div>
              )}

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-green-500 border-b border-green-800/60">
                    <th className="text-left py-1.5 px-3 font-medium">#</th>
                    <th className="text-left py-1.5 pl-0 font-medium">Team</th>
                    <th className="text-center py-1.5 font-medium w-7">P</th>
                    <th className="text-center py-1.5 font-medium w-7">W</th>
                    <th className="text-center py-1.5 font-medium w-7">D</th>
                    <th className="text-center py-1.5 font-medium w-7">L</th>
                    <th className="text-center py-1.5 pr-1 font-bold w-8">Pts</th>
                    {hasTie && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => {
                    const meta = getTeamMeta(row.team);
                    const advances = i < 2;
                    const tied = isTiedWithNext(i) || isTiedWithPrev(i);
                    return (
                      <tr
                        key={row.team}
                        className={`border-b border-green-800/40 last:border-0 transition-colors ${
                          tied && hasTie ? 'bg-amber-900/10' : advances ? 'bg-yellow-500/5' : ''
                        }`}
                      >
                        <td className="py-1.5 px-3">
                          <span className={`font-bold ${tied && hasTie && !tieResolved ? 'text-amber-400' : advances ? 'text-yellow-400' : 'text-green-600'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-1.5 pl-0">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={getFlagUrl(meta.flag)}
                              alt={row.team}
                              className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0"
                            />
                            <span className={`font-medium ${advances ? 'text-white' : 'text-green-300'}`}>
                              {shortenName(row.team)}
                            </span>
                            {advances && row.pts > 0 && !tied && (
                              <span className="text-[10px] text-yellow-500 font-semibold ml-0.5">↑</span>
                            )}
                          </div>
                        </td>
                        <td className="py-1.5 text-center text-green-400">{row.p}</td>
                        <td className="py-1.5 text-center text-green-300">{row.w}</td>
                        <td className="py-1.5 text-center text-green-400">{row.d}</td>
                        <td className="py-1.5 text-center text-green-500">{row.l}</td>
                        <td className="py-1.5 text-center pr-1 font-bold text-yellow-400">{row.pts}</td>
                        {hasTie && (
                          <td className="py-1 pr-2">
                            <div className="flex flex-col gap-0.5 items-center">
                              <button
                                onClick={() => handleSwap(i, 'up')}
                                disabled={!isTiedWithPrev(i)}
                                className="text-[11px] leading-none px-1 py-0.5 rounded disabled:opacity-0 enabled:text-amber-400 enabled:hover:bg-amber-900/40 transition-colors"
                                aria-label="Move up"
                              >▲</button>
                              <button
                                onClick={() => handleSwap(i, 'down')}
                                disabled={!isTiedWithNext(i)}
                                className="text-[11px] leading-none px-1 py-0.5 rounded disabled:opacity-0 enabled:text-amber-400 enabled:hover:bg-amber-900/40 transition-colors"
                                aria-label="Move down"
                              >▼</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="bg-green-900/30 px-3 py-1.5 text-[10px] text-green-600">
                Top 2 advance automatically · Best 8 third-place also advance
              </div>
            </div>

            {/* Match cards */}
            {matches.map((match) => {
              const locked = isMatchLocked(match, kickoffTimes[match.matchId]);
              const pick = matchPicks[match.matchId] ?? null;

              const oddsEntry = oddsMap[match.matchId];
              const probs = oddsEntry ?? null;
              const isPolymarket = oddsEntry?.source === 'polymarket';

              const homeMeta = getTeamMeta(match.home);
              const awayMeta = getTeamMeta(match.away);

              return (
                <div
                  key={match.matchId}
                  className={`rounded-xl border p-4 transition-colors ${
                    locked
                      ? 'border-green-900 bg-green-900/30 opacity-70'
                      : pick
                      ? 'border-yellow-700/50 bg-green-900/60'
                      : 'border-green-800 bg-green-900/60'
                  }`}
                >
                  {/* Date + venue */}
                  <div className="flex justify-between items-center text-[11px] text-green-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span>{formatDate(match.date)}</span>
                      {kickoffTimes[match.matchId] && (
                        <span className="text-green-500">· {formatKickoff(kickoffTimes[match.matchId])}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="truncate">{match.city}</span>
                      {isPolymarket && (
                        <span className="text-[10px] bg-purple-900/60 text-purple-300 px-1.5 py-0.5 rounded font-medium">
                          Polymarket
                        </span>
                      )}
                      {locked && <span className="text-yellow-600 font-semibold">LOCKED</span>}
                    </div>
                  </div>

                  {/* Teams row */}
                  <div className="grid grid-cols-3 items-center gap-2 mb-4">
                    <div className="text-center">
                      <img src={getFlagUrl(homeMeta.flag)} alt={match.home} className="w-10 h-7 object-cover rounded mx-auto mb-1" />
                      <div className="text-sm font-semibold text-white leading-tight">{shortenName(match.home)}</div>
                      <div className="text-[11px] text-green-500">#{homeMeta.fifaRank}</div>
                    </div>
                    <div className="text-center text-green-600 font-bold text-xs">VS</div>
                    <div className="text-center">
                      <img src={getFlagUrl(awayMeta.flag)} alt={match.away} className="w-10 h-7 object-cover rounded mx-auto mb-1" />
                      <div className="text-sm font-semibold text-white leading-tight">{shortenName(match.away)}</div>
                      <div className="text-[11px] text-green-500">#{awayMeta.fifaRank}</div>
                    </div>
                  </div>

                  {/* Outcome buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'home' as const, label: shortenName(match.home), prob: probs?.home ?? null },
                        { key: 'draw' as const, label: 'Draw',                  prob: probs?.draw ?? null },
                        { key: 'away' as const, label: shortenName(match.away), prob: probs?.away ?? null },
                      ]
                    ).map(({ key, label, prob }) => (
                      <button
                        key={key}
                        disabled={locked}
                        onClick={() => !locked && onPickChange(match.matchId, key)}
                        className={`py-2.5 px-1 rounded-lg text-center transition-all select-none ${
                          pick === key
                            ? 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-900/40'
                            : locked
                            ? 'bg-green-800/40 text-green-600 cursor-not-allowed'
                            : 'bg-green-800 hover:bg-green-700 text-white cursor-pointer'
                        }`}
                      >
                        <div className="text-xs font-semibold truncate">{label}</div>
                        {prob !== null && (
                          <div className={`text-[13px] font-mono font-bold mt-0.5 ${pick === key ? 'text-black/70' : 'text-green-300'}`}>
                            {pct(prob)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-green-800 px-5 py-3 flex justify-between items-center">
            <span className="text-[11px] text-green-600">
              {hasPolymarket ? 'Odds: Polymarket prediction market' : 'Odds not yet available'}
            </span>
            <button
              onClick={onClose}
              className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-4 py-1.5 rounded-lg transition-colors text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
