import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/admin-auth';

// POST: grant or revoke a per-user bracket unlock, exempting that player from
// the global midnight lock (already-started games stay locked).
// Body: { username, unlocked: boolean }
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { username, unlocked } = (await req.json()) as { username?: string; unlocked?: boolean };
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

    const updated = await prisma.user.updateMany({
      where: { username },
      data: { bracketUnlocked: unlocked === true },
    });
    if (updated.count === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ ok: true, username, unlocked: unlocked === true });
  } catch (err) {
    console.error('Unlock bracket error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
