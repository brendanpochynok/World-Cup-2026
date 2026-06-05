import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const totalMatches = GROUP_MATCHES.length;

  const [matchPicksCount, bracketPicksCount] = await Promise.all([
    prisma.matchPick.count({ where: { userId: user.userId } }),
    prisma.bracketPick.count({ where: { userId: user.userId } }),
  ]);

  const finalPick = await prisma.bracketPick.findUnique({
    where: { userId_round_slot: { userId: user.userId, round: 'Final', slot: 0 } },
  });
  const championPick = finalPick?.team ?? null;

  const matchResults = await prisma.matchResult.findMany();
  const completedGroupMatches = matchResults.filter((r) => r.status === 'finished').length;

  const allUsers = await prisma.user.findMany({ select: { id: true, username: true } });
  const leaderboard = allUsers
    .map((u) => ({ username: u.username, score: 0, id: u.id }))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .slice(0, 5);

  const picksPct = Math.round((matchPicksCount / totalMatches) * 100);

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-wc-navy-400 text-xs uppercase tracking-widest font-medium mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-wc-gold-400">{user.username}</span>
          </h1>
        </div>
        <Link href="/app/picks" className="btn-primary hidden sm:inline-flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Make picks
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Your points', value: '0', sub: 'live score' },
          { label: 'Group picks', value: `${matchPicksCount}`, sub: `of ${totalMatches}` },
          { label: 'Bracket picks', value: `${bracketPicksCount}`, sub: 'slots filled' },
          { label: 'Matches played', value: `${completedGroupMatches}`, sub: 'group stage' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card">
            <div className="text-3xl font-bold text-white tabular-nums">{value}</div>
            <div className="text-wc-navy-200 text-xs font-medium mt-1">{label}</div>
            <div className="text-wc-navy-400 text-xs mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Progress + champion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Group stage picks</h3>
            <span className="text-xs text-wc-navy-400 tabular-nums">{matchPicksCount} / {totalMatches}</span>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-wc-navy-400 mb-2">
              <span>{picksPct}% complete</span>
              {matchPicksCount === totalMatches && (
                <span className="text-wc-green-400 font-semibold">All done</span>
              )}
            </div>
            <div className="w-full bg-wc-navy-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${matchPicksCount === totalMatches ? 'bg-wc-green-400' : 'bg-wc-gold-400'}`}
                style={{ width: `${picksPct}%` }}
              />
            </div>
          </div>
          <Link href="/app/picks" className="btn-secondary text-sm block text-center">
            {matchPicksCount === totalMatches ? 'Edit picks' : 'Make picks'}
          </Link>
        </div>

        <div className="card flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-white text-sm mb-3">Champion pick</h3>
            {championPick ? (
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-wc-gold-400/15 border border-wc-gold-600/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-wc-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3h14v4l-7 7-7-7V3zm0 0v3m14-3v3M12 14v7m-4 0h8" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold">{championPick}</div>
                  <div className="text-wc-navy-400 text-xs">Your champion · 20 pts if correct</div>
                </div>
              </div>
            ) : (
              <p className="text-wc-navy-300 text-sm mb-4">No champion picked yet. Worth 20 pts.</p>
            )}
          </div>
          <Link href="/app/picks" className="btn-secondary text-sm block text-center">
            {championPick ? 'Change pick' : 'Pick champion'}
          </Link>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-sm">Leaderboard</h3>
          <Link href="/app/standings" className="text-wc-navy-400 hover:text-white text-xs font-medium transition-colors">
            Full standings →
          </Link>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-wc-navy-400 text-sm">No players yet</p>
        ) : (
          <div className="space-y-1">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  entry.username === user.username
                    ? 'bg-wc-gold-400/10 border border-wc-gold-600/20'
                    : 'hover:bg-wc-navy-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-5 text-center tabular-nums ${i === 0 ? 'text-wc-gold-400' : 'text-wc-navy-500'}`}>
                    {i + 1}
                  </span>
                  <span className={`font-medium ${entry.username === user.username ? 'text-wc-gold-300' : 'text-white'}`}>
                    {entry.username}
                  </span>
                  {entry.username === user.username && (
                    <span className="text-[10px] text-wc-navy-400 font-medium uppercase tracking-wider">you</span>
                  )}
                </div>
                <span className="font-semibold text-wc-navy-300 tabular-nums">{entry.score} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
