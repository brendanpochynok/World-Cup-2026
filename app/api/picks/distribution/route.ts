import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface PickDistribution {
  home: number;  // fraction 0–1
  draw: number;
  away: number;
  total: number; // raw count
}

export async function GET() {
  const rows = await prisma.matchPick.findMany({ select: { matchId: true, pick: true } });

  const counts: Record<string, { home: number; draw: number; away: number; total: number }> = {};
  for (const r of rows) {
    if (!counts[r.matchId]) counts[r.matchId] = { home: 0, draw: 0, away: 0, total: 0 };
    const entry = counts[r.matchId];
    if (r.pick === 'home') entry.home++;
    else if (r.pick === 'draw') entry.draw++;
    else if (r.pick === 'away') entry.away++;
    entry.total++;
  }

  const result: Record<string, PickDistribution> = {};
  for (const [matchId, c] of Object.entries(counts)) {
    const t = c.total || 1;
    result[matchId] = { home: c.home / t, draw: c.draw / t, away: c.away / t, total: c.total };
  }

  return NextResponse.json(result);
}
