import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { runWalk, type WalkResponse } from '@/lib/scenario-run';

export const dynamic = 'force-dynamic';

export interface WalkRequest {
  selectedKey: string;            // "username#entry"
  path?: { key: string; team: string }[]; // games already pinned this far down
}

export type { WalkResponse };

// Admin: steps one entry through the games that decide whether they win.
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: WalkRequest;
  try {
    body = (await req.json()) as WalkRequest;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!body?.selectedKey) return NextResponse.json({ error: 'Missing selectedKey' }, { status: 400 });
  return NextResponse.json(await runWalk(body.selectedKey, body.path ?? []));
}
