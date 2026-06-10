'use client';

import { useState, useEffect } from 'react';
import type { MatchData } from '@/app/api/scores/route';
import type { MatchOdds } from '@/app/api/odds/route';
import type { PickDistribution } from '@/app/api/picks/distribution/route';
import { getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';

function localTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
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

function pct(p: number) { return `${Math.round(p * 100)}%`; }

function formatCountdown(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

interface LiveScoreCardProps {
  match: MatchData;
  odds?: MatchOdds | null;
  currentPick?: string | null;
  distribution?: PickDistribution | null;
  onPickChange?: (matchId: string, pick: string) => void;
}

export default function LiveScoreCard({ match, odds, currentPick, distribution, onPickChange }: LiveScoreCardProps) {
  const [showPlayers, setShowPlayers] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  const { home, away, homeScore, awayScore, status, clock, group, matchNumber, venue, city, kickoffIso } = match;
  const isLive      = status === 'live';
  const isFinished  = status === 'finished';
  const isScheduled = status === 'scheduled';

  const locked = kickoffIso ? new Date() >= new Date(kickoffIso) : (isLive || isFinished);

  useEffect(() => {
    if (!isScheduled || !kickoffIso) return;
    const update = () => setCountdown(formatCountdown(kickoffIso));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [isScheduled, kickoffIso]);
  const canPick = !locked && !!onPickChange;

  const homeMeta = getTeamMeta(home);
  const awayMeta = getTeamMeta(away);

  const options = [
    { value: 'home', label: shortenName(home), prob: odds?.home ?? null },
    { value: 'draw', label: 'Draw',            prob: odds?.draw ?? null },
    { value: 'away', label: shortenName(away), prob: odds?.away ?? null },
  ];

  return (
    <div className={`relative rounded-xl border p-4 bg-white shadow-sm transition-all ${
      isLive ? 'border-wc-red-200' : 'border-gray-200'
    }`}>
      {isLive && <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-wc-red-500" />}

      {/* Top row: group + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-gray-400 font-bold">
          Group {group} · Match {matchNumber}
        </span>
        {isLive && (
          <span className="flex items-center gap-1.5 text-[11px] bg-wc-red-50 text-wc-red-500 border border-wc-red-200 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-wc-red-500 rounded-full animate-pulse" />
            LIVE{clock ? ` ${clock}′` : ''}
          </span>
        )}
        {isFinished && <span className="text-[11px] text-gray-400 font-bold">FT</span>}
        {isScheduled && (
          <span className="text-[11px] text-gray-500 font-bold tabular-nums">
            {kickoffIso ? localTime(kickoffIso) : 'TBD'}
          </span>
        )}
      </div>

      {/* Teams: flags + names + score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-1 text-center">
          <img
            src={getFlagUrl(homeMeta.flag)}
            alt={home}
            className="w-10 h-7 object-cover rounded shadow-sm"
          />
          <div className="font-bold text-gray-900 text-xs leading-tight">{shortenName(home)}</div>
          <div className="text-[11px] text-gray-400 font-medium">#{homeMeta.fifaRank}</div>
        </div>

        {/* Score / VS */}
        <div className="px-2 text-center flex-shrink-0 min-w-[3.5rem]">
          {isScheduled ? (
            <div className="text-gray-300 text-sm font-bold">VS</div>
          ) : (
            <div className={`text-2xl font-bold tabular-nums leading-none ${isLive ? 'text-wc-red-500' : 'text-gray-900'}`}>
              {homeScore}–{awayScore}
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-1 text-center">
          <img
            src={getFlagUrl(awayMeta.flag)}
            alt={away}
            className="w-10 h-7 object-cover rounded shadow-sm"
          />
          <div className="font-bold text-gray-900 text-xs leading-tight">{shortenName(away)}</div>
          <div className="text-[11px] text-gray-400 font-medium">#{awayMeta.fifaRank}</div>
        </div>
      </div>

      {/* Odds — shown for scheduled matches as read-only bars */}
      {isScheduled && odds && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {options.map(({ value, label, prob }) => (
            <div key={value} className="text-center">
              <div className="text-[11px] font-bold tabular-nums text-gray-700">
                {prob !== null ? pct(prob) : '—'}
              </div>
              <div className="w-full h-1 rounded-full bg-gray-100 mt-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-wc-blue-300"
                  style={{ width: prob !== null ? `${Math.round(prob * 100)}%` : '0%' }}
                />
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 truncate">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Footer: venue */}
      <div className="pt-2.5 border-t border-gray-100 text-center space-y-0.5">
        {isFinished && kickoffIso && (
          <div className="text-[11px] text-gray-400 font-medium">{localTime(kickoffIso)}</div>
        )}
        <div className="text-[11px] text-gray-400 truncate">{venue}, {city}</div>
      </div>

      {/* Pick buttons — unlocked + logged in */}
      {canPick && (
        <div className="mt-3">
        {countdown && (
          <p className="text-[11px] text-amber-500 font-semibold text-center mb-1.5">Locks in {countdown}</p>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          {options.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onPickChange(match.matchId, value)}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold text-center transition-colors ${
                currentPick === value
                  ? 'bg-wc-blue-500 text-white font-bold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        </div>
      )}

      {/* Your pick (locked) */}
      {locked && onPickChange && currentPick && (
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-medium">Your pick</span>
          <span className="text-[11px] font-bold text-wc-blue-600 bg-wc-blue-50 border border-wc-blue-200 px-2 py-0.5 rounded-full">
            {currentPick === 'home' ? shortenName(home) : currentPick === 'away' ? shortenName(away) : 'Draw'}
          </span>
        </div>
      )}

      {/* Pool distribution (locked) */}
      {locked && distribution && distribution.total > 0 && (
        <div className={`mt-2.5 ${onPickChange && currentPick ? '' : 'pt-2.5 border-t border-gray-100'}`}>
          <div className="text-[11px] text-gray-400 font-semibold mb-1.5">
            Pool picks · {distribution.total}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {options.map(({ value, label }) => {
              const val = distribution[value as 'home' | 'draw' | 'away'];
              const isMyPick = currentPick === value;
              return (
                <div key={value} className="text-center">
                  <div className={`text-xs font-bold tabular-nums ${isMyPick ? 'text-wc-blue-500' : 'text-gray-600'}`}>
                    {Math.round(val * 100)}%
                  </div>
                  <div className="w-full h-1 rounded-full bg-gray-100 mt-0.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isMyPick ? 'bg-wc-blue-400' : 'bg-gray-300'}`}
                      style={{ width: `${Math.round(val * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5 truncate">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Players toggle */}
      <div className="mt-3 pt-2.5 border-t border-gray-100">
        <button
          onClick={() => setShowPlayers((p) => !p)}
          className="w-full flex items-center justify-center gap-1 text-[11px] text-gray-400 font-semibold hover:text-gray-600 transition-colors"
        >
          Key Players
          <svg className={`w-3 h-3 transition-transform duration-150 ${showPlayers ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showPlayers && (
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0">
            <div className="space-y-1.5">
              {homeMeta.players.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-100 rounded px-1 py-0.5 w-6 text-center flex-shrink-0">{p.position}</span>
                  <span className="text-[11px] text-gray-700 font-medium truncate">{p.name}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {awayMeta.players.map((p) => (
                <div key={p.name} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-100 rounded px-1 py-0.5 w-6 text-center flex-shrink-0">{p.position}</span>
                  <span className="text-[11px] text-gray-700 font-medium truncate">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
