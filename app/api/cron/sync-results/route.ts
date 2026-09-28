import { NextRequest, NextResponse } from 'next/server';
import { syncESPNResults } from '@/lib/sync-espn';

export const dynamic = 'force-dynamic';

// Called by Vercel Cron — protected by Authorization header Vercel sends automatically.
// Unscheduled since the tournament ended: the 10-minute cron kept the Postgres
// compute awake around the clock. To resume, add back to vercel.json:
//   "crons": [{ "path": "/api/cron/sync-results", "schedule": "*/10 * * * *" }]
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
