import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface UserScore {
  id: number;
  username: string;
  score: number;
  groupPicksCount: number;
  bracketPicksCount: number;
  championPick: string | null;
}

export default async function StandingsPage() {
  const currentUser = await getSessionUser();

  const matchResults = await prisma.matchResult.findMany();
  const users = await prisma.user.findMany({
    include: { matchPicks: true, bracketPicks: true },
    orderBy: { createdAt: 'asc' },
  });

  const scores: UserScore[] = users.map((user) => {
    const championPick = user.bracketPicks.find((p) => p.round === 'Final' && p.slot === 0)?.team ?? null;
    return {
      id: user.id,
      username: user.username,
      score: 0,
      groupPicksCount: user.matchPicks.length,
      bracketPicksCount: user.bracketPicks.length,
      championPick,
    };
  });

  scores.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
  const finishedMatches = matchResults.filter((r) => r.status === 'finished').length;

  const scoringRows = [
    ['Correct pick', '+1 pt', true],
    ['Wrong pick', '−1 pt', false],
    ['Round of 32', '2 pts', true],
    ['Round of 16', '3 pts', true],
    ['Quarter-final', '5 pts', true],
    ['Semi-final', '8 pts', true],
    ['Final', '13 pts', true],
    ['Champion', '20 pts', true],
  ] as const;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div>
        <p className="text-wc-navy-400 text-xs uppercase tracking-widest font-medium mb-1">Leaderboard</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Standings</h1>
        <p className="text-wc-navy-300 text-sm mt-1">
          {finishedMatches} match{finishedMatches !== 1 ? 'es' : ''} completed · scores update automatically
        </p>
      </div>

      {/* Scoring reference */}
      <div className="card">
        <h3 className="text-xs font-semibold text-wc-navy-400 uppercase tracking-widest mb-3">Scoring system</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
          {scoringRows.map(([label, pts, isGold]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-wc-navy-300">{label}</span>
              <span className={`font-bold ml-2 ${isGold ? 'text-wc-gold-400' : 'text-wc-red-400'}`}>{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {scores.length === 0 ? (
          <div className="text-center py-12 px-5">
            <p className="text-wc-navy-400 text-sm">No players yet — invite friends to join!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wc-navy-700">
                  <th className="text-left py-3 px-4 text-wc-navy-400 font-medium text-xs uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-wc-navy-400 font-medium text-xs uppercase tracking-wider">Player</th>
                  <th className="text-right py-3 px-4 text-wc-navy-400 font-medium text-xs uppercase tracking-wider">Pts</th>
                  <th className="text-right py-3 px-4 text-wc-navy-400 font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Groups</th>
                  <th className="text-right py-3 px-4 text-wc-navy-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Bracket</th>
                  <th className="text-right py-3 px-4 text-wc-navy-400 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Champion</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((u, index) => {
                  const isCurrentUser = u.username === currentUser?.username;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-wc-navy-800/60 last:border-0 transition-colors ${
                        isCurrentUser ? 'bg-wc-gold-400/8' : 'hover:bg-wc-navy-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className={`font-bold tabular-nums text-xs ${index === 0 ? 'text-wc-gold-400' : 'text-wc-navy-500'}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isCurrentUser ? 'text-wc-gold-300' : 'text-white'}`}>
                            {u.username}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-wc-navy-500 uppercase tracking-wider">you</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-white tabular-nums text-base">{u.score}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-wc-navy-400 hidden sm:table-cell tabular-nums">
                        {u.groupPicksCount}/72
                      </td>
                      <td className="py-3.5 px-4 text-right text-wc-navy-400 hidden md:table-cell tabular-nums">
                        {u.bracketPicksCount}
                      </td>
                      <td className="py-3.5 px-4 text-right hidden md:table-cell">
                        {u.championPick
                          ? <span className="text-wc-gold-400">{u.championPick}</span>
                          : <span className="text-wc-navy-700">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
