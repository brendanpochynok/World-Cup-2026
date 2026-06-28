import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface KnockoutMatchData {
  round: string;
  slot: number;
  home: string | null;
  away: string | null;
  kickoff: string | null;
}

// Public: the admin-set knockout fixtures. Drives bracket seeding, per-game
// locking, and the scores-page knockout display.
export async function GET(): Promise<NextResponse> {
  const rows = await prisma.knockoutMatch.findMany({
    orderBy: [{ round: 'asc' }, { slot: 'asc' }],
  });
  const matches: KnockoutMatchData[] = rows.map((r) => ({
    round: r.round,
    slot: r.slot,
    home: r.home,
    away: r.away,
    kickoff: r.kickoff ? r.kickoff.toISOString() : null,
  }));
  return NextResponse.json({ matches });
}
