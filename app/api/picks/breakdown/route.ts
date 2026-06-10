import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BRACKET_ROUNDS } from '@/lib/worldcup-data';
import { calculateMatchPickPoints, calculateBracketPickPoints } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [matchPicks, bracketPicks, matchResults, bracketResults] = await Promise.all([
    prisma.matchPick.findMany({ where: { userId: session.userId } }),
    prisma.bracketPick.findMany({ where: { userId: session.userId } }),
    prisma.matchResult.findMany(),
    prisma.bracketResult.findMany(),
  ]);

  const resultMap = new Map(
    matchResults.filter((r) => r.status === 'finished' && r.result).map((r) => [r.matchId, r.result!]),
  );
  const bracketMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));

  let groupCorrect = 0;
  let groupWrong = 0;
  let groupDraw = 0;

  for (const p of matchPicks) {
    const actual = resultMap.get(p.matchId) ?? null;
    if (!actual) continue;
    const pts = calculateMatchPickPoints(p.pick, actual);
    if (pts > 0) groupCorrect++;
    else if (pts < 0) groupWrong++;
    else if (actual === 'draw' && p.pick !== 'draw') groupDraw++;
  }

  const bracketHits: { round: string; hits: number; points: number }[] = [];
  let bracketTotal = 0;
  for (const round of BRACKET_ROUNDS) {
    const roundPicks = bracketPicks.filter((p) => p.round === round.id);
    let hits = 0;
    let pts = 0;
    for (const p of roundPicks) {
      const actual = bracketMap.get(`${p.round}-${p.slot}`) ?? null;
      const earned = calculateBracketPickPoints(p.round, p.team, actual);
      if (earned > 0) { hits++; pts += earned; }
    }
    if (hits > 0) bracketHits.push({ round: round.name, hits, points: pts });
    bracketTotal += pts;
  }

  const total = groupCorrect - groupWrong + bracketTotal;

  return NextResponse.json({ groupCorrect, groupWrong, groupDraw, bracketHits, total });
}
