'use client';

interface LiveScoreCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  clock: string;
  competition: string;
}

export default function LiveScoreCard({
  homeTeam, awayTeam, homeScore, awayScore, status, clock, competition,
}: LiveScoreCardProps) {
  const isLive   = status === 'in' || status === '1' || status === '2';
  const isFinal  = status === 'post';
  const isPre    = status === 'pre';

  return (
    <div className={`card border transition-colors ${isLive ? 'border-wc-red-500/60 bg-wc-red-700/5' : 'border-wc-navy-700'}`}>
      <div className="text-[10px] text-wc-navy-500 mb-3 font-medium uppercase tracking-wider">{competition}</div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{homeTeam}</div>
        </div>

        <div className="px-3 text-center flex-shrink-0">
          {isPre ? (
            <div className="text-wc-navy-400 text-sm font-medium">vs</div>
          ) : (
            <div className="text-xl font-bold text-wc-gold-400 tabular-nums">
              {homeScore} – {awayScore}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="font-semibold text-white text-sm truncate">{awayTeam}</div>
        </div>
      </div>

      <div className="mt-3 text-center">
        {isLive && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-wc-red-500 text-white px-2.5 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE{clock ? ` · ${clock}'` : ''}
          </span>
        )}
        {isFinal && <span className="text-xs text-wc-navy-400 font-medium">Full Time</span>}
        {isPre && <span className="text-xs text-wc-navy-400 font-medium">Upcoming</span>}
        {!isLive && !isFinal && !isPre && (
          <span className="text-xs text-wc-navy-400 capitalize">{status}</span>
        )}
      </div>
    </div>
  );
}
