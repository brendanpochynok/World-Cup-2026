import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GROUP_MATCHES } from '@/lib/worldcup-data';

export interface PlayerPickEntry {
  matchId: string;
  group: string;
  matchNumber: number;
  home: string;
  away: string;
  date: string;
  pick: 'home' | 'draw' | 'away';
  result: 'home' | 'draw' | 'away' | null;
  homeGoals: number | null;
  awayGoals: number | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);

  const [picks, results] = await Promise.all([
    prisma.matchPick.findMany({ where: { userId: user.id }, select: { matchId: true, pick: true } }),
    prisma.matchResult.findMany({ select: { matchId: true, result: true, homeGoals: true, awayGoals: true, status: true } }),
  ]);

  const pickMap = new Map(picks.map((p) => [p.matchId, p.pick]));
  const resultMap = new Map(results.map((r) => [r.matchId, r]));

  const lockedPicks: PlayerPickEntry[] = [];

  for (const m of GROUP_MATCHES) {
    const pick = pickMap.get(m.matchId);
    if (!pick) continue;

    // Locked: match date has arrived or a DB result exists
    const dbResult = resultMap.get(m.matchId);
    const datePassed = m.date <= today;
    const hasResult = dbResult && dbResult.status !== 'scheduled';
    if (!datePassed && !hasResult) continue;

    lockedPicks.push({
      matchId: m.matchId,
      group: m.group,
      matchNumber: m.matchNumber,
      home: m.home,
      away: m.away,
      date: m.date,
      pick: pick as 'home' | 'draw' | 'away',
      result: (dbResult?.result as 'home' | 'draw' | 'away' | null) ?? null,
      homeGoals: dbResult?.homeGoals ?? null,
      awayGoals: dbResult?.awayGoals ?? null,
    });
  }

  return NextResponse.json({
    username: user.username,
    displayName: user.displayName,
    picks: lockedPicks,
  });
}
