import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/admin-auth';
import { ALL_TEAMS } from '@/lib/worldcup-data';

const VALID_ROUNDS = new Set(['R32', 'R16', 'QF', 'SF', 'Final']);
const ROUND_MAX_SLOTS: Record<string, number> = { R32: 15, R16: 7, QF: 3, SF: 1, Final: 0 };
const VALID_TEAMS = new Set(ALL_TEAMS);

function resolveEntry(raw: string | null): number {
  const n = parseInt(raw ?? '1', 10);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

// GET ?username=&entry= — a player's bracket picks, for admin review.
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const username = req.nextUrl.searchParams.get('username') ?? '';
  const entry = resolveEntry(req.nextUrl.searchParams.get('entry'));

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const picks = await prisma.bracketPick.findMany({
    where: { userId: user.id, entry },
    select: { round: true, slot: true, team: true },
  });
  return NextResponse.json({ picks });
}

// POST — admin override of one slot in a single player's bracket.
// Body: { username, entry, round, slot, team }
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { username, entry: entryRaw, round, slot, team } = (await req.json()) as {
      username?: string; entry?: number; round?: string; slot?: number; team?: string;
    };
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });
    if (!round || !VALID_ROUNDS.has(round))
      return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
    if (typeof slot !== 'number' || slot < 0 || slot > ROUND_MAX_SLOTS[round])
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    if (!team || !VALID_TEAMS.has(team))
      return NextResponse.json({ error: 'Invalid team' }, { status: 400 });

    const entry = Number.isInteger(entryRaw) && (entryRaw as number) >= 1 ? (entryRaw as number) : 1;
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.bracketPick.upsert({
      where: { userId_entry_round_slot: { userId: user.id, entry, round, slot } },
      update: { team },
      create: { userId: user.id, entry, round, slot, team },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin player-bracket POST error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE ?username=&entry=[&round=&slot=] — clear one slot, or the whole
// bracket for that entry when no round/slot is given. Lets an admin wipe an
// invalid bracket so the player can refill it (pair with the unlock toggle).
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const username = req.nextUrl.searchParams.get('username') ?? '';
  const entry = resolveEntry(req.nextUrl.searchParams.get('entry'));
  const round = req.nextUrl.searchParams.get('round');
  const slotRaw = req.nextUrl.searchParams.get('slot');

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (round && slotRaw !== null) {
    if (!VALID_ROUNDS.has(round)) return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
    const slot = parseInt(slotRaw, 10);
    if (!Number.isInteger(slot) || slot < 0 || slot > ROUND_MAX_SLOTS[round])
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    await prisma.bracketPick.deleteMany({ where: { userId: user.id, entry, round, slot } });
    return NextResponse.json({ ok: true, cleared: 1 });
  }

  const res = await prisma.bracketPick.deleteMany({ where: { userId: user.id, entry } });
  return NextResponse.json({ ok: true, cleared: res.count });
}
