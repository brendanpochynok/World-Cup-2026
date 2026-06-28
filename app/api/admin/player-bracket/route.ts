import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/admin-auth';

// GET ?username=&entry= — a player's bracket picks, for admin review.
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const username = req.nextUrl.searchParams.get('username') ?? '';
  const entryParam = parseInt(req.nextUrl.searchParams.get('entry') ?? '1', 10);
  const entry = Number.isInteger(entryParam) && entryParam >= 1 ? entryParam : 1;

  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const picks = await prisma.bracketPick.findMany({
    where: { userId: user.id, entry },
    select: { round: true, slot: true, team: true },
  });
  return NextResponse.json({ picks });
}
