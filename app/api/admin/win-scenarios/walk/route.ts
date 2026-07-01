import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { walkScenario, expandForcedChain, type WalkResult } from '@/lib/win-scenarios';
import { buildScenarioOdds } from '@/lib/scenario-odds';
import { loadScenarioInputs } from '@/lib/scenario-data';

export const dynamic = 'force-dynamic';

export interface WalkRequest {
  selectedKey: string;            // "username#entry"
  weighted?: boolean;             // weight games by Polymarket odds
  path?: { key: string; team: string }[]; // games already pinned this far down
}

export type WalkResponse = (WalkResult & { selectedKey: string }) | { error: string };

// Admin-only: steps one entry through the games that decide whether they win,
// given a path of already-chosen game winners.
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

  const { tree, entries, knockout, payout } = await loadScenarioInputs();

  let edgeProb: Record<string, Record<string, number>> | undefined;
  if (body.weighted) {
    const built = await buildScenarioOdds(knockout, Date.now());
    edgeProb = Object.keys(built.edgeProb).length > 0 ? built.edgeProb : undefined;
  }

  // Each chosen (slot, team) forces that team to win every game on its path to
  // the slot, so the constraints stay self-consistent.
  const forced: Record<string, string> = {};
  for (const step of body.path ?? []) {
    if (!step?.key || !step?.team) continue;
    Object.assign(forced, expandForcedChain(tree, step.key, step.team));
  }

  const result = walkScenario(tree, entries, { selectedKey: body.selectedKey, forced, edgeProb, payout });
  const data: WalkResponse = { ...result, selectedKey: body.selectedKey };
  return NextResponse.json(data);
}
