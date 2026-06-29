import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { MAX_ENTRIES, ENTRY_CHANGES_LOCK_ISO, isEntryChangesLocked } from '@/lib/worldcup-data';

export const dynamic = 'force-dynamic';

export interface MeEntries {
  entriesCount: number;
  locked: boolean;
  lockIso: string;
  announcementAcked: boolean;
  bracketUnlocked: boolean;
}

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { entriesCount: true, announcementAckedAt: true, bracketUnlocked: true },
  });

  const data: MeEntries = {
    entriesCount: row?.entriesCount ?? 1,
    locked: isEntryChangesLocked(),
    lockIso: ENTRY_CHANGES_LOCK_ISO,
    announcementAcked: row?.announcementAckedAt != null,
    bracketUnlocked: row?.bracketUnlocked ?? false,
  };
  return NextResponse.json(data);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    count?: number;
    ackAnnouncement?: boolean;
  };

  const updates: Record<string, unknown> = {};

  if (body.ackAnnouncement === true) {
    updates.announcementAckedAt = new Date();
  }

  if (typeof body.count === 'number') {
    if (isEntryChangesLocked()) {
      return NextResponse.json({ error: 'Entry changes are locked' }, { status: 423 });
    }
    const count = body.count;
    if (!Number.isInteger(count) || count < 1 || count > MAX_ENTRIES) {
      return NextResponse.json({ error: `Entry count must be 1–${MAX_ENTRIES}` }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { entriesCount: true },
    });
    const currentCount = currentUser?.entriesCount ?? 1;

    if (count < currentCount) {
      // Delete picks for removed entries
      await prisma.$transaction(async (tx) => {
        for (let entry = count + 1; entry <= currentCount; entry++) {
          await tx.matchPick.deleteMany({ where: { userId: user.userId, entry } });
          await tx.bracketPick.deleteMany({ where: { userId: user.userId, entry } });
        }
        await tx.user.update({ where: { id: user.userId }, data: { entriesCount: count } });
      });
    } else {
      updates.entriesCount = count;
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({ where: { id: user.userId }, data: updates });
  }

  const row = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { entriesCount: true, announcementAckedAt: true, bracketUnlocked: true },
  });

  const data: MeEntries = {
    entriesCount: row?.entriesCount ?? 1,
    locked: isEntryChangesLocked(),
    lockIso: ENTRY_CHANGES_LOCK_ISO,
    announcementAcked: row?.announcementAckedAt != null,
    bracketUnlocked: row?.bracketUnlocked ?? false,
  };
  return NextResponse.json(data);
}
