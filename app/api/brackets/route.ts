import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isBracketLocked } from '@/lib/worldcup-data';
import { computeEliminatedTeams } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export interface BracketPlayer {
  username: string;
  displayName: string | null;
  entriesCount: number;
}

export interface SlotDistribution {
  teams: Record<string, number>; // team → count of entries that picked it
  total: number;                 // entries that made a pick in this slot
}

export interface BracketsResponse {
  me: string | null;
  locked: boolean;
  players: BracketPlayer[];
  r32: Record<number, [string, string]>;      // actual R32 matchups by slot
  results: Record<string, string>;            // "round-slot" → actual winner
  eliminated: string[];                       // teams knocked out — dead picks
  // Present only once brackets lock, so pre-lock percentages can't reveal
  // individual picks in a small pool.
  distribution: Record<string, SlotDistribution>;
  // The requested bracket (defaults to the signed-in player's entry 1).
  selected: {
    username: string;
    displayName: string | null;
    entry: number;
    entriesCount: number;
    visible: boolean;                         // false → hidden until lock
    picks: { round: string; slot: number; team: string }[];
  } | null;
}

// Powers the user-facing Brackets tab: the roster of players, the live R32
// matchups + results, pool-wide pick distribution, and one selected bracket.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser();
  const locked = isBracketLocked();

  const [users, koMatches, bracketResults] = await Promise.all([
    prisma.user.findMany({
      select: { username: true, displayName: true, entriesCount: true, bracketPicks: { select: { id: true }, take: 1 } },
      orderBy: { username: 'asc' },
    }),
    prisma.knockoutMatch.findMany(),
    prisma.bracketResult.findMany(),
  ]);

  // Only list players who have at least one bracket pick.
  const players: BracketPlayer[] = users
    .filter((u) => u.bracketPicks.length > 0)
    .map((u) => ({ username: u.username, displayName: u.displayName, entriesCount: u.entriesCount ?? 1 }));

  const r32: Record<number, [string, string]> = {};
  for (const k of koMatches) {
    if (k.round === 'R32' && k.home && k.away) r32[k.slot] = [k.home, k.away];
  }

  const results: Record<string, string> = {};
  for (const r of bracketResults) results[`${r.round}-${r.slot}`] = r.team;
  const resultMap = new Map(bracketResults.map((r) => [`${r.round}-${r.slot}`, r.team]));
  const eliminated = Array.from(computeEliminatedTeams(koMatches, resultMap));

  // Pool-wide distribution — every entry's pick per slot, counted by team.
  const distribution: Record<string, SlotDistribution> = {};
  if (locked) {
    const allPicks = await prisma.bracketPick.findMany({ select: { round: true, slot: true, team: true } });
    for (const p of allPicks) {
      const key = `${p.round}-${p.slot}`;
      const d = (distribution[key] ??= { teams: {}, total: 0 });
      d.teams[p.team] = (d.teams[p.team] ?? 0) + 1;
      d.total += 1;
    }
  }

  // Resolve the requested bracket (default: the signed-in player, entry 1).
  const reqUsername = req.nextUrl.searchParams.get('username') ?? session?.username ?? null;
  const entryParam = parseInt(req.nextUrl.searchParams.get('entry') ?? '1', 10);
  const entry = Number.isInteger(entryParam) && entryParam >= 1 ? entryParam : 1;

  let selected: BracketsResponse['selected'] = null;
  if (reqUsername) {
    const target = await prisma.user.findUnique({
      where: { username: reqUsername },
      select: { id: true, username: true, displayName: true, entriesCount: true },
    });
    if (target) {
      const isOwn = session?.username === target.username;
      const visible = isOwn || locked; // others' brackets hidden until lock
      const picks = visible
        ? await prisma.bracketPick.findMany({
            where: { userId: target.id, entry },
            select: { round: true, slot: true, team: true },
          })
        : [];
      selected = {
        username: target.username,
        displayName: target.displayName,
        entry,
        entriesCount: target.entriesCount ?? 1,
        visible,
        picks,
      };
    }
  }

  const data: BracketsResponse = { me: session?.username ?? null, locked, players, r32, results, eliminated, distribution, selected };
  return NextResponse.json(data);
}
