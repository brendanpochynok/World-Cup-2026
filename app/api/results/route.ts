import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Actual finished group-stage results as { [matchId]: "home"|"draw"|"away" }.
// Used to seed the knockout bracket from reality + the user's predictions
// for matches not yet played.
export async function GET(): Promise<NextResponse> {
  const rows = await prisma.matchResult.findMany({
    where: { status: 'finished', result: { not: null } },
    select: { matchId: true, result: true },
  });
  const results: Record<string, string> = {};
  for (const r of rows) if (r.result) results[r.matchId] = r.result;
  return NextResponse.json({ results });
}
