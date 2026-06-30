import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isBracketLocked } from '@/lib/worldcup-data';

export const dynamic = 'force-dynamic';

export interface BracketPicker {
  username: string;
  displayName: string | null;
  entry: number;
  entriesCount: number;
}

export interface PickersResponse {
  round: string;
  slot: number;
  team: string;
  pickers: BracketPicker[];
}

const VALID_ROUNDS = new Set(['R32', 'R16', 'QF', 'SF', 'Final']);

// GET ?round=&slot=&team= — every entry that picked this team in this slot.
// Hidden until the bracket locks so it can't reveal picks early.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isBracketLocked()) return NextResponse.json({ pickers: [] });

  const round = req.nextUrl.searchParams.get('round') ?? '';
  const team = req.nextUrl.searchParams.get('team') ?? '';
  const slot = parseInt(req.nextUrl.searchParams.get('slot') ?? '', 10);
  if (!VALID_ROUNDS.has(round) || !team || !Number.isInteger(slot) || slot < 0) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const rows = await prisma.bracketPick.findMany({
    where: { round, slot, team },
    select: { entry: true, user: { select: { username: true, displayName: true, entriesCount: true } } },
  });

  const pickers: BracketPicker[] = rows
    .map((r) => ({
      username: r.user.username,
      displayName: r.user.displayName,
      entry: r.entry,
      entriesCount: r.user.entriesCount ?? 1,
    }))
    .sort((a, b) =>
      (a.displayName || a.username).localeCompare(b.displayName || b.username) || a.entry - b.entry,
    );

  const data: PickersResponse = { round, slot, team, pickers };
  return NextResponse.json(data);
}
