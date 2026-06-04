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

  // Get all match results
  const matchResults = await prisma.matchResult.findMany();

  // Get all users with picks
  const users = await prisma.user.findMany({
    include: {
      matchPicks: true,
      bracketPicks: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const scores: UserScore[] = users.map((user) => {
    const score = 0;

    const championPick =
      user.bracketPicks.find((p) => p.round === 'Final' && p.slot === 0)?.team ?? null;

    return {
      id: user.id,
      username: user.username,
      score,
      groupPicksCount: user.matchPicks.length,
      bracketPicksCount: user.bracketPicks.length,
      championPick,
    };
  });

  // Sort by score descending, then username
  scores.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));

  const finishedMatches = matchResults.filter((r) => r.status === 'finished').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Standings</h1>
        <p className="text-wc-green-300 text-sm mt-1">
          Live leaderboard · {finishedMatches} matches completed
        </p>
      </div>

      {/* Scoring reference */}
      <div className="card bg-wc-green-900/50 border-wc-green-800">
        <h3 className="text-sm font-bold text-wc-gold-400 mb-2">Scoring System</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-wc-green-300">
          <div>Correct result: <span className="text-wc-gold-400 font-bold">3 pts</span></div>
          <div>R32 pick: <span className="text-wc-gold-400 font-bold">2 pts</span></div>
          <div>R16 pick: <span className="text-wc-gold-400 font-bold">3 pts</span></div>
          <div>QF pick: <span className="text-wc-gold-400 font-bold">5 pts</span></div>
          <div>SF pick: <span className="text-wc-gold-400 font-bold">8 pts</span></div>
          <div>Final pick: <span className="text-wc-gold-400 font-bold">13 pts</span></div>
          <div>Champion: <span className="text-wc-gold-400 font-bold">20 pts</span></div>
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="card overflow-hidden">
        {scores.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-wc-green-300">No players yet. Invite friends to join!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-wc-green-700">
                  <th className="text-left py-3 px-4 text-wc-green-400 text-sm font-medium">
                    Rank
                  </th>
                  <th className="text-left py-3 px-4 text-wc-green-400 text-sm font-medium">
                    Player
                  </th>
                  <th className="text-right py-3 px-4 text-wc-green-400 text-sm font-medium">
                    Points
                  </th>
                  <th className="text-right py-3 px-4 text-wc-green-400 text-sm font-medium hidden sm:table-cell">
                    Groups
                  </th>
                  <th className="text-right py-3 px-4 text-wc-green-400 text-sm font-medium hidden md:table-cell">
                    Bracket
                  </th>
                  <th className="text-right py-3 px-4 text-wc-green-400 text-sm font-medium hidden md:table-cell">
                    Champion
                  </th>
                </tr>
              </thead>
              <tbody>
                {scores.map((u, index) => {
                  const isCurrentUser = u.username === currentUser?.username;
                  const medal =
                    index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-wc-green-800/50 transition-colors ${
                        isCurrentUser
                          ? 'bg-wc-gold-500/10'
                          : 'hover:bg-wc-green-800/30'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {medal ? (
                            <span className="text-lg">{medal}</span>
                          ) : (
                            <span className="text-wc-green-500 text-sm w-6 text-center">
                              {index + 1}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {u.username}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs text-wc-gold-400 bg-wc-gold-500/20 px-1.5 py-0.5 rounded">
                              you
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Points */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-wc-gold-400 text-lg">
                          {u.score}
                        </span>
                      </td>

                      {/* Match picks */}
                      <td className="py-3 px-4 text-right text-sm text-wc-green-300 hidden sm:table-cell">
                        {u.groupPicksCount}/72 matches
                      </td>

                      {/* Bracket */}
                      <td className="py-3 px-4 text-right hidden md:table-cell">
                        <span className="text-sm text-wc-green-400">
                          {u.bracketPicksCount} picks
                        </span>
                      </td>

                      {/* Champion */}
                      <td className="py-3 px-4 text-right hidden md:table-cell">
                        {u.championPick ? (
                          <span className="text-wc-gold-400 text-sm">{u.championPick}</span>
                        ) : (
                          <span className="text-wc-green-700 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-wc-green-600 text-center">
        Standings update automatically as match results come in.
      </p>
    </div>
  );
}
