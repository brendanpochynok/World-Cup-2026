import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { GROUP_MATCHES } from '@/lib/worldcup-data';

const VALID_MATCH_IDS = new Set(GROUP_MATCHES.map((m) => m.matchId));
const VALID_PICKS = new Set(['home', 'draw', 'away']);

// GET: return all match picks for current user as { [matchId]: "home"|"draw"|"away" }
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const picks = await prisma.matchPick.findMany({ where: { userId: user.userId } });
  const result: Record<string, string> = {};
  for (const p of picks) result[p.matchId] = p.pick;
  return NextResponse.json({ picks: result });
}

// DELETE: clear all group picks for current user
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.matchPick.deleteMany({ where: { userId: user.userId } });
  return NextResponse.json({ ok: true });
}

// POST: upsert a single match pick
// Body: { matchId: "A1", pick: "home"|"draw"|"away" }
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { matchId, pick } = (await request.json()) as { matchId: string; pick: string };

    if (!VALID_MATCH_IDS.has(matchId))
      return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 });
    if (!VALID_PICKS.has(pick))
      return NextResponse.json({ error: 'Invalid pick' }, { status: 400 });

    await prisma.matchPick.upsert({
      where: { userId_matchId: { userId: user.userId, matchId } },
      update: { pick },
      create: { userId: user.userId, matchId, pick },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Save match pick error:', err);
    return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 });
  }
}
