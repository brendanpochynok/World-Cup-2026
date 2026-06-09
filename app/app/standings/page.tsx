import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import StandingsTable from '@/components/StandingsTable';
import type { StandingsRow } from '@/components/StandingsTable';

function envAdminUsernames(): Set<string> {
  const raw = process.env.ADMIN_USERNAME ?? '';
  return new Set(raw.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean));
}

export const dynamic = 'force-dynamic';

type UserScore = StandingsRow;

const scoringRows = [
  { label: 'Correct pick',   pts: '+1 pt',  positive: true  },
  { label: 'Result is draw', pts: '0 pts',  positive: true  },
  { label: 'Totally wrong',  pts: '−1 pt',  positive: false },
  { label: 'Round of 32',    pts: '2 pts',  positive: true  },
  { label: 'Round of 16',    pts: '4 pts',  positive: true  },
  { label: 'Quarter-final',  pts: '8 pts',  positive: true  },
  { label: 'Semi-final',     pts: '16 pts', positive: true  },
  { label: 'Final',          pts: '32 pts', positive: true  },
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
      favoriteTeam: user.favoriteTeam ?? null,
      isMe: user.username === currentUser?.username,
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
          <StandingsTable scores={scores} />
        )}
      </div>
    </div>
  );
}
