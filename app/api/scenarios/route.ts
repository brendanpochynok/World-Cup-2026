import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isBracketLocked } from '@/lib/worldcup-data';
import { runWinScenarios } from '@/lib/scenario-run';

export const dynamic = 'force-dynamic';

// Public (signed-in) pool-win breakdown. Hidden until the bracket locks so it
// can't reveal picks early.
export async function GET(): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isBracketLocked()) {
    return NextResponse.json({ error: 'Win scenarios unlock once the bracket deadline passes.' });
  }
  return NextResponse.json(await runWinScenarios());
}
