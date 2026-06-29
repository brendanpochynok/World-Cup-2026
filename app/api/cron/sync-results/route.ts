import { NextRequest, NextResponse } from 'next/server';
import { syncESPNResults } from '@/lib/sync-espn';

export const dynamic = 'force-dynamic';

// Called by Vercel Cron — protected by Authorization header Vercel sends automatically
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await syncESPNResults();
  console.log(`[cron] ESPN sync: ${result.synced} matches synced`);
  return NextResponse.json({ ok: true, ...result });
}
