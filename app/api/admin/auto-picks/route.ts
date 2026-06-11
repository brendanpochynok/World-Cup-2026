import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin-auth';
import { GROUP_MATCHES, getTeamMeta, isMatchLocked } from '@/lib/worldcup-data';

export const dynamic = 'force-dynamic';

function favouritePick(home: string, away: string): 'home' | 'away' {
  const homeRank = getTeamMeta(home)?.fifaRank ?? 999;
  const awayRank = getTeamMeta(away)?.fifaRank ?? 999;
  return awayRank < homeRank ? 'away' : 'home';
}

export async function POST() {
  const user = await getSessionUser();
  if (!user || !(await isAdminUser(user.userId, user.username))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matchResults = await prisma.matchResult.findMany();
  const resultMap = new Map(matchResults.map((r) => [r.matchId, r]));

  // Matches that are locked: kickoff has passed or a DB result exists
  const lockedMatches = GROUP_MATCHES.filter((m) => {
    const dbResult = resultMap.get(m.matchId);
    return isMatchLocked(m) || (dbResult && dbResult.status !== 'scheduled');
  });

  if (lockedMatches.length === 0) {
    return NextResponse.json({ filled: 0, message: 'No locked matches yet.' });
  }

  const allUsers = await prisma.user.findMany({ select: { id: true, entriesCount: true } });
  const existingPicks = await prisma.matchPick.findMany({
    where: { matchId: { in: lockedMatches.map((m) => m.matchId) } },
    select: { userId: true, entry: true, matchId: true },
  });

  const pickedSet = new Set(existingPicks.map((p) => `${p.userId}:${p.entry}:${p.matchId}`));

  const toCreate: { userId: number; entry: number; matchId: string; pick: string }[] = [];
  for (const match of lockedMatches) {
    const pick = favouritePick(match.home, match.away);
    for (const u of allUsers) {
      for (let entry = 1; entry <= u.entriesCount; entry++) {
        if (!pickedSet.has(`${u.id}:${entry}:${match.matchId}`)) {
          toCreate.push({ userId: u.id, entry, matchId: match.matchId, pick });
        }
      }
    }
  }

  if (toCreate.length > 0) {
    await prisma.matchPick.createMany({ data: toCreate, skipDuplicates: true });
  }

  return NextResponse.json({ filled: toCreate.length });
}
