'use client';

interface GroupMatchCardProps {
  matchId: string;
  home: string;
  away: string;
  date: string;
  venue: string;
  city: string;
  currentPick: string | null;
  locked: boolean;
  result: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  onPickChange: (matchId: string, pick: string) => void;
}

export default function GroupMatchCard({
  matchId,
  home,
  away,
  date,
  venue,
  city,
  currentPick,
  locked,
  result,
  homeGoals,
  awayGoals,
  status,
  onPickChange,
}: GroupMatchCardProps) {
  const isCorrect = result && currentPick === result;
  const isWrong = result && currentPick && currentPick !== result;

  const formatDate = (d: string) => {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const options = [
    { value: 'home', label: home },
    { value: 'draw', label: 'Draw' },
    { value: 'away', label: away },
  ];

  return (
    <div
      className={`card relative ${
        isCorrect
          ? 'border-wc-green-400'
          : isWrong
          ? 'border-wc-red-400'
          : 'border-gray-200'
      }`}
    >
      {/* Status badges */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-mono">{matchId}</span>
        <div className="flex items-center gap-2">
          {status === 'live' && (
            <span className="flex items-center gap-1 text-xs bg-wc-red-500 text-white px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {locked && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              Locked
            </span>
          )}
          {isCorrect && (
            <span className="text-xs bg-wc-green-50 text-wc-green-700 border border-wc-green-200 px-2 py-0.5 rounded-full font-bold">
              +1pt
            </span>
          )}
          {isWrong && (
            <span className="text-xs bg-red-50 text-wc-red-600 border border-red-200 px-2 py-0.5 rounded-full font-bold">
              −1pt
            </span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-900 text-sm flex-1 text-right pr-2">
          {home}
        </span>
        {status === 'finished' || status === 'live' ? (
          <span className="text-gray-900 font-black text-lg px-2 min-w-[3rem] text-center tabular-nums">
            {homeGoals ?? 0} – {awayGoals ?? 0}
          </span>
        ) : (
          <span className="text-gray-300 text-sm px-2 font-bold">vs</span>
        )}
        <span className="font-semibold text-gray-900 text-sm flex-1 text-left pl-2">
          {away}
        </span>
      </div>

      {/* Date/Venue */}
      <div className="text-xs text-gray-400 text-center mb-3">
        {formatDate(date)} · {city}
      </div>

      {/* Pick options */}
      <div className="grid grid-cols-3 gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            disabled={locked}
            onClick={() => !locked && onPickChange(matchId, opt.value)}
            className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-colors duration-150 text-center ${
              currentPick === opt.value
                ? 'bg-wc-blue-500 text-white font-bold'
                : locked
                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
            }`}
          >
            {opt.value === 'home' ? home.split(' ')[0] : opt.value === 'away' ? away.split(' ')[0] : 'Draw'}
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-2 text-xs text-center text-gray-400">
          Result: {result === 'home' ? home + ' win' : result === 'away' ? away + ' win' : 'Draw'}
        </div>
      )}
    </div>
  );
}
