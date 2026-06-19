import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Actual finished group-stage results. `results` drives standings/bracket
// outcomes; `scores` supplies real scorelines for goal-difference tiebreaks.
export async function GET(): Promise<NextResponse> {
  const rows = await prisma.matchResult.findMany({
    where: { status: 'finished', result: { not: null } },
    select: { matchId: true, result: true, homeGoals: true, awayGoals: true },
  });
  const results: Record<string, string> = {};
  const scores: Record<string, { home: number; away: number }> = {};
  for (const r of rows) {
    if (r.result) results[r.matchId] = r.result;
    if (r.homeGoals != null && r.awayGoals != null) {
      scores[r.matchId] = { home: r.homeGoals, away: r.awayGoals };
    }
  }
  return NextResponse.json({ results, scores });
}
