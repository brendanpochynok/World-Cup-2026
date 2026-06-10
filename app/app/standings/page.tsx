import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { calculateTotalScore, calculateMaxPossibleScore } from '@/lib/scoring';
import { updateRankSnapshots, getPreviousRanks } from '@/lib/rank-snapshots';
import StandingsTable from '@/components/StandingsTable';
import type { StandingsRow } from '@/components/StandingsTable';
import StandingsLastUpdated from '@/components/StandingsLastUpdated';
import { calculatePayouts } from '@/lib/payouts';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Standings' };

function envAdminUsernames(): Set<string> {
  const raw = process.env.ADMIN_USERNAME ?? '';
  return new Set(raw.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean));
}

export const dynamic = 'force-dynamic';

type UserScore = StandingsRow;

const groupScoringRows = [
  { label: 'Correct pick',          pts: '+1 pt', positive: true  },
  { label: 'Result is draw',        pts: '0 pts',  positive: true  },
  { label: 'Totally wrong',         pts: '−1 pt', positive: false },
  { label: 'Picked draw, no draw',  pts: '−1 pt', positive: false },
] as const;

const bracketScoringRows = [
  { label: 'Round of 32',   pts: '1 pt',   positive: true },
  { label: 'Round of 16',   pts: '2 pts',  positive: true },
  { label: 'Quarter-final', pts: '4 pts',  positive: true },
  { label: 'Semi-final',    pts: '8 pts',  positive: true },
  { label: 'Final',         pts: '16 pts', positive: true },
] as const;

export default async function StandingsPage() {
  const currentUser = await getSessionUser();

  const [matchResults, bracketResults, users, poolConfig] = await Promise.all([
    prisma.matchResult.findMany(),
    prisma.bracketResult.findMany(),
    prisma.user.findMany({
      include: {
        matchPicks: true,
        bracketPicks: true,
        poolWins: { select: { trophyImage: true, poolName: true, year: true }, orderBy: { year: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.poolConfig.findUnique({ where: { id: 1 } }),
  ]);

  const resultMap = new Map(
    matchResults.filter((r) => r.status === 'finished' && r.result).map((r) => [r.matchId, r.result!]),
  );
  const bracketMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));
  const settledMatchIds = new Set(resultMap.keys());
  const settledBracketSlots = new Set(bracketMap.keys());

  const envAdmins = envAdminUsernames();
  const scores: UserScore[] = users.map((user) => {
    const championPick = user.bracketPicks.find((p) => p.round === 'Final' && p.slot === 0)?.team ?? null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      isAdmin: user.isAdmin || envAdmins.has(user.username.toLowerCase()),
      score: calculateTotalScore({
        matchPicks: user.matchPicks,
        bracketPicks: user.bracketPicks,
        matchResults: resultMap,
        bracketResults: bracketMap,
      }),
      maxScore: 0, // filled in below
      movement: null,
      prize: null,
      groupPicksCount: user.matchPicks.length,
      bracketPicksCount: user.bracketPicks.length,
      championPick,
      favoriteTeam: user.favoriteTeam ?? null,
      isMe: user.username === currentUser?.username,
      trophies: user.poolWins,
    };
  });

  const userById = new Map(users.map((u) => [u.id, u]));
  for (const row of scores) {
    const u = userById.get(row.id)!;
    row.maxScore = calculateMaxPossibleScore({
      currentScore: row.score,
      matchPicks: u.matchPicks,
      bracketPicks: u.bracketPicks,
      settledMatchIds,
      settledBracketSlots,
    });
  }

  scores.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));

  // Rank movement vs yesterday's final standings (ties share a rank)
  const rankOf = (score: number) => scores.filter((s) => s.score > score).length + 1;
  const ranked = scores.map((s) => ({ userId: s.id, rank: rankOf(s.score), score: s.score }));
  const [previousRanks] = await Promise.all([getPreviousRanks(), updateRankSnapshots(ranked)]);
  for (let i = 0; i < scores.length; i++) {
    const prev = previousRanks.get(scores[i].id);
    if (prev !== undefined) scores[i].movement = prev - ranked[i].rank;
  }

  // Live prize money — tied players split the combined payout for the
  // positions they occupy (e.g. two tied for 1st split 75%+25%, two tied
  // for 2nd split the 25%)
  const entryFee = poolConfig?.entryFeePerPlayer ?? 0;
  const totalPot = entryFee * scores.length;
  if (totalPot > 0 && scores.length > 0) {
    const payouts = calculatePayouts(totalPot);
    let pos = 0;
    while (pos < scores.length && pos < payouts.length) {
      let end = pos;
      while (end < scores.length && scores[end].score === scores[pos].score) end++;
      let sum = 0;
      for (let i = pos; i < end && i < payouts.length; i++) sum += payouts[i];
      if (sum > 0) {
        const each = Math.floor(sum / (end - pos));
        for (let i = pos; i < end; i++) scores[i].prize = each;
      }
      pos = end;
    }
  }

  const finishedMatches = matchResults.filter((r) => r.status === 'finished').length;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ─── Header ─── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Standings</h1>
          <p className="text-gray-500 text-sm mt-1.5">
            {finishedMatches} match{finishedMatches !== 1 ? 'es' : ''} completed
            <span className="text-gray-300 mx-2">·</span>
            {scores.length} player{scores.length !== 1 ? 's' : ''} in the pool
            {totalPot > 0 && (
              <>
                <span className="text-gray-300 mx-2">·</span>
                <span className="text-wc-gold-600 font-bold">${totalPot.toLocaleString()} prize pool</span>
              </>
            )}
          </p>
        </div>
        <StandingsLastUpdated />
      </div>

      {/* ─── Scoring Reference ─── */}
      <div className="card space-y-4">
        <h3 className="eyebrow">Scoring System</h3>
        <div>
          <p className="text-[11px] font-bold text-gray-400 mb-2">Group Stage</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {groupScoringRows.map(({ label, pts, positive }) => (
              <div key={label}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${
                  positive ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-100'
                }`}>
                <span className="text-gray-600 text-xs font-medium">{label}</span>
                <span className={`font-bold text-sm ml-2 ${positive ? 'text-wc-gold-500' : 'text-wc-red-500'}`}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 mb-2">Bracket Stage</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {bracketScoringRows.map(({ label, pts }) => (
              <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-xl border bg-gray-50 border-gray-200">
                <span className="text-gray-600 text-xs font-medium">{label}</span>
                <span className="font-bold text-sm ml-2 text-wc-gold-500">{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Full Table ─── */}
      <div className="card overflow-hidden p-0">
        {scores.length === 0 ? (
          <div className="text-center py-16 px-5">
            <p className="text-gray-900 font-bold text-lg mb-1">No players yet</p>
            <p className="text-gray-500 text-sm">Invite friends to join the pool.</p>
          </div>
        ) : (
          <StandingsTable scores={scores} />
        )}
      </div>
    </div>
  );
}
