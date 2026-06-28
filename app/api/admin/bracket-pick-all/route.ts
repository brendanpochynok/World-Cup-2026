import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ALL_TEAMS } from '@/lib/worldcup-data';
import { isAdminRequest } from '@/lib/admin-auth';

const VALID_ROUNDS = new Set(['R32', 'R16', 'QF', 'SF', 'Final']);
const ROUND_MAX_SLOTS: Record<string, number> = { R32: 15, R16: 7, QF: 3, SF: 1, Final: 0 };
const VALID_TEAMS = new Set(ALL_TEAMS);

// POST: set a bracket pick for EVERY player (all entries) — used to apply a
// uniform pick when a game's pick was stranded by a reseed.
// Body: { round, slot, team }
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { round, slot, team } = (await req.json()) as { round: string; slot: number; team: string };
    if (!round || !VALID_ROUNDS.has(round))
      return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
    if (typeof slot !== 'number' || slot < 0 || slot > ROUND_MAX_SLOTS[round])
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    if (!team || !VALID_TEAMS.has(team))
      return NextResponse.json({ error: 'Invalid team' }, { status: 400 });

    const users = await prisma.user.findMany({ select: { id: true, entriesCount: true } });
    let count = 0;
    // Batched to keep the pool happy
    const ops: Promise<unknown>[] = [];
    for (const u of users) {
      for (let entry = 1; entry <= u.entriesCount; entry++) {
        ops.push(
          prisma.bracketPick.upsert({
            where: { userId_entry_round_slot: { userId: u.id, entry, round, slot } },
            update: { team },
            create: { userId: u.id, entry, round, slot, team },
          })
        );
        count++;
      }
    }
    for (let i = 0; i < ops.length; i += 25) {
      await Promise.all(ops.slice(i, i + 25));
    }
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    console.error('Bulk bracket pick error:', err);
    return NextResponse.json({ error: 'Failed to apply pick' }, { status: 500 });
  }
}
