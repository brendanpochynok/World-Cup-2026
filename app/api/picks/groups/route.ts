import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { GROUP_MATCHES, MAX_ENTRIES } from '@/lib/worldcup-data';

const VALID_MATCH_IDS = new Set(GROUP_MATCHES.map((m) => m.matchId));
const VALID_PICKS = new Set(['home', 'draw', 'away']);

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

// GET: return all match picks for current user as { [matchId]: "home"|"draw"|"away" }
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entry = parseEntry(request.nextUrl.searchParams.get('entry'));
  const err = validateEntry(entry);
  if (err) return err;

  const picks = await prisma.matchPick.findMany({ where: { userId: user.userId, entry } });
  const result: Record<string, string> = {};
  for (const p of picks) result[p.matchId] = p.pick;
  return NextResponse.json({ picks: result });
}

// DELETE: clear all group picks for current user (optionally for a specific entry)
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entryParam = request.nextUrl.searchParams.get('entry');
  if (entryParam) {
    const entry = parseEntry(entryParam);
    const err = validateEntry(entry);
    if (err) return err;
    await prisma.matchPick.deleteMany({ where: { userId: user.userId, entry } });
  } else {
    await prisma.matchPick.deleteMany({ where: { userId: user.userId } });
  }
  return NextResponse.json({ ok: true });
}

// POST: upsert a single match pick
// Body: { matchId: "A1", pick: "home"|"draw"|"away", entry?: number }
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await request.json()) as { matchId: string; pick: string; entry?: number };
    const { matchId, pick } = body;
    const entry = typeof body.entry === 'number' ? body.entry : 1;

    const entryErr = validateEntry(entry);
    if (entryErr) return entryErr;

    if (!VALID_MATCH_IDS.has(matchId))
      return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 });
    if (!VALID_PICKS.has(pick))
      return NextResponse.json({ error: 'Invalid pick' }, { status: 400 });

    await prisma.matchPick.upsert({
      where: { userId_entry_matchId: { userId: user.userId, entry, matchId } },
      update: { pick },
      create: { userId: user.userId, entry, matchId, pick },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Save match pick error:', err);
    return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 });
  }
}
