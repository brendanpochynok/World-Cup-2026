import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { syncESPNResults } from '@/lib/sync-espn';

export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await syncESPNResults();
  return NextResponse.json({ ok: true, ...result });
}
