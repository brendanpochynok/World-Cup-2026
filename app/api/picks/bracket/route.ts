import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ALL_TEAMS } from '@/lib/worldcup-data';

const VALID_ROUNDS = new Set(['R32', 'R16', 'QF', 'SF', 'Final']);
const ROUND_MAX_SLOTS: Record<string, number> = {
  R32: 15,   // slots 0-15
  R16: 7,    // slots 0-7
  QF: 3,     // slots 0-3
  SF: 1,     // slots 0-1
  Final: 0,  // slot 0
};

// GET: fetch current user's bracket picks
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.bracketPick.findMany({
    where: { userId: user.userId },
    select: { round: true, slot: true, team: true },
  });

  return NextResponse.json({ picks: rows });
}

// DELETE: clear all bracket picks for current user
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.bracketPick.deleteMany({ where: { userId: user.userId } });
  return NextResponse.json({ ok: true });
}

// POST: save/update a single bracket pick
// Body: { round: string, slot: number, team: string }
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { round, slot, team } = body as { round: string; slot: number; team: string };

    // Validate round
    if (!round || !VALID_ROUNDS.has(round)) {
      return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
    }

    // Validate slot
    if (typeof slot !== 'number' || slot < 0 || slot > ROUND_MAX_SLOTS[round]) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    }

    // Validate team
    const validTeams = new Set(ALL_TEAMS);
    if (!team || !validTeams.has(team)) {
      return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
    }

    await prisma.bracketPick.upsert({
      where: { userId_round_slot: { userId: user.userId, round, slot } },
      update: { team },
      create: { userId: user.userId, round, slot, team },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Save bracket pick error:', error);
    return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 });
  }
}
