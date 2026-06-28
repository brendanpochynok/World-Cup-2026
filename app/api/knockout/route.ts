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

// Public: the admin-set knockout fixtures plus recorded winners. Drives
// bracket seeding, per-game locking, the scores-page display, and the
// green/red result colouring on the bracket.
export async function GET(): Promise<NextResponse> {
  const [rows, bracketResults] = await Promise.all([
    prisma.knockoutMatch.findMany({ orderBy: [{ round: 'asc' }, { slot: 'asc' }] }),
    prisma.bracketResult.findMany(),
  ]);
  const matches: KnockoutMatchData[] = rows.map((r) => ({
    round: r.round,
    slot: r.slot,
    home: r.home,
    away: r.away,
    kickoff: r.kickoff ? r.kickoff.toISOString() : null,
  }));
  const results: Record<string, string> = {};
  for (const r of bracketResults) results[`${r.round}-${r.slot}`] = r.team;
  return NextResponse.json({ matches, results });
}
