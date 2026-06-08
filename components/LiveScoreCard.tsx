'use client';

import type { MatchData } from '@/app/api/scores/route';
import type { PickDistribution } from '@/app/api/picks/distribution/route';

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

interface LiveScoreCardProps {
  match: MatchData;
  currentPick?: string | null;
  distribution?: PickDistribution | null;
  onPickChange?: (matchId: string, pick: string) => void;
}

export default function LiveScoreCard({ match, currentPick, distribution, onPickChange }: LiveScoreCardProps) {
  const { home, away, homeScore, awayScore, status, clock, group, matchNumber, venue, city, kickoffIso } = match;
  const isLive      = status === 'live';
  const isFinished  = status === 'finished';
  const isScheduled = status === 'scheduled';

  const locked = kickoffIso ? new Date() >= new Date(kickoffIso) : (isLive || isFinished);
  const canPick = !locked && !!onPickChange;

  const options = [
    { value: 'home', label: shortenName(home) },
    { value: 'draw', label: 'Draw' },
    { value: 'away', label: shortenName(away) },
  ];

  return (
    <div className={`relative rounded-2xl border p-4 bg-white shadow-sm transition-all ${
      isLive ? 'border-wc-red-200' : 'border-gray-200'
    }`}>
      {isLive && <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl bg-wc-red-500" />}

      {/* Top row: group badge + status pill */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.12em]">
          Group {group} &middot; Match {matchNumber}
        </span>

        {isLive && (
          <span className="flex items-center gap-1.5 text-[11px] bg-wc-red-50 text-wc-red-500 border border-wc-red-200 px-2 py-0.5 rounded-full font-black flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-wc-red-500 rounded-full animate-pulse" />
            LIVE{clock ? ` ${clock}′` : ''}
          </span>
        )}
        {isFinished && (
          <span className="text-[11px] text-gray-400 font-bold">FT</span>
        )}
        {isScheduled && (
          <span className="text-[11px] text-gray-500 font-bold tabular-nums">
            {kickoffIso ? localTime(kickoffIso) : 'TBD'}
          </span>
        )}
      </div>

      {/* Teams + score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-right">
          <div className="font-bold text-gray-900 text-sm leading-tight">{home}</div>
        </div>

        <div className="px-2 text-center flex-shrink-0 min-w-[3.5rem]">
          {isScheduled ? (
            <div className="text-gray-300 text-sm font-black">VS</div>
          ) : (
            <div className={`text-2xl font-black tabular-nums leading-none ${isLive ? 'text-wc-red-500' : 'text-gray-900'}`}>
              {homeScore}–{awayScore}
            </div>
          )}
        </div>

        <div className="text-left">
          <div className="font-bold text-gray-900 text-sm leading-tight">{away}</div>
        </div>
      </div>

      {/* Footer: venue/city */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 text-center space-y-0.5">
        {isFinished && kickoffIso && (
          <div className="text-[11px] text-gray-400 font-medium">{localTime(kickoffIso)}</div>
        )}
        <div className="text-[11px] text-gray-400 truncate">{venue}, {city}</div>
      </div>

      {/* Pick buttons — only shown when not locked and user is logged in */}
      {canPick && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onPickChange(match.matchId, opt.value)}
              className={`py-1.5 px-1 rounded-lg text-xs font-semibold text-center transition-colors ${
                currentPick === opt.value
                  ? 'bg-wc-blue-500 text-white font-bold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Your pick indicator (locked) */}
      {locked && onPickChange && currentPick && (
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-medium">Your pick</span>
          <span className="text-[11px] font-bold text-wc-blue-600 bg-wc-blue-50 border border-wc-blue-200 px-2 py-0.5 rounded-full">
            {currentPick === 'home' ? shortenName(home) : currentPick === 'away' ? shortenName(away) : 'Draw'}
          </span>
        </div>
      )}

      {/* Pool distribution — shown after lock */}
      {locked && distribution && distribution.total > 0 && (
        <div className={`mt-2.5 ${onPickChange && currentPick ? '' : 'pt-2.5 border-t border-gray-100'}`}>
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">
            Pool picks · {distribution.total}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {options.map((opt) => {
              const val = distribution[opt.value as 'home' | 'draw' | 'away'];
              const isMyPick = currentPick === opt.value;
              return (
                <div key={opt.value} className="text-center">
                  <div className={`text-xs font-black tabular-nums ${isMyPick ? 'text-wc-blue-500' : 'text-gray-600'}`}>
                    {Math.round(val * 100)}%
                  </div>
                  <div className="w-full h-1 rounded-full bg-gray-100 mt-0.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isMyPick ? 'bg-wc-blue-400' : 'bg-gray-300'}`}
                      style={{ width: `${Math.round(val * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate">{opt.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
