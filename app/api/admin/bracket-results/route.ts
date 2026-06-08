import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ALL_TEAMS } from '@/lib/worldcup-data';
import { isAdminRequest } from '@/lib/admin-auth';

const VALID_ROUNDS = new Set(['R32', 'R16', 'QF', 'SF', 'Final']);
const ROUND_MAX_SLOTS: Record<string, number> = {
  R32: 15,
  R16: 7,
  QF: 3,
  SF: 1,
  Final: 0,
};
const VALID_TEAMS = new Set(ALL_TEAMS);

// GET: list all recorded bracket results
export async function GET(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const results = await prisma.bracketResult.findMany({ orderBy: [{ round: 'asc' }, { slot: 'asc' }] });
  return NextResponse.json({ results });
}

// POST: upsert a single bracket result { round, slot, team }
export async function POST(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { round, slot, team } = (await request.json()) as { round: string; slot: number; team: string };

    if (!round || !VALID_ROUNDS.has(round))
      return NextResponse.json({ error: 'Invalid round' }, { status: 400 });
    if (typeof slot !== 'number' || slot < 0 || slot > ROUND_MAX_SLOTS[round])
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    if (!team || !VALID_TEAMS.has(team))
      return NextResponse.json({ error: 'Invalid team' }, { status: 400 });

    const result = await prisma.bracketResult.upsert({
      where: { round_slot: { round, slot } },
      update: { team },
      create: { round, slot, team },
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error('Bracket result error:', err);
    return NextResponse.json({ error: 'Failed to save bracket result' }, { status: 500 });
  }
}

// DELETE: clear all bracket results
export async function DELETE(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.bracketResult.deleteMany();
  return NextResponse.json({ ok: true });
}
