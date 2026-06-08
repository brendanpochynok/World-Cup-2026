import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GROUP_MATCHES, getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';
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
  const championMeta = championPick ? getTeamMeta(championPick) : null;

  const matchResults = await prisma.matchResult.findMany();
  const completedGroupMatches = matchResults.filter((r) => r.status === 'finished').length;

  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  const leaderboard = allUsers
    .map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, score: 0 }))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .slice(0, 5);

  const picksPct = Math.round((matchPicksCount / totalMatches) * 100);
  const groupsDone = matchPicksCount === totalMatches;

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ─── Header ─── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">FIFA World Cup 2026™</p>
          <h1 className="text-4xl font-black text-gray-900 leading-tight">
            Welcome, <span className="text-wc-blue-500">{user.username}</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Group Stage · June 11 – July 19, 2026</p>
        </div>
        <Link href="/app/picks" className="btn-primary text-sm whitespace-nowrap hidden sm:inline-flex">
          Make Picks →
        </Link>
      </div>

      {/* ─── Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Your Points', value: '0', sub: 'tournament score' },
          { label: 'Group Picks', value: `${matchPicksCount}`, sub: `of ${totalMatches} matches` },
          { label: 'Bracket Picks', value: `${bracketPicksCount}`, sub: 'knockout slots' },
          { label: 'Matches Played', value: `${completedGroupMatches}`, sub: 'group stage' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card">
            <div className="text-4xl font-black text-gray-900 tabular-nums leading-none">{value}</div>
            <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-3">{label}</div>
            <div className="text-gray-400 text-xs mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* ─── Progress + Champion ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Progress */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900">Group Stage Picks</h3>
            <span className="text-gray-400 text-sm tabular-nums">{matchPicksCount}/{totalMatches}</span>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>{picksPct}% complete</span>
              {groupsDone && <span className="text-wc-green-600 font-bold">All done</span>}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  groupsDone ? 'bg-wc-green-500' : 'bg-wc-blue-500'
                }`}
                style={{ width: `${Math.max(picksPct, 2)}%` }}
              />
            </div>
          </div>
          <Link href="/app/picks" className="btn-secondary text-sm block text-center">
            {groupsDone ? 'Review picks' : 'Make picks →'}
          </Link>
        </div>

        {/* Champion */}
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-wc-gold-400" />
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-black text-gray-900">Champion Pick</h3>
            <span className="text-wc-gold-500 text-xs font-bold">20 pts</span>
          </div>

          {championPick && championMeta ? (
            <div className="flex items-center gap-4 mb-4">
              <img
                src={getFlagUrl(championMeta.flag)}
                alt={championPick}
                className="w-14 h-10 object-cover rounded-lg shadow-sm flex-shrink-0 border border-gray-200"
              />
              <div>
                <div className="text-xl font-black text-gray-900">{championPick}</div>
                <div className="text-gray-400 text-xs mt-0.5">FIFA Rank #{championMeta.fifaRank}</div>
              </div>
            </div>
          ) : (
            <div className="py-4 mb-4 text-center border border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-500 text-sm font-medium">No champion picked yet</p>
              <p className="text-gray-400 text-xs mt-0.5">Worth 20 pts if correct</p>
            </div>
          )}

          <Link href="/app/picks" className="btn-secondary text-sm block text-center">
            {championPick ? 'Change pick' : 'Pick champion →'}
          </Link>
        </div>
      </div>

      {/* ─── Leaderboard ─── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-900">Leaderboard</h3>
          <Link href="/app/standings"
            className="text-wc-blue-500 hover:text-wc-blue-600 text-xs font-bold transition-colors">
            Full standings →
          </Link>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm font-medium">No players yet</p>
            <p className="text-gray-400 text-xs mt-1">Invite friends to join the pool</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leaderboard.map((entry, i) => {
              const isMe = entry.username === user.username;
              const label = entry.displayName ?? entry.username;
              return (
                <div key={entry.id}
                  className={`flex items-center gap-3 py-3 ${isMe ? 'text-wc-blue-600' : ''}`}>
                  <span className="text-gray-400 text-sm font-mono w-4 text-center flex-shrink-0">{i + 1}</span>
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={label}
                      className="w-7 h-7 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isMe ? 'bg-wc-blue-500/10 border border-wc-blue-200' : 'bg-gray-100 border border-gray-200'
                    }`}>
                      <span className={`text-[11px] font-black uppercase leading-none ${
                        isMe ? 'text-wc-blue-500' : 'text-gray-500'
                      }`}>
                        {label.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className={`flex-1 font-semibold text-sm ${isMe ? 'text-wc-blue-600' : 'text-gray-900'}`}>
                    {label}
                    {isMe && <span className="ml-2 text-xs text-gray-400 font-normal">(you)</span>}
                  </span>
                  <span className={`font-black tabular-nums ${isMe ? 'text-wc-blue-600' : 'text-gray-900'}`}>
                    {entry.score}
                    <span className="text-gray-400 text-xs font-normal ml-1">pts</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
