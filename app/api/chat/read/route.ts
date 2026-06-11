import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// POST: mark chat read up to a message id. Body: { lastId: number }
// Only moves the marker forward, so stale requests can't unread messages.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { lastId } = (await request.json()) as { lastId?: number };
    if (!Number.isInteger(lastId) || lastId! < 1) {
      return NextResponse.json({ error: 'Invalid lastId' }, { status: 400 });
    }
    await prisma.user.updateMany({
      where: { id: user.userId, chatLastReadId: { lt: lastId! } },
      data: { chatLastReadId: lastId! },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to mark read' }, { status: 500 });
  }
}
