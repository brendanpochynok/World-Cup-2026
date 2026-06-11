import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BRACKET_ROUNDS, MAX_ENTRIES } from '@/lib/worldcup-data';
import { calculateMatchPickPoints, calculateBracketPickPoints } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entryParam = parseInt(request.nextUrl.searchParams.get('entry') ?? '1', 10);
  const entry = Number.isInteger(entryParam) && entryParam >= 1 && entryParam <= MAX_ENTRIES ? entryParam : 1;

  const [matchPicks, bracketPicks, matchResults, bracketResults] = await Promise.all([
    prisma.matchPick.findMany({ where: { userId: session.userId, entry } }),
    prisma.bracketPick.findMany({ where: { userId: session.userId, entry } }),
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
