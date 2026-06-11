import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ALL_TEAMS, isBracketLocked, MAX_ENTRIES } from '@/lib/worldcup-data';

const VALID_ROUNDS = new Set(['R32', 'R16', 'QF', 'SF', 'Final']);
const ROUND_MAX_SLOTS: Record<string, number> = {
  R32: 15,
  R16: 7,
  QF: 3,
  SF: 1,
  Final: 0,
};

function parseEntry(value: string | null): number {
  const n = parseInt(value ?? '1', 10);
  return isNaN(n) ? 1 : n;
}

function validateEntry(entry: number): NextResponse | null {
  if (!Number.isInteger(entry) || entry < 1 || entry > MAX_ENTRIES) {
    return NextResponse.json({ error: 'Invalid entry' }, { status: 400 });
  }
  return null;
}

// GET: fetch current user's bracket picks
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entry = parseEntry(request.nextUrl.searchParams.get('entry'));
  const err = validateEntry(entry);
  if (err) return err;

  const rows = await prisma.bracketPick.findMany({
    where: { userId: user.userId, entry },
    select: { round: true, slot: true, team: true },
  });

  return NextResponse.json({ picks: rows });
}

// DELETE: clear all bracket picks for current user (optionally for a specific entry)
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isBracketLocked()) return NextResponse.json({ error: 'Bracket is locked' }, { status: 423 });

  const entryParam = request.nextUrl.searchParams.get('entry');
  if (entryParam) {
    const entry = parseEntry(entryParam);
    const err = validateEntry(entry);
    if (err) return err;
    await prisma.bracketPick.deleteMany({ where: { userId: user.userId, entry } });
  } else {
    await prisma.bracketPick.deleteMany({ where: { userId: user.userId } });
  }
  return NextResponse.json({ ok: true });
}

// POST: save/update a single bracket pick
// Body: { round: string, slot: number, team: string, entry?: number }
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (isBracketLocked()) {
    return NextResponse.json({ error: 'Bracket is locked' }, { status: 423 });
  }

  try {
    const body = await request.json();
    const { round, slot, team } = body as { round: string; slot: number; team: string; entry?: number };
    const entry = typeof body.entry === 'number' ? body.entry : 1;

    const entryErr = validateEntry(entry);
    if (entryErr) return entryErr;

    if (!round || !VALID_ROUNDS.has(round)) {
      return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
    }

    if (typeof slot !== 'number' || slot < 0 || slot > ROUND_MAX_SLOTS[round]) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    }

    const validTeams = new Set(ALL_TEAMS);
    if (!team || !validTeams.has(team)) {
      return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
    }

    await prisma.bracketPick.upsert({
      where: { userId_entry_round_slot: { userId: user.userId, entry, round, slot } },
      update: { team },
      create: { userId: user.userId, entry, round, slot, team },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Save bracket pick error:', error);
    return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 });
  }
}
