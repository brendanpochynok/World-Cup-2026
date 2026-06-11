import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: number of chat messages from others since the user's last read
export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ unread: 0 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { chatLastReadId: true },
  });
  if (!dbUser) return NextResponse.json({ unread: 0 });

  const unread = await prisma.chatMessage.count({
    where: { id: { gt: dbUser.chatLastReadId }, userId: { not: user.userId } },
  });
  return NextResponse.json({ unread });
}
