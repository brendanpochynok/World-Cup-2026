import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { advanceKnockoutFixtures } from '@/lib/advance-knockout';

export const dynamic = 'force-dynamic';

// POST: manually advance knockout winners into next-round fixtures (teams from
// bracket results, kickoffs from ESPN's schedule). Reports what it filled.
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const result = await advanceKnockoutFixtures();
  return NextResponse.json({ ok: true, ...result });
}
