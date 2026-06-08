import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GROUP_MATCHES } from '@/lib/worldcup-data';
import { isAdminRequest } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.matchResult.count();
  if (existing > 0) {
    return NextResponse.json({ message: 'Already seeded', count: existing });
  }

  await prisma.matchResult.createMany({
    data: GROUP_MATCHES.map((match) => ({
      matchId: match.matchId,
      status: 'scheduled',
    })),
  });

  return NextResponse.json({
    message: 'Seeded successfully',
    count: GROUP_MATCHES.length,
  });
}
