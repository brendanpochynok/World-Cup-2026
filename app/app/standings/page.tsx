import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

function envAdminUsernames(): Set<string> {
  const raw = process.env.ADMIN_USERNAME ?? '';
  return new Set(raw.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean));
}

export const dynamic = 'force-dynamic';

interface UserScore {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  score: number;
  groupPicksCount: number;
  bracketPicksCount: number;
  championPick: string | null;
}

const scoringRows = [
  { label: 'Correct pick',   pts: '+1 pt',  positive: true  },
  { label: 'Result is draw', pts: '0 pts',  positive: true  },
  { label: 'Totally wrong',  pts: '−1 pt',  positive: false },
  { label: 'Round of 32',    pts: '2 pts',  positive: true  },
  { label: 'Round of 16',    pts: '3 pts',  positive: true  },
  { label: 'Quarter-final',  pts: '5 pts',  positive: true  },
  { label: 'Semi-final',     pts: '8 pts',  positive: true  },
  { label: 'Final',          pts: '13 pts', positive: true  },
  { label: 'Champion',       pts: '20 pts', positive: true  },
] as const;

export default async function StandingsPage() {
  const currentUser = await getSessionUser();

  const matchResults = await prisma.matchResult.findMany();
  const users = await prisma.user.findMany({
    include: { matchPicks: true, bracketPicks: true },
    orderBy: { createdAt: 'asc' },
  });

  const envAdmins = envAdminUsernames();
  const scores: UserScore[] = users.map((user) => {
    const championPick = user.bracketPicks.find((p) => p.round === 'Final' && p.slot === 0)?.team ?? null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      isAdmin: user.isAdmin || envAdmins.has(user.username.toLowerCase()),
      score: 0,
      groupPicksCount: user.matchPicks.length,
      bracketPicksCount: user.bracketPicks.length,
      championPick,
    };
  });

  scores.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
  const finishedMatches = matchResults.filter((r) => r.status === 'finished').length;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ─── Header ─── */}
      <div>
        <p className="eyebrow mb-1.5">Pool Leaderboard</p>
        <h1 className="text-3xl font-black text-gray-900">Standings</h1>
        <p className="text-gray-500 text-sm mt-1.5">
          {finishedMatches} match{finishedMatches !== 1 ? 'es' : ''} completed
          <span className="text-gray-300 mx-2">·</span>
          {scores.length} player{scores.length !== 1 ? 's' : ''} in the pool
          <span className="text-gray-300 mx-2">·</span>
          scores update automatically
        </p>
      </div>

      {/* ─── Scoring Reference ─── */}
      <div className="card">
        <h3 className="eyebrow mb-4">Scoring System</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {scoringRows.map(({ label, pts, positive }) => (
            <div key={label}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                positive ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-100'
              }`}>
              <span className="text-gray-600 text-xs font-medium">{label}</span>
              <span className={`font-black text-sm ml-2 ${positive ? 'text-wc-gold-500' : 'text-wc-red-500'}`}>{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Full Table ─── */}
      <div className="card overflow-hidden p-0">
        {scores.length === 0 ? (
          <div className="text-center py-16 px-5">
            <p className="text-gray-900 font-black text-lg mb-1">No players yet</p>
            <p className="text-gray-500 text-sm">Invite friends to join the pool!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3.5 px-5 eyebrow text-left w-16">#</th>
                  <th className="text-left py-3.5 px-4 eyebrow text-left">Player</th>
                  <th className="text-right py-3.5 px-4 eyebrow">Points</th>
                  <th className="text-right py-3.5 px-4 eyebrow hidden sm:table-cell">Groups</th>
                  <th className="text-right py-3.5 px-4 eyebrow hidden md:table-cell">Bracket</th>
                  <th className="text-right py-3.5 px-5 eyebrow hidden md:table-cell">Champion</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((u, index) => {
                  const isMe = u.username === currentUser?.username;
                  const label = u.displayName ?? u.username;
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-gray-100 last:border-0 transition-colors ${
                        isMe ? 'bg-wc-blue-500/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-4 px-5">
                        <span className="font-black text-sm text-gray-400 tabular-nums">{index + 1}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={label}
                              className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isMe ? 'bg-wc-blue-500/10 border border-wc-blue-200' : 'bg-gray-100 border border-gray-200'
                            }`}>
                              <span className={`text-xs font-black uppercase leading-none ${
                                isMe ? 'text-wc-blue-500' : 'text-gray-500'
                              }`}>
                                {label.charAt(0)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className={`font-bold text-sm inline-flex items-center gap-1 ${isMe ? 'text-wc-blue-600' : 'text-gray-900'}`}>
                              {label}
                              {u.isAdmin && (
                                <svg aria-label="Admin" className="w-3.5 h-3.5 text-wc-gold-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              )}
                            </span>
                            {u.displayName && (
                              <span className="block text-[11px] text-gray-400 font-normal leading-tight">
                                @{u.username}
                              </span>
                            )}
                          </div>
                          {isMe && (
                            <span className="tag bg-wc-blue-500/10 text-wc-blue-600 border border-wc-blue-200">
                              you
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`font-black text-xl tabular-nums ${index === 0 ? 'text-wc-gold-500' : 'text-gray-900'}`}>
                          {u.score}
                        </span>
                        <span className="text-gray-400 text-xs font-normal ml-1">pts</span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-400 hidden sm:table-cell tabular-nums text-xs font-medium">
                        {u.groupPicksCount}/72
                      </td>
                      <td className="py-4 px-4 text-right text-gray-400 hidden md:table-cell tabular-nums text-xs font-medium">
                        {u.bracketPicksCount}
                      </td>
                      <td className="py-4 px-5 text-right hidden md:table-cell">
                        {u.championPick ? (
                          <span className="text-wc-gold-500 font-semibold text-xs">{u.championPick}</span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
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
    </div>
  );
}
