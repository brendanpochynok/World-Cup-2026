'use client';

import { useEffect, useCallback, useMemo } from 'react';
import {
  Group, getGroupMatches, getTeamMeta, getFlagUrl,
  isMatchLocked, computeGroupStandings,
} from '@/lib/worldcup-data';
import type { MatchOdds } from '@/app/api/odds/route';
import type { PickDistribution } from '@/app/api/picks/distribution/route';

interface GroupDetailModalProps {
  group: Group;
  matchPicks: Record<string, string>;
  onPickChange: (matchId: string, pick: string) => void;
  onClose: () => void;
  oddsMap?: Record<string, MatchOdds>;
  kickoffTimes?: Record<string, string>;
  advancementScores?: Record<string, number>;
  distribution?: Record<string, PickDistribution>;
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
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatKickoff(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function pct(p: number) { return `${Math.round(p * 100)}%`; }

export default function GroupDetailModal({
  group, matchPicks, onPickChange, onClose,
  oddsMap = {}, kickoffTimes = {}, advancementScores, distribution = {},
}: GroupDetailModalProps) {
  const matches = getGroupMatches(group.id);
  const pickedCount = matches.filter((m) => matchPicks[m.matchId]).length;

  const standings = useMemo(
    () => computeGroupStandings(group.id, matchPicks, advancementScores),
    [group.id, matchPicks, advancementScores]
  );

  const hasAnyPick = pickedCount > 0;
  const hasPolymarket = matches.some((m) => oddsMap[m.matchId]?.source === 'polymarket');

  const handleKey = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [handleKey]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-label={`${group.name} match picks`}
        className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 p-0 sm:p-4">
        <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-xl max-h-[92vh] flex flex-col shadow-2xl">

          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
            <div>
              <h2 className="text-gray-900 font-bold text-lg">{group.name}</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                {pickedCount}/{matches.length} picks · correct +1 · wrong −1
              </p>
            </div>
            <button onClick={onClose}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4">

            {/* Standings */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
                <span className="text-gray-600 text-xs font-bold uppercase tracking-wider">Predicted Standings</span>
                {!hasAnyPick && <span className="text-gray-400 text-[11px]">Pick matches below to update</span>}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1.5 px-3 font-medium">#</th>
                    <th className="text-left py-1.5 pl-0 font-medium">Team</th>
                    <th className="text-center py-1.5 font-medium w-7">P</th>
                    <th className="text-center py-1.5 font-medium w-7">W</th>
                    <th className="text-center py-1.5 font-medium w-7">D</th>
                    <th className="text-center py-1.5 font-medium w-7">L</th>
                    <th className="text-center py-1.5 pr-1 font-bold w-8">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, i) => {
                    const meta = getTeamMeta(row.team);
                    const advances = i < 2;
                    return (
                      <tr key={row.team}
                        className={`border-b border-gray-100 last:border-0 ${advances ? 'bg-wc-blue-500/4' : ''}`}>
                        <td className="py-1.5 px-3">
                          <span className={`font-bold ${advances ? 'text-wc-blue-500' : 'text-gray-300'}`}>{i + 1}</span>
                        </td>
                        <td className="py-1.5 pl-0">
                          <div className="flex items-center gap-1.5">
                            <img src={getFlagUrl(meta.flag)} alt={row.team} className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
                            <span className={`font-medium ${advances ? 'text-gray-900' : 'text-gray-500'}`}>{shortenName(row.team)}</span>
                            {advances && row.pts > 0 && <span className="text-[10px] text-wc-blue-400 ml-0.5">↑</span>}
                          </div>
                        </td>
                        <td className="py-1.5 text-center text-gray-400">{row.p}</td>
                        <td className="py-1.5 text-center text-gray-600">{row.w}</td>
                        <td className="py-1.5 text-center text-gray-400">{row.d}</td>
                        <td className="py-1.5 text-center text-gray-400">{row.l}</td>
                        <td className="py-1.5 text-center pr-1 font-bold text-gray-900">{row.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="bg-gray-50 px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
                Top 2 advance · Best 8 third-place also advance · Ties broken by Polymarket odds
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
                <div key={match.matchId}
                  className={`rounded-xl border p-4 transition-colors ${
                    locked
                      ? 'border-gray-100 bg-gray-50 opacity-70'
                      : pick
                      ? 'border-wc-blue-200 bg-wc-blue-500/3'
                      : 'border-gray-200 bg-white'
                  }`}>
                  <div className="flex justify-between items-center text-[11px] text-gray-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span>{formatDate(match.date)}</span>
                      {kickoffTimes[match.matchId] && (
                        <span className="text-gray-400">· {formatKickoff(kickoffTimes[match.matchId])}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="truncate">{match.city}</span>
                      {isPolymarket && (
                        <span className="text-[10px] bg-wc-blue-50 text-wc-blue-500 border border-wc-blue-200 px-1.5 py-0.5 rounded font-medium">Polymarket</span>
                      )}
                      {locked && <span className="text-wc-red-500 font-semibold text-[10px] uppercase">Locked</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 items-center gap-2 mb-4">
                    <div className="text-center">
                      <img src={getFlagUrl(homeMeta.flag)} alt={match.home} className="w-10 h-7 object-cover rounded mx-auto mb-1" />
                      <div className="text-sm font-semibold text-gray-900 leading-tight">{shortenName(match.home)}</div>
                      <div className="text-[11px] text-gray-400">#{homeMeta.fifaRank}</div>
                    </div>
                    <div className="text-center text-gray-300 font-bold text-xs">VS</div>
                    <div className="text-center">
                      <img src={getFlagUrl(awayMeta.flag)} alt={match.away} className="w-10 h-7 object-cover rounded mx-auto mb-1" />
                      <div className="text-sm font-semibold text-gray-900 leading-tight">{shortenName(match.away)}</div>
                      <div className="text-[11px] text-gray-400">#{awayMeta.fifaRank}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'home' as const, label: shortenName(match.home), prob: probs?.home ?? null },
                      { key: 'draw' as const, label: 'Draw',                  prob: probs?.draw ?? null },
                      { key: 'away' as const, label: shortenName(match.away), prob: probs?.away ?? null },
                    ]).map(({ key, label, prob }) => (
                      <button key={key} disabled={locked}
                        onClick={() => !locked && onPickChange(match.matchId, key)}
                        className={`py-2.5 px-1 rounded-lg text-center transition-all select-none ${
                          pick === key
                            ? 'bg-wc-blue-500 text-white font-bold shadow-sm'
                            : locked
                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
                        }`}>
                        <div className="text-xs font-semibold truncate">{label}</div>
                        {prob !== null && (
                          <div className={`text-[13px] font-mono font-bold mt-0.5 ${pick === key ? 'text-white/70' : 'text-gray-400'}`}>
                            {pct(prob)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Pool pick distribution — only shown after lock */}
                  {(() => {
                    const dist = distribution[match.matchId];
                    if (!locked || !dist || dist.total === 0) return null;
                    const items = [
                      { key: 'home', label: shortenName(match.home), val: dist.home },
                      { key: 'draw', label: 'Draw',                  val: dist.draw },
                      { key: 'away', label: shortenName(match.away), val: dist.away },
                    ];
                    return (
                      <div className="mt-3 pt-2.5 border-t border-gray-100">
                        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">
                          Pool picks · {dist.total} {dist.total === 1 ? 'player' : 'players'}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {items.map(({ key, label, val }) => (
                            <div key={key} className="text-center">
                              <div className={`text-sm font-bold tabular-nums ${pick === key ? 'text-wc-blue-500' : 'text-gray-700'}`}>
                                {Math.round(val * 100)}%
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-gray-100 mt-1 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${pick === key ? 'bg-wc-blue-400' : 'bg-gray-300'}`}
                                  style={{ width: `${Math.round(val * 100)}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1 truncate">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3 flex justify-between items-center bg-white rounded-b-2xl">
            <span className="text-[11px] text-gray-400">
              {hasPolymarket ? 'Odds: Polymarket prediction market' : 'Odds not yet available'}
            </span>
            <button onClick={onClose} className="btn-primary text-xs py-1.5 px-4">Done</button>
          </div>
        </div>
      </div>
    </>
  );
}
