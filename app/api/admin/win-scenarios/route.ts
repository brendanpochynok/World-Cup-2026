import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { runWinScenarios, type WinScenariosResponse } from '@/lib/scenario-run';

export const dynamic = 'force-dynamic';

export type { WinScenariosResponse };

// Admin view of the pool-win breakdown (odds-weighted win %, expected payout,
// per-champion). Same computation as the public /api/scenarios route.
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await runWinScenarios());
}
