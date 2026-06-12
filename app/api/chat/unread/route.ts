import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SEEN_THROTTLE_MS = 5 * 60_000;

// GET: number of chat messages from others since the user's last read.
// Doubles as the "last seen" heartbeat — the nav badge polls this from
// every page while logged in, so it tracks site visits cheaply.
export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ unread: 0 });

  const [dbUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.userId },
      select: { chatLastReadId: true },
    }),
    prisma.user.updateMany({
      where: {
        id: user.userId,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(Date.now() - SEEN_THROTTLE_MS) } }],
      },
      data: { lastSeenAt: new Date() },
    }).catch(() => null),
  ]);
  if (!dbUser) return NextResponse.json({ unread: 0 });

  const unread = await prisma.chatMessage.count({
    where: { id: { gt: dbUser.chatLastReadId }, userId: { not: user.userId } },
  });
  return NextResponse.json({ unread });
}
