import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GROUP_MATCHES, GROUPS, getTeamMeta, getFlagUrl, computeGroupStandings } from '@/lib/worldcup-data';
import Link from 'next/link';

function envAdminUsernames(): Set<string> {
  const raw = process.env.ADMIN_USERNAME ?? '';
  return new Set(raw.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean));
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getSessionUser();

  const matchResults = await prisma.matchResult.findMany();
  const completedGroupMatches = matchResults.filter((r) => r.status === 'finished').length;

  const envAdmins = envAdminUsernames();
  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, avatarUrl: true, isAdmin: true },
  });
  const leaderboard = allUsers
    .map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, isAdmin: u.isAdmin || envAdmins.has(u.username.toLowerCase()), score: 0 }))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .slice(0, 5);

  // User-specific data (only fetched when logged in)
  let matchPicksCount = 0;
  let bracketPicksCount = 0;
  let championPick: string | null = null;
  const totalMatches = GROUP_MATCHES.length;

  if (user) {
    [matchPicksCount, bracketPicksCount] = await Promise.all([
      prisma.matchPick.count({ where: { userId: user.userId } }),
      prisma.bracketPick.count({ where: { userId: user.userId } }),
    ]);
    const finalPick = await prisma.bracketPick.findUnique({
      where: { userId_round_slot: { userId: user.userId, round: 'Final', slot: 0 } },
    });
    championPick = finalPick?.team ?? null;
  }

  const championMeta = championPick ? getTeamMeta(championPick) : null;
  const picksPct = Math.round((matchPicksCount / totalMatches) * 100);
  const groupsDone = matchPicksCount === totalMatches;

  // Build real standings from finished match results
  const realPicks: Record<string, string> = {};
  for (const r of matchResults) {
    if (r.status === 'finished' && r.homeGoals !== null && r.awayGoals !== null) {
      realPicks[r.matchId] = r.homeGoals > r.awayGoals ? 'home' : r.homeGoals < r.awayGoals ? 'away' : 'draw';
    }
  }
  const groupStandings = GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    rows: computeGroupStandings(g.id, realPicks),
  }));
  const tournamentStarted = Object.keys(realPicks).length > 0;

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ─── Header ─── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">FIFA World Cup 2026™</p>
          <h1 className="text-4xl font-black text-gray-900 leading-tight">
            {user ? (
              <>Welcome, <span className="text-wc-blue-500">{user.username}</span></>
            ) : (
              'Pool Dashboard'
            )}
          </h1>
          <p className="text-gray-500 text-sm mt-2">Group Stage · June 11 – July 19, 2026</p>
        </div>
        {user ? (
          <Link href="/app/picks" className="btn-primary text-sm whitespace-nowrap hidden sm:inline-flex">
            Make Picks →
          </Link>
        ) : (
          <Link href="/register" className="btn-primary text-sm whitespace-nowrap hidden sm:inline-flex">
            Join the Pool →
          </Link>
        )}
      </div>

      {/* ─── Stats ─── */}
      {user ? (
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
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Players', value: `${allUsers.length}`, sub: 'in the pool' },
            { label: 'Matches Played', value: `${completedGroupMatches}`, sub: 'group stage' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="card">
              <div className="text-4xl font-black text-gray-900 tabular-nums leading-none">{value}</div>
              <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-3">{label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Progress + Champion (logged-in only) ─── */}
      {user ? (
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
      ) : (
        /* Guest CTA */
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-wc-blue-500 via-wc-green-500 to-wc-red-500" />
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            <div className="flex-1">
              <h3 className="font-black text-gray-900 text-lg">Join the pool and make your picks</h3>
              <p className="text-gray-500 text-sm mt-1">
                Predict every match, fill your bracket, and compete for the prize pool.
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Link href="/register" className="btn-primary text-sm">
                Register →
              </Link>
              <Link href="/login" className="btn-secondary text-sm">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Live Group Standings ─── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="eyebrow mb-1">Real Results</p>
            <h2 className="text-xl font-black text-gray-900">Group Standings</h2>
          </div>
          <Link href="/app/scores" className="text-wc-blue-500 hover:text-wc-blue-600 text-xs font-bold transition-colors">
            Live scores →
          </Link>
        </div>

        {!tournamentStarted ? (
          <div className="card text-center py-10">
            <div className="text-3xl mb-3">⚽</div>
            <p className="font-black text-gray-900">Tournament kicks off June 11</p>
            <p className="text-gray-400 text-sm mt-1">Standings will appear once matches are played</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupStandings.map(({ id, name, rows }) => (
              <div key={id} className="card p-0 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">{name}</span>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    <span className="w-4 text-center">P</span>
                    <span className="w-4 text-center">W</span>
                    <span className="w-4 text-center">D</span>
                    <span className="w-4 text-center">L</span>
                    <span className="w-6 text-center">Pts</span>
                  </div>
                </div>
                {rows.map((row, idx) => {
                  const meta = getTeamMeta(row.team);
                  const bg =
                    idx < 2 ? 'bg-green-50' :
                    idx === 2 ? 'bg-amber-50' : '';
                  const nameColor =
                    idx < 2 ? 'text-green-800' :
                    idx === 2 ? 'text-amber-800' : 'text-gray-500';
                  const ptsColor =
                    idx < 2 ? 'text-green-700' :
                    idx === 2 ? 'text-amber-700' : 'text-gray-600';
                  return (
                    <div key={row.team} className={`flex items-center gap-2 px-4 py-2 ${bg}`}>
                      <span className="text-[10px] text-gray-400 w-3 tabular-nums flex-shrink-0">{idx + 1}</span>
                      <img
                        src={getFlagUrl(meta.flag)}
                        alt={row.team}
                        className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0 border border-gray-200/50"
                      />
                      <span className={`flex-1 text-xs font-semibold truncate ${nameColor}`}>{row.team}</span>
                      <div className="flex items-center gap-2 text-[11px] tabular-nums flex-shrink-0">
                        <span className="w-4 text-center text-gray-400">{row.p}</span>
                        <span className="w-4 text-center text-gray-400">{row.w}</span>
                        <span className="w-4 text-center text-gray-400">{row.d}</span>
                        <span className="w-4 text-center text-gray-400">{row.l}</span>
                        <span className={`w-6 text-center font-black ${ptsColor}`}>{row.pts}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
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
              const isMe = user ? entry.username === user.username : false;
              const entryLabel = entry.displayName ?? entry.username;
              return (
                <div key={entry.id}
                  className={`flex items-center gap-3 py-3 ${isMe ? 'text-wc-blue-600' : ''}`}>
                  <span className="text-gray-400 text-sm font-mono w-4 text-center flex-shrink-0">{i + 1}</span>
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entryLabel}
                      className="w-7 h-7 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isMe ? 'bg-wc-blue-500/10 border border-wc-blue-200' : 'bg-gray-100 border border-gray-200'
                    }`}>
                      <span className={`text-[11px] font-black uppercase leading-none ${
                        isMe ? 'text-wc-blue-500' : 'text-gray-500'
                      }`}>
                        {entryLabel.charAt(0)}
                      </span>
                    </div>
                  )}
                  <span className={`flex-1 font-semibold text-sm inline-flex items-center gap-1 ${isMe ? 'text-wc-blue-600' : 'text-gray-900'}`}>
                    {entryLabel}
                    {entry.isAdmin && (
                      <svg aria-label="Admin" className="w-3.5 h-3.5 text-wc-gold-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    )}
                    {isMe && <span className="text-xs text-gray-400 font-normal">(you)</span>}
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
