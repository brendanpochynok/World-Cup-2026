import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !(await isAdminUser(user.userId, user.username))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const wins = await prisma.poolWin.findMany({
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: [{ year: 'desc' }, { position: 'asc' }],
  });
  return NextResponse.json({ wins });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !(await isAdminUser(user.userId, user.username))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { username, poolName, year, position, trophyImage } = await req.json();
  if (!username || !poolName || !year) {
    return NextResponse.json({ error: 'username, poolName and year are required' }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const win = await prisma.poolWin.create({
    data: {
      userId: target.id,
      poolName,
      year: Number(year),
      position: Number(position ?? 1),
      trophyImage: trophyImage || null,
    },
  });
  return NextResponse.json({ win });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !(await isAdminUser(user.userId, user.username))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await req.json();
  await prisma.poolWin.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
