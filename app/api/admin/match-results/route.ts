import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import { isAdminRequest } from '@/lib/admin-auth';

const VALID_MATCH_IDS = new Set(GROUP_MATCHES.map((m) => m.matchId));
const VALID_STATUSES = new Set(['scheduled', 'live', 'finished']);

export async function PATCH(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { matchId, homeGoals, awayGoals, status } = body as {
    matchId: string;
    homeGoals: number | null;
    awayGoals: number | null;
    status: string;
  };

  if (!VALID_MATCH_IDS.has(matchId))
    return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 });
  if (!VALID_STATUSES.has(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  if (homeGoals !== null && (typeof homeGoals !== 'number' || homeGoals < 0 || !Number.isInteger(homeGoals)))
    return NextResponse.json({ error: 'Invalid homeGoals' }, { status: 400 });
  if (awayGoals !== null && (typeof awayGoals !== 'number' || awayGoals < 0 || !Number.isInteger(awayGoals)))
    return NextResponse.json({ error: 'Invalid awayGoals' }, { status: 400 });

  let result: string | null = null;
  if (status === 'finished' && homeGoals !== null && awayGoals !== null) {
    result = homeGoals > awayGoals ? 'home' : awayGoals > homeGoals ? 'away' : 'draw';
  }

  const updated = await prisma.matchResult.upsert({
    where: { matchId },
    update: { homeGoals, awayGoals, result, status },
    create: { matchId, homeGoals, awayGoals, result, status },
  });

  return NextResponse.json({ ok: true, result: updated });
}
