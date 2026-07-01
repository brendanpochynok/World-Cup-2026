import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { isBracketLocked } from '@/lib/worldcup-data';
import { runWalk } from '@/lib/scenario-run';

export const dynamic = 'force-dynamic';

interface WalkRequest {
  selectedKey: string;
  path?: { key: string; team: string }[];
}

// Public (signed-in) walkthrough. Hidden until the bracket locks.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isBracketLocked()) return NextResponse.json({ error: 'Win scenarios unlock once the bracket deadline passes.' });

  let body: WalkRequest;
  try {
    body = (await req.json()) as WalkRequest;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!body?.selectedKey) return NextResponse.json({ error: 'Missing selectedKey' }, { status: 400 });
  return NextResponse.json(await runWalk(body.selectedKey, body.path ?? []));
}
