import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const config = await prisma.poolConfig.findUnique({ where: { id: 1 } });
  return NextResponse.json(config ?? { id: 1, entryFeePerPlayer: 0 });
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fee = body?.entryFeePerPlayer;

  if (typeof fee !== 'number' || fee < 0) {
    return NextResponse.json({ error: 'entryFeePerPlayer must be a non-negative number' }, { status: 400 });
  }

  const config = await prisma.poolConfig.upsert({
    where: { id: 1 },
    update: { entryFeePerPlayer: fee },
    create: { id: 1, entryFeePerPlayer: fee },
  });

  return NextResponse.json(config);
}
