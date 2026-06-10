import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface PoolWinEntry {
  id: number;
  poolName: string;
  year: number;
  position: number;
  trophyImage: string | null;
  awardedAt: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  // Route params arrive URL-encoded; decode for emoji/special-char usernames
  const user = await prisma.user.findUnique({
    where: { username: decodeURIComponent(params.username) },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const wins = await prisma.poolWin.findMany({
    where: { userId: user.id },
    orderBy: [{ year: 'desc' }, { position: 'asc' }],
    select: { id: true, poolName: true, year: true, position: true, trophyImage: true, awardedAt: true },
  });

  return NextResponse.json({
    wins: wins.map((w) => ({ ...w, awardedAt: w.awardedAt.toISOString() })),
  });
}
