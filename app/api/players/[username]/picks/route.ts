import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GROUP_MATCHES, BRACKET_ROUNDS, BRACKET_LOCK_ISO, isMatchLocked } from '@/lib/worldcup-data';

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

export interface BracketPickEntry {
  round: string;
  roundName: string;
  slot: number;
  team: string;
  actualTeam: string | null;
  correct: boolean | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  // Route params arrive URL-encoded; decode for emoji/special-char usernames
  const username = decodeURIComponent(params.username);

  const entryParam = parseInt(req.nextUrl.searchParams.get('entry') ?? '1', 10);
  const entry = Number.isInteger(entryParam) && entryParam >= 1 ? entryParam : 1;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, displayName: true, avatarUrl: true, entriesCount: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const bracketLocked = Date.now() >= new Date(BRACKET_LOCK_ISO).getTime();

  const [picks, results, bracketPicks, bracketResults] = await Promise.all([
    prisma.matchPick.findMany({ where: { userId: user.id, entry }, select: { matchId: true, pick: true } }),
    prisma.matchResult.findMany({ select: { matchId: true, result: true, homeGoals: true, awayGoals: true, status: true } }),
    bracketLocked ? prisma.bracketPick.findMany({ where: { userId: user.id, entry }, select: { round: true, slot: true, team: true } }) : Promise.resolve([]),
    bracketLocked ? prisma.bracketResult.findMany({ select: { round: true, slot: true, team: true } }) : Promise.resolve([]),
  ]);

  const pickMap = new Map(picks.map((p) => [p.matchId, p.pick]));
  const resultMap = new Map(results.map((r) => [r.matchId, r]));

  const lockedPicks: PlayerPickEntry[] = [];

  for (const m of GROUP_MATCHES) {
    const pick = pickMap.get(m.matchId);
    if (!pick) continue;

    // Locked: kickoff has passed or a DB result exists
    const dbResult = resultMap.get(m.matchId);
    const hasResult = dbResult && dbResult.status !== 'scheduled';
    if (!isMatchLocked(m) && !hasResult) continue;

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

  const bracketResultMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));
  const roundNameMap = Object.fromEntries(BRACKET_ROUNDS.map((r) => [r.id, r.name]));

  const bracketEntries: BracketPickEntry[] = bracketPicks.map((bp) => {
    const actual = bracketResultMap.get(`${bp.round}-${bp.slot}`) ?? null;
    return {
      round: bp.round,
      roundName: roundNameMap[bp.round] ?? bp.round,
      slot: bp.slot,
      team: bp.team,
      actualTeam: actual,
      correct: actual !== null ? actual === bp.team : null,
    };
  });

  return NextResponse.json({
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    entry,
    entriesCount: user.entriesCount,
    picks: lockedPicks,
    bracketPicks: bracketEntries,
    bracketLocked,
  });
}
