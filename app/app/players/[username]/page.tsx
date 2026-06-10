import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { SCORING, BRACKET_ROUNDS, GROUP_MATCHES, BRACKET_LOCK_ISO, getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';
import BracketView from '@/components/BracketView';

export const dynamic = 'force-dynamic';

const ROUND_POINTS: Record<string, number> = {
  R32: SCORING.r32, R16: SCORING.r16, QF: SCORING.qf, SF: SCORING.sf, Final: SCORING.final,
};

function computeScore(
  matchPicks: { matchId: string; pick: string }[],
  bracketPicks: { round: string; slot: number; team: string }[],
  resultMap: Map<string, string>,
  bracketMap: Map<string, string>,
): number {
  let score = 0;
  for (const mp of matchPicks) {
    const actual = resultMap.get(mp.matchId);
    if (!actual) continue;
    if (mp.pick === actual) score += SCORING.groupCorrect;
    else if (actual === 'draw') score += 0;
    else score += SCORING.groupWrong;
  }
  for (const bp of bracketPicks) {
    const actual = bracketMap.get(`${bp.round}-${bp.slot}`);
    if (actual && bp.team === actual) score += ROUND_POINTS[bp.round] ?? 0;
  }
  return score;
}

export default async function PlayerProfilePage({
  params,
}: {
  params: { username: string };
}) {
  // Route params arrive URL-encoded; emoji/special chars in usernames
  // (e.g. flag emoji) won't match the DB without decoding
  const username = decodeURIComponent(params.username);
  const sessionUser = await getSessionUser();
  const isOwnProfile = sessionUser?.username === username;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      matchPicks: true,
      bracketPicks: true,
      poolWins: { orderBy: [{ year: 'desc' }, { position: 'asc' }] },
    },
  });
  if (!user) notFound();

  const [matchResults, bracketResults, allUsers] = await Promise.all([
    prisma.matchResult.findMany({ where: { status: 'finished', result: { not: null } } }),
    prisma.bracketResult.findMany(),
    prisma.user.findMany({ include: { matchPicks: true, bracketPicks: true } }),
  ]);

  const resultMap = new Map(matchResults.map((r) => [r.matchId, r.result!]));
  const bracketMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));

  const myScore = computeScore(user.matchPicks, user.bracketPicks, resultMap, bracketMap);
  const allScores = allUsers.map((u) => computeScore(u.matchPicks, u.bracketPicks, resultMap, bracketMap));
  allScores.sort((a, b) => b - a);
  const rank = allScores.filter((s) => s > myScore).length + 1;
  const totalPlayers = allUsers.length;

  // Group picks: only locked/played matches
  const today = new Date().toISOString().slice(0, 10);
  const allMatchResults = await prisma.matchResult.findMany();
  const fullResultMap = new Map(allMatchResults.map((r) => [r.matchId, r]));
  const pickMap = new Map(user.matchPicks.map((p) => [p.matchId, p.pick]));

  const lockedPicks = GROUP_MATCHES.filter((m) => {
    const pick = pickMap.get(m.matchId);
    if (!pick) return false;
    const dbResult = fullResultMap.get(m.matchId);
    return m.date <= today || (dbResult && dbResult.status !== 'scheduled');
  }).map((m) => {
    const dbResult = fullResultMap.get(m.matchId);
    return {
      matchId: m.matchId,
      group: m.group,
      home: m.home,
      away: m.away,
      pick: pickMap.get(m.matchId)!,
      result: dbResult?.result ?? null,
    };
  });

  const correct = lockedPicks.filter((p) => p.result && p.pick === p.result).length;
  const wrong = lockedPicks.filter((p) => p.result && p.pick !== p.result).length;
  const label = user.displayName ?? user.username;
  const favMeta = user.favoriteTeam ? getTeamMeta(user.favoriteTeam) : null;

  const groupedPicks = new Map<string, typeof lockedPicks>();
  for (const p of lockedPicks) {
    const list = groupedPicks.get(p.group) ?? [];
    list.push(p);
    groupedPicks.set(p.group, list);
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Link href="/app/standings" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-semibold transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Standings
      </Link>

      {/* Profile header */}
      <div className="card flex items-center gap-5">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={label} className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200 flex-shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-wc-blue-500/10 border-2 border-wc-blue-200 flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-black text-wc-blue-500 uppercase">{label.charAt(0)}</span>
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-gray-900 truncate">{label}</h1>
            {user.poolWins.map((w, i) => (
              w.trophyImage ? (
                <img key={i} src={w.trophyImage} alt={w.poolName} title={`${w.poolName} ${w.year}`} className="w-8 h-8 object-contain flex-shrink-0" />
              ) : (
                <span key={i} title={`${w.poolName} ${w.year}`} className="text-2xl leading-none">🏆</span>
              )
            ))}
          </div>
          {user.displayName && (
            <p className="text-sm text-gray-400 font-mono mt-0.5">@{user.username}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {favMeta && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                <img src={getFlagUrl(favMeta.flag)} alt={user.favoriteTeam!} className="w-5 h-3.5 object-cover rounded-sm border border-gray-200/70" />
                {user.favoriteTeam}
              </span>
            )}
            {isOwnProfile && (
              <Link href="/app/profile" className="text-xs font-semibold text-wc-blue-500 hover:underline">
                Edit profile →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-wc-blue-50 border border-wc-blue-100 px-3 py-3">
          <div className="text-[10px] font-bold text-wc-blue-500 uppercase tracking-wider mb-0.5">Rank</div>
          <div className="text-2xl font-black text-wc-blue-600">#{rank}</div>
          <div className="text-[10px] text-wc-blue-400 mt-0.5">of {totalPlayers}</div>
        </div>
        <div className="rounded-xl bg-wc-gold-50 border border-wc-gold-200 px-3 py-3">
          <div className="text-[10px] font-bold text-wc-gold-600 uppercase tracking-wider mb-0.5">Score</div>
          <div className="text-2xl font-black text-wc-gold-600">{myScore}</div>
          <div className="text-[10px] text-wc-gold-400 mt-0.5">points</div>
        </div>
        <div className="rounded-xl bg-wc-green-50 border border-wc-green-200 px-3 py-3">
          <div className="text-[10px] font-bold text-wc-green-600 uppercase tracking-wider mb-0.5">Correct</div>
          <div className="text-2xl font-black text-wc-green-600">{correct}</div>
          <div className="text-[10px] text-wc-green-500 mt-0.5">group picks</div>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-3">
          <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Wrong</div>
          <div className="text-2xl font-black text-red-500">{wrong}</div>
          <div className="text-[10px] text-red-300 mt-0.5">group picks</div>
        </div>
      </div>

      {/* Trophy cabinet */}
      {user.poolWins.length > 0 && (
        <div className="card">
          <h2 className="font-black text-gray-900 text-lg mb-4">Trophy Cabinet</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {user.poolWins.map((w) => (
              <div key={w.id} className="rounded-xl border border-wc-gold-200 bg-wc-gold-50 px-3 py-4 flex flex-col items-center gap-2 text-center">
                {w.trophyImage ? (
                  <img src={w.trophyImage} alt={w.poolName} className="w-16 h-16 object-contain" />
                ) : (
                  <span className="text-4xl">🏆</span>
                )}
                <div>
                  <p className="text-xs font-black text-wc-gold-700 leading-tight">{w.poolName}</p>
                  <p className="text-[10px] text-wc-gold-500 mt-0.5">
                    {w.position === 1 ? '1st' : w.position === 2 ? '2nd' : '3rd'} place · {w.year}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group picks */}
      {lockedPicks.length > 0 && (
        <div className="card">
          <h2 className="font-black text-gray-900 text-lg mb-4">Group Stage Picks</h2>
          <div className="space-y-4">
            {Array.from(groupedPicks.entries()).sort().map(([group, picks]) => (
              <div key={group}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Group {group}</p>
                <div className="space-y-1.5">
                  {picks.map((p) => {
                    const isCorrect = p.result && p.pick === p.result;
                    const isWrong = p.result && p.pick !== p.result;
                    return (
                      <div key={p.matchId} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${
                        isCorrect ? 'bg-wc-green-50 border border-wc-green-100' :
                        isWrong   ? 'bg-red-50 border border-red-100' :
                                    'bg-gray-50 border border-gray-100'
                      }`}>
                        <span className={`font-black w-3 flex-shrink-0 ${
                          isCorrect ? 'text-wc-green-500' : isWrong ? 'text-red-400' : 'text-gray-300'
                        }`}>
                          {isCorrect ? '✓' : isWrong ? '✗' : '·'}
                        </span>
                        <span className={`flex-1 font-semibold truncate ${p.pick === 'home' ? 'text-gray-900' : 'text-gray-400'}`}>{p.home}</span>
                        <span className="text-gray-300 font-bold flex-shrink-0">vs</span>
                        <span className={`flex-1 font-semibold truncate text-right ${p.pick === 'away' ? 'text-gray-900' : 'text-gray-400'}`}>{p.away}</span>
                        <span className="text-[10px] font-bold text-gray-400 flex-shrink-0 w-8 text-right">
                          {p.pick === 'draw' ? 'Draw' : p.pick === 'home' ? p.home.split(' ')[0] : p.away.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lockedPicks.length === 0 && (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">No locked picks yet.</p>
        </div>
      )}

      {/* Bracket — own bracket always visible, others' only after lock */}
      {user.bracketPicks.length > 0 && (isOwnProfile || Date.now() >= new Date(BRACKET_LOCK_ISO).getTime()) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900 text-lg">Knockout Bracket</h2>
            {isOwnProfile && Date.now() < new Date(BRACKET_LOCK_ISO).getTime() && (
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Only you can see this until brackets lock
              </span>
            )}
          </div>
          <BracketView picks={user.bracketPicks} results={bracketResults} />
        </div>
      )}
    </div>
  );
}
