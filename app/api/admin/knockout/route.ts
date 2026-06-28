import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ALL_TEAMS } from '@/lib/worldcup-data';
import { isAdminRequest } from '@/lib/admin-auth';

const VALID_ROUNDS = new Set(['R32', 'R16', 'QF', 'SF', 'Final']);
const ROUND_MAX_SLOTS: Record<string, number> = { R32: 15, R16: 7, QF: 3, SF: 1, Final: 0 };
const VALID_TEAMS = new Set(ALL_TEAMS);

// POST: upsert one knockout fixture. Body: { round, slot, home?, away?, kickoff? }
// home/away are team names (or null to clear); kickoff is an ISO string (or null).
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { round, slot, home, away, kickoff } = (await req.json()) as {
      round: string; slot: number; home?: string | null; away?: string | null; kickoff?: string | null;
    };

    if (!round || !VALID_ROUNDS.has(round))
      return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
    if (typeof slot !== 'number' || slot < 0 || slot > ROUND_MAX_SLOTS[round])
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    for (const t of [home, away]) {
      if (t != null && t !== '' && !VALID_TEAMS.has(t))
        return NextResponse.json({ error: `Invalid team: ${t}` }, { status: 400 });
    }
    let kickoffDate: Date | null = null;
    if (kickoff) {
      kickoffDate = new Date(kickoff);
      if (isNaN(kickoffDate.getTime()))
        return NextResponse.json({ error: 'Invalid kickoff time' }, { status: 400 });
    }

    const data = {
      home: home || null,
      away: away || null,
      kickoff: kickoffDate,
    };
    const result = await prisma.knockoutMatch.upsert({
      where: { round_slot: { round, slot } },
      update: data,
      create: { round, slot, ...data },
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error('Knockout fixture error:', err);
    return NextResponse.json({ error: 'Failed to save fixture' }, { status: 500 });
  }
}

// DELETE: clear all knockout fixtures
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await prisma.knockoutMatch.deleteMany();
  return NextResponse.json({ ok: true });
}
