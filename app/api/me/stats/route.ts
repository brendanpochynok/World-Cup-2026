import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { SCORING, MAX_ENTRIES } from '@/lib/worldcup-data';

export const dynamic = 'force-dynamic';

const ROUND_PTS: Record<string, number> = {
  R32: SCORING.r32, R16: SCORING.r16, QF: SCORING.qf, SF: SCORING.sf, Final: SCORING.final,
};

export interface MeStats {
  score: number;
  rank: number;
  totalPlayers: number; // total entries in the pool
  entry: number;
  entriesCount: number;
  groupCorrect: number;
  groupWrong: number;
  groupSettled: number;
  groupPicksTotal: number;
  bracketPicksCount: number;
}

type PickRow = { matchId: string; pick: string; entry: number };
type BracketRow = { round: string; slot: number; team: string; entry: number };

export async function GET(request: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entryParam = parseInt(request.nextUrl.searchParams.get('entry') ?? '1', 10);
  const entry = Number.isInteger(entryParam) && entryParam >= 1 && entryParam <= MAX_ENTRIES ? entryParam : 1;

  const [users, matchResults, bracketResults] = await Promise.all([
    prisma.user.findMany({ include: { matchPicks: true, bracketPicks: true } }),
    prisma.matchResult.findMany({ where: { status: 'finished', result: { not: null } } }),
    prisma.bracketResult.findMany(),
  ]);

  const resultMap = new Map(matchResults.map((r) => [r.matchId, r.result!]));
  const bracketMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));

  function calcScore(matchPicks: PickRow[], bracketPicks: BracketRow[]) {
    let s = 0;
    for (const mp of matchPicks) {
      const actual = resultMap.get(mp.matchId);
      if (!actual) continue;
      if (mp.pick === actual) s += SCORING.groupCorrect;
      else if (actual !== 'draw') s += SCORING.groupWrong;
    }
    for (const bp of bracketPicks) {
      const actual = bracketMap.get(`${bp.round}-${bp.slot}`);
      if (actual && bp.team === actual) s += ROUND_PTS[bp.round] ?? 0;
    }
    return s;
  }

  // Rank is computed across every paid entry in the pool
  const allScores = users.flatMap((u) =>
    Array.from({ length: u.entriesCount }, (_, i) => i + 1).map((e) =>
      calcScore(
        u.matchPicks.filter((p) => p.entry === e),
        u.bracketPicks.filter((p) => p.entry === e),
      ),
    ),
  );

  const myUser = users.find((u) => u.id === me.userId);
  if (!myUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const myMatchPicks = myUser.matchPicks.filter((p) => p.entry === entry);
  const myBracketPicks = myUser.bracketPicks.filter((p) => p.entry === entry);

  let groupCorrect = 0, groupWrong = 0, groupSettled = 0;
  for (const mp of myMatchPicks) {
    const actual = resultMap.get(mp.matchId);
    if (!actual) continue;
    groupSettled++;
    if (mp.pick === actual) groupCorrect++;
    else if (actual !== 'draw') groupWrong++;
  }

  const myScore = calcScore(myMatchPicks, myBracketPicks);

  return NextResponse.json({
    score: myScore,
    rank: allScores.filter((s) => s > myScore).length + 1,
    totalPlayers: allScores.length,
    entry,
    entriesCount: myUser.entriesCount,
    groupCorrect,
    groupWrong,
    groupSettled,
    groupPicksTotal: myMatchPicks.length,
    bracketPicksCount: myBracketPicks.length,
  } satisfies MeStats);
}
