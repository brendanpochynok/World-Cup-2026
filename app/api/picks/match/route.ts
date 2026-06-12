import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMatch, isMatchLocked } from '@/lib/worldcup-data';

export const dynamic = 'force-dynamic';

export interface MatchPicker {
  username: string;
  entry: number;
  label: string;
}

export interface MatchPickers {
  home: MatchPicker[];
  draw: MatchPicker[];
  away: MatchPicker[];
}

// GET ?matchId=A1 — who picked each side. Hidden until kickoff, matching
// the distribution endpoint: pre-kickoff this would reveal live picks.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const matchId = request.nextUrl.searchParams.get('matchId') ?? '';
  const match = getMatch(matchId);
  if (!match) return NextResponse.json({ error: 'Unknown match' }, { status: 400 });
  if (!isMatchLocked(match)) {
    return NextResponse.json({ error: 'Picks are hidden until kickoff' }, { status: 403 });
  }

  const picks = await prisma.matchPick.findMany({
    where: { matchId },
    select: {
      pick: true,
      entry: true,
      user: { select: { username: true, displayName: true, entriesCount: true } },
    },
  });

  const result: MatchPickers = { home: [], draw: [], away: [] };
  for (const p of picks) {
    const side = p.pick as keyof MatchPickers;
    if (!result[side]) continue;
    const label =
      (p.user.displayName ?? p.user.username) + (p.user.entriesCount > 1 ? ` (${p.entry})` : '');
    result[side].push({ username: p.user.username, entry: p.entry, label });
  }
  for (const side of ['home', 'draw', 'away'] as const) {
    result[side].sort((a, b) => a.label.localeCompare(b.label));
  }
  return NextResponse.json(result);
}
