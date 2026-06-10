import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

const VALID_CHOICES = new Set(['10', '20', 'none']);

// GET: current user's vote + overall tallies
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [myVote, votes] = await Promise.all([
    prisma.feeVote.findUnique({ where: { userId: user.userId } }),
    prisma.feeVote.groupBy({ by: ['choice'], _count: { choice: true } }),
  ]);

  const tallies: Record<string, number> = { '10': 0, '20': 0, none: 0 };
  for (const v of votes) tallies[v.choice] = v._count.choice;

  return NextResponse.json({ myVote: myVote?.choice ?? null, tallies });
}

// POST: cast or change a vote. Body: { choice: "10" | "20" | "none" }
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { choice } = (await request.json()) as { choice: string };
    if (!VALID_CHOICES.has(choice)) {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }

    await prisma.feeVote.upsert({
      where: { userId: user.userId },
      update: { choice },
      create: { userId: user.userId, choice },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Fee vote error:', error);
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 });
  }
}
