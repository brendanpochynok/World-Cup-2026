'use client';

import type { MatchData } from '@/app/api/scores/route';

function localTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default function LiveScoreCard({ match }: { match: MatchData }) {
  const { home, away, homeScore, awayScore, status, clock, group, matchNumber, venue, city, kickoffIso } = match;
  const isLive      = status === 'live';
  const isFinished  = status === 'finished';
  const isScheduled = status === 'scheduled';

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

      {/* Footer: venue + city (+ kickoff time for finished matches) */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 text-center space-y-0.5">
        {isFinished && kickoffIso && (
          <div className="text-[11px] text-gray-400 font-medium">{localTime(kickoffIso)}</div>
        )}
        <div className="text-[11px] text-gray-400 truncate">{venue}, {city}</div>
      </div>
    </div>
  );
}
