import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { SCORING } from '@/lib/worldcup-data';

export const dynamic = 'force-dynamic';

const ROUND_PTS: Record<string, number> = {
  R32: SCORING.r32, R16: SCORING.r16, QF: SCORING.qf, SF: SCORING.sf, Final: SCORING.final,
};

export interface MeStats {
  score: number;
  rank: number;
  totalPlayers: number;
  groupCorrect: number;
  groupWrong: number;
  groupSettled: number;
  groupPicksTotal: number;
  bracketPicksCount: number;
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [users, matchResults, bracketResults] = await Promise.all([
    prisma.user.findMany({ include: { matchPicks: true, bracketPicks: true } }),
    prisma.matchResult.findMany({ where: { status: 'finished', result: { not: null } } }),
    prisma.bracketResult.findMany(),
  ]);

  const resultMap = new Map(matchResults.map((r) => [r.matchId, r.result!]));
  const bracketMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));

  function calcScore(u: typeof users[0]) {
    let s = 0;
    for (const mp of u.matchPicks) {
      const actual = resultMap.get(mp.matchId);
      if (!actual) continue;
      if (mp.pick === actual) s += SCORING.groupCorrect;
      else if (actual !== 'draw') s += SCORING.groupWrong;
    }
    for (const bp of u.bracketPicks) {
      const actual = bracketMap.get(`${bp.round}-${bp.slot}`);
      if (actual && bp.team === actual) s += ROUND_PTS[bp.round] ?? 0;
    }
    return s;
  }

  const sorted = users.map((u) => ({ id: u.id, score: calcScore(u) }))
    .sort((a, b) => b.score - a.score);

  const myUser = users.find((u) => u.id === me.userId);
  if (!myUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let groupCorrect = 0, groupWrong = 0, groupSettled = 0;
  for (const mp of myUser.matchPicks) {
    const actual = resultMap.get(mp.matchId);
    if (!actual) continue;
    groupSettled++;
    if (mp.pick === actual) groupCorrect++;
    else if (actual !== 'draw') groupWrong++;
  }

  return NextResponse.json({
    score: calcScore(myUser),
    rank: sorted.findIndex((s) => s.id === me.userId) + 1,
    totalPlayers: users.length,
    groupCorrect,
    groupWrong,
    groupSettled,
    groupPicksTotal: myUser.matchPicks.length,
    bracketPicksCount: myUser.bracketPicks.length,
  } satisfies MeStats);
}
