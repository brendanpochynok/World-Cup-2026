'use client';

import { useEffect, useState, useCallback } from 'react';
import type { PlayerPickEntry, BracketPickEntry } from '@/app/api/players/[username]/picks/route';
import { BRACKET_ROUNDS } from '@/lib/worldcup-data';

interface Props {
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  onClose: () => void;
}

function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
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

export default function PlayerPicksModal({ username, displayName, avatarUrl: avatarProp, onClose }: Props) {
  const [picks, setPicks] = useState<PlayerPickEntry[] | null>(null);
  const [bracketPicks, setBracketPicks] = useState<BracketPickEntry[] | null>(null);
  const [bracketLocked, setBracketLocked] = useState(false);
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(avatarProp ?? null);
  const [myPicks, setMyPicks] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState('');

  const label = displayName ?? username;

  useEffect(() => {
    fetch(`/api/players/${encodeURIComponent(username)}/picks`)
      .then((r) => r.json())
      .then((d) => {
        setPicks(d.picks ?? []);
        setBracketPicks(d.bracketPicks ?? []);
        setBracketLocked(d.bracketLocked ?? false);
        if (!avatarProp && d.avatarUrl) setResolvedAvatar(d.avatarUrl);
      })
      .catch(() => setError('Failed to load picks'));
  }, [username, avatarProp]);

  useEffect(() => {
    fetch('/api/picks/groups')
      .then((r) => r.json())
      .then((d) => setMyPicks(d.picks ?? {}))
      .catch(() => {});
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [handleKey]);

  const byGroup = picks ? groupBy(picks, (p) => p.group) : null;
  const groupKeys = byGroup ? Array.from(byGroup.keys()).sort() : [];

  const correct = picks?.filter((p) => p.result && p.pick === p.result).length ?? 0;
  const wrong   = picks?.filter((p) => p.result && p.pick !== p.result).length ?? 0;
  const score   = correct - wrong;
  const agreed  = (picks && myPicks) ? picks.filter((p) => myPicks[p.matchId] === p.pick).length : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} aria-hidden="true" />

      <div role="dialog" aria-modal="true" aria-label={`${label}'s picks`}
        className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 p-0 sm:p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">

          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {resolvedAvatar ? (
                <img src={resolvedAvatar} alt={label} className="w-10 h-10 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-gray-500 uppercase">{label.charAt(0)}</span>
                </div>
              )}
            <div>
              <h2 className="text-gray-900 font-black text-lg">{label}&rsquo;s Picks</h2>
              {picks !== null && picks.length > 0 && (
                <p className="text-gray-400 text-xs mt-0.5">
                  {picks.length} locked pick{picks.length !== 1 ? 's' : ''}
                  {correct + wrong > 0 && (
                    <>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className="text-wc-green-600 font-semibold">{correct} correct</span>
                      <span className="mx-1 text-gray-300">/</span>
                      <span className="text-wc-red-500 font-semibold">{wrong} wrong</span>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className={`font-black ${score > 0 ? 'text-wc-green-600' : score < 0 ? 'text-wc-red-500' : 'text-gray-500'}`}>
                        {score > 0 ? '+' : ''}{score} pts
                      </span>
                    </>
                  )}
                  {agreed !== null && (
                    <>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <span className="text-wc-blue-500 font-semibold">you agree on {agreed}/{picks.length}</span>
                    </>
                  )}
                </p>
              )}
            </div>
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

            {/* Loading */}
            {picks === null && !error && (
              <div className="flex items-center justify-center h-32 gap-2">
                <svg className="w-5 h-5 text-wc-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="text-gray-400 text-sm">Loading picks…</span>
              </div>
            )}

            {/* Error */}
            {error && <p className="text-wc-red-500 text-sm text-center py-8">{error}</p>}

            {/* No locked picks yet */}
            {picks !== null && picks.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-900 font-bold text-sm">No locked picks yet</p>
                <p className="text-gray-400 text-xs mt-1">Picks become visible once a match kicks off.</p>
              </div>
            )}

            {/* Bracket picks */}
            {bracketLocked && bracketPicks !== null && bracketPicks.length > 0 && (() => {
              const byRound = new Map<string, BracketPickEntry[]>();
              for (const bp of bracketPicks) {
                const list = byRound.get(bp.round) ?? [];
                list.push(bp);
                byRound.set(bp.round, list);
              }
              return (
                <div className="rounded-xl border border-wc-gold-200 overflow-hidden">
                  <div className="bg-wc-gold-50 px-3 py-2 border-b border-wc-gold-200">
                    <span className="text-wc-gold-700 text-xs font-bold uppercase tracking-wider">Bracket Picks</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {BRACKET_ROUNDS.slice().reverse().map((r) => {
                      const rPicks = byRound.get(r.id);
                      if (!rPicks || rPicks.length === 0) return null;
                      return (
                        <div key={r.id} className="px-3 py-2.5">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{r.name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {rPicks.map((bp) => (
                              <span key={`${bp.round}-${bp.slot}`} className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${
                                bp.correct === true  ? 'bg-wc-green-50 text-wc-green-700 border-wc-green-200'
                                : bp.correct === false ? 'bg-red-50 text-wc-red-600 border-red-200'
                                : 'bg-wc-gold-50 text-wc-gold-700 border-wc-gold-200'
                              }`}>
                                {shortenName(bp.team)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Picks grouped by group */}
            {groupKeys.map((groupId) => {
              const groupPicks = byGroup!.get(groupId)!;
              return (
                <div key={groupId} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <span className="text-gray-600 text-xs font-bold uppercase tracking-wider">Group {groupId}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {groupPicks.map((entry) => {
                      const isCorrect = entry.result && entry.pick === entry.result;
                      const isWrong   = entry.result && entry.pick !== entry.result;
                      const pickLabel =
                        entry.pick === 'home' ? shortenName(entry.home)
                        : entry.pick === 'away' ? shortenName(entry.away)
                        : 'Draw';

                      return (
                        <div key={entry.matchId} className="px-3 py-2.5 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-700 truncate">
                              {shortenName(entry.home)} <span className="text-gray-300 mx-0.5">vs</span> {shortenName(entry.away)}
                            </div>
                            {entry.result && (
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                {entry.homeGoals} – {entry.awayGoals}
                                <span className="mx-1 text-gray-200">·</span>
                                {entry.result === 'home' ? shortenName(entry.home) + ' win' : entry.result === 'away' ? shortenName(entry.away) + ' win' : 'Draw'}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                              isCorrect ? 'bg-wc-green-50 text-wc-green-700 border border-wc-green-200'
                              : isWrong  ? 'bg-red-50 text-wc-red-600 border border-red-200'
                              : 'bg-wc-blue-50 text-wc-blue-600 border border-wc-blue-200'
                            }`}>
                              {pickLabel}
                            </span>
                            {isCorrect && (
                              <span className="text-[11px] font-black text-wc-green-600">+1</span>
                            )}
                            {isWrong && (
                              <span className="text-[11px] font-black text-wc-red-500">−1</span>
                            )}
                            {myPicks && (
                              <span className={`text-[11px] font-black ${myPicks[entry.matchId] === entry.pick ? 'text-wc-blue-400' : 'text-gray-300'}`} title={myPicks[entry.matchId] === entry.pick ? 'Same pick' : 'Different pick'}>
                                {myPicks[entry.matchId] === entry.pick ? '=' : '≠'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          </div>

          <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3 flex justify-end bg-white rounded-b-2xl">
            <button onClick={onClose} className="btn-primary text-xs py-1.5 px-4">Close</button>
          </div>
        </div>
      </div>
    </>
  );
}
