import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ALL_TEAMS, isBracketLocked, isKnockoutKickoffPassed, MAX_ENTRIES } from '@/lib/worldcup-data';

// Slot keys ("round-slot") whose knockout game has kicked off — those picks
// are frozen. Slots with no fixture / no kickoff stay editable.
async function lockedSlotKeys(): Promise<Set<string>> {
  const fixtures = await prisma.knockoutMatch.findMany({ select: { round: true, slot: true, kickoff: true } });
  const locked = new Set<string>();
  for (const f of fixtures) {
    if (isKnockoutKickoffPassed(f.kickoff)) locked.add(`${f.round}-${f.slot}`);
  }
  return locked;
}

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

// DELETE: clear the current user's bracket picks, but keep picks for slots
// whose game has already kicked off (those are frozen).
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // After the midnight deadline nothing can be cleared
  if (isBracketLocked()) return NextResponse.json({ error: 'Bracket is locked' }, { status: 423 });

  const locked = await lockedSlotKeys();
  const entryParam = request.nextUrl.searchParams.get('entry');
  const where: { userId: number; entry?: number } = { userId: user.userId };
  if (entryParam) {
    const entry = parseEntry(entryParam);
    const err = validateEntry(entry);
    if (err) return err;
    where.entry = entry;
  }

  const picks = await prisma.bracketPick.findMany({ where, select: { id: true, round: true, slot: true } });
  const toDelete = picks.filter((p) => !locked.has(`${p.round}-${p.slot}`)).map((p) => p.id);
  if (toDelete.length > 0) {
    await prisma.bracketPick.deleteMany({ where: { id: { in: toDelete } } });
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

    // Frozen after the midnight deadline, or for a game already kicked off
    if (isBracketLocked()) {
      return NextResponse.json({ error: 'Bracket is locked' }, { status: 423 });
    }
    if ((await lockedSlotKeys()).has(`${round}-${slot}`)) {
      return NextResponse.json({ error: 'This game has started' }, { status: 423 });
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
