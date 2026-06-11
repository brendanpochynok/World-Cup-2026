import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

const MAX_EMOJI_LENGTH = 16; // emoji can be multi-codepoint sequences

// POST: toggle a reaction. Body: { messageId: number, emoji: string }
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { messageId, emoji } = (await request.json()) as { messageId?: number; emoji?: string };
    if (!Number.isInteger(messageId)) {
      return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
    }
    if (typeof emoji !== 'string' || emoji.length === 0 || emoji.length > MAX_EMOJI_LENGTH || /\s/.test(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId! },
      select: { id: true },
    });
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const removed = await prisma.chatReaction.deleteMany({
      where: { messageId: messageId!, userId: user.userId, emoji },
    });
    if (removed.count === 0) {
      // .catch absorbs the unique-constraint race from double-clicks
      await prisma.chatReaction
        .create({ data: { messageId: messageId!, userId: user.userId, emoji } })
        .catch(() => null);
    }
    return NextResponse.json({ ok: true, reacted: removed.count === 0 });
  } catch {
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
