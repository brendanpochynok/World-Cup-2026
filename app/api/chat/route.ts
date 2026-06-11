import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isAdminRequest } from '@/lib/admin-auth';

const MAX_LENGTH = 500;
const PAGE_SIZE = 100;

export interface ChatMessageData {
  id: number;
  body: string;
  createdAt: string;
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  mine: boolean;
  users: string[]; // display names of who reacted
}

// Aggregated reactions for the latest messages, keyed by message id.
// Sent with every poll so reaction changes on existing messages propagate.
async function recentReactions(meId: number): Promise<Record<number, MessageReaction[]>> {
  const recent = await prisma.chatMessage.findMany({
    orderBy: { id: 'desc' },
    take: PAGE_SIZE,
    select: { id: true },
  });
  if (recent.length === 0) return {};

  const rows = await prisma.chatReaction.findMany({
    where: { messageId: { in: recent.map((m) => m.id) } },
    orderBy: { id: 'asc' },
    select: {
      messageId: true,
      emoji: true,
      userId: true,
      user: { select: { username: true, displayName: true } },
    },
  });
  const map: Record<number, MessageReaction[]> = {};
  for (const r of rows) {
    const list = (map[r.messageId] ??= []);
    const name = r.user.displayName ?? r.user.username;
    const existing = list.find((x) => x.emoji === r.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(name);
      if (r.userId === meId) existing.mine = true;
    } else {
      list.push({ emoji: r.emoji, count: 1, mine: r.userId === meId, users: [name] });
    }
  }
  return map;
}

const USER_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
} as const;

type MessageRow = {
  id: number;
  body: string;
  createdAt: Date;
  user: { id: number; username: string; displayName: string | null; avatarUrl: string | null };
};

function toData(m: MessageRow): ChatMessageData {
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    userId: m.user.id,
    username: m.user.username,
    displayName: m.user.displayName,
    avatarUrl: m.user.avatarUrl,
  };
}

// GET: latest messages, oldest first. ?after=<id> returns only newer messages
// so polling clients can fetch incrementally.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const afterParam = request.nextUrl.searchParams.get('after');
  const after = afterParam ? parseInt(afterParam, 10) : NaN;

  if (!isNaN(after)) {
    const [messages, reactions] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { id: { gt: after } },
        orderBy: { id: 'asc' },
        take: PAGE_SIZE,
        select: USER_SELECT,
      }),
      recentReactions(user.userId),
    ]);
    return NextResponse.json({ messages: messages.map(toData), reactions });
  }

  // Latest page: query newest first, then reverse into display order
  const [messages, reactions] = await Promise.all([
    prisma.chatMessage.findMany({
      orderBy: { id: 'desc' },
      take: PAGE_SIZE,
      select: USER_SELECT,
    }),
    recentReactions(user.userId),
  ]);
  return NextResponse.json({ messages: messages.reverse().map(toData), reactions });
}

// POST: send a message. Body: { body: string }
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { body } = (await request.json()) as { body?: string };
    const text = (body ?? '').trim();
    if (!text) return NextResponse.json({ error: 'Message is empty' }, { status: 400 });
    if (text.length > MAX_LENGTH)
      return NextResponse.json({ error: `Message too long (max ${MAX_LENGTH} characters)` }, { status: 400 });

    const message = await prisma.chatMessage.create({
      data: { userId: user.userId, body: text },
      select: USER_SELECT,
    });
    return NextResponse.json({ message: toData(message) });
  } catch (err) {
    console.error('Send chat message error:', err);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// DELETE: remove a message (?id=). Authors can delete their own; admins any.
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(request.nextUrl.searchParams.get('id') ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const message = await prisma.chatMessage.findUnique({ where: { id } });
  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (message.userId !== user.userId && !(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.chatMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
