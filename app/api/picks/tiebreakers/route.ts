import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.tiebreakerPick.findMany({ where: { userId: user.userId } });
  const picks: Record<string, string[]> = {};
  for (const row of rows) {
    try { picks[row.groupId] = JSON.parse(row.teamOrder); } catch { /* skip malformed */ }
  }
  return NextResponse.json({ picks });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, teamOrder } = await req.json();
  if (!groupId || !Array.isArray(teamOrder)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  await prisma.tiebreakerPick.upsert({
    where: { userId_groupId: { userId: user.userId, groupId } },
    create: { userId: user.userId, groupId, teamOrder: JSON.stringify(teamOrder) },
    update: { teamOrder: JSON.stringify(teamOrder) },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.tiebreakerPick.deleteMany({ where: { userId: user.userId } });
  return NextResponse.json({ ok: true });
}
