import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { username: true, displayName: true, avatarUrl: true, favoriteTeam: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const updates: Record<string, unknown> = {};

  if ('displayName' in body) {
    const v = typeof body.displayName === 'string' ? body.displayName.trim() : null;
    if (v && v.length > 50) {
      return NextResponse.json({ error: 'Display name must be 50 characters or fewer' }, { status: 400 });
    }
    updates.displayName = v || null;
  }

  if ('favoriteTeam' in body) {
    updates.favoriteTeam = typeof body.favoriteTeam === 'string' ? body.favoriteTeam || null : null;
  }

  if ('avatarUrl' in body) {
    const v = body.avatarUrl;
    if (v && v !== '') {
      if (typeof v !== 'string' || !v.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      }
      if (v.length > 3_000_000) {
        return NextResponse.json({ error: 'Image too large (max ~2 MB)' }, { status: 400 });
      }
    }
    updates.avatarUrl = v || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields provided' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.userId }, data: updates });
  return NextResponse.json({ message: 'Profile updated' });
}
