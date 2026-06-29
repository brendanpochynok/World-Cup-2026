import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminRequest } from '@/lib/admin-auth';

// POST: flag (or clear) a player's bracket as invalid. The flag is surfaced as
// a badge next to their name on the standings.
// Body: { username, invalid: boolean }
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { username, invalid } = (await req.json()) as { username?: string; invalid?: boolean };
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

    const updated = await prisma.user.updateMany({
      where: { username },
      data: { bracketInvalid: invalid === true },
    });
    if (updated.count === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ ok: true, username, invalid: invalid === true });
  } catch (err) {
    console.error('Mark bracket invalid error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
