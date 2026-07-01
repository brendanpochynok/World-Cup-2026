// Verifies the win-scenarios bracket simulation logic (no DB needed).
// Run with: npm run test:sim
import {
  computeWinScenarios,
  reachableTeams,
  expandForcedChain,
  validateBracketConsistency,
  type TreeInput,
  type ScenarioEntryInput,
} from '../lib/win-scenarios';

let pass = 0;
let fail = 0;
const ok = (c: boolean, msg: string) => {
  if (c) pass++;
  else { fail++; console.log('  FAIL:', msg); }
};

// Full 32-team bracket; teams named by R32 slot + side.
const r32: Record<number, [string, string]> = {};
for (let s = 0; s < 16; s++) r32[s] = [`A${s}`, `B${s}`];
const tree: TreeInput = { r32, decided: {} };

// 1. Reachability with nothing decided.
const reach = reachableTeams(tree);
ok(reach.get('Final-0')!.size === 32, 'Final reachable = all 32 teams');
ok(reach.get('SF-0')!.size === 16 && reach.get('SF-1')!.size === 16, 'each SF slot reachable = 16 teams');
ok(Array.from(reach.get('R16-3')!).sort().join(',') === 'A6,A7,B6,B7', 'R16-3 reachable = its 4 R32 teams');
const left = reach.get('SF-0')!;
const right = reach.get('SF-1')!;
ok(Array.from(left).every((t) => !right.has(t)), 'bracket halves are disjoint');

// 2. Small (8-team) bracket: exact completion count + reachable champions.
const small: TreeInput = { r32: {}, decided: {} };
for (let s = 0; s < 16; s++) small.r32[s] = [`A${s}`, `B${s}`];
for (let s = 0; s < 16; s++) small.decided[`R32-${s}`] = `A${s}`;
for (let s = 0; s < 8; s++) small.decided[`R16-${s}`] = `A${s * 2}`; // leaves QF+SF+Final = 7 games
const e = (k: string, picks: Record<string, string>): ScenarioEntryInput =>
  ({ key: k, username: k, displayName: k, entry: 1, entriesCount: 1, fixedScore: 0, maxScore: 100, picks });
const res = computeWinScenarios(small, [
  e('champA0', { 'QF-0': 'A0', 'SF-0': 'A0', 'Final-0': 'A0' }),
  e('champA8', { 'QF-2': 'A8', 'SF-1': 'A8', 'Final-0': 'A8' }),
], { payout: { first: 100, second: 0 } });
ok(res.scenarios === 128, `8-team bracket has 2^7=128 completions (got ${res.scenarios})`);
const champs = res.byChampion.map((c) => c.champion).sort();
const expected = [0, 2, 4, 6, 8, 10, 12, 14].map((i) => `A${i}`).sort();
ok(JSON.stringify(champs) === JSON.stringify(expected), `champions = R16 winners (${champs.join(',')})`);
const a0 = res.contenders.find((c) => c.key === 'champA0')!;
const a8 = res.contenders.find((c) => c.key === 'champA8')!;
ok(Math.abs(a0.winPct - a8.winPct) < 1e-3, `mirror entries have equal win% (${a0.winPct} vs ${a8.winPct})`);
ok(a0.winPct > 0 && a0.winPct < 100, 'champA0 win% strictly between 0 and 100');

// 3. Forced chain pins a champion's whole path.
const chain = expandForcedChain(small, 'Final-0', 'A0');
ok(['Final-0', 'SF-0', 'QF-0', 'R16-0', 'R32-0'].every((k) => chain[k] === 'A0'),
  `forced chain pins A0's whole path (${JSON.stringify(chain)})`);

// 4. Consistency validator.
ok(validateBracketConsistency(small).length === 0, 'valid bracket => no warnings');
ok(validateBracketConsistency({ r32: { ...small.r32 }, decided: { ...small.decided, 'R16-0': 'B0' } }).length > 0,
  'R16 winner that lost its R32 => warning');
ok(validateBracketConsistency({ r32: { ...small.r32 }, decided: { ...small.decided, 'SF-0': 'A0', 'SF-1': 'A8', 'Final-0': 'A5' } })
  .some((w) => w.includes('Final-0')), 'champion not from either finalist => warning');

// 5. Propagation narrows reach as results come in.
const partial = reachableTeams({ r32, decided: { 'R32-0': 'A0', 'R32-1': 'B1' } });
ok(Array.from(partial.get('R16-0')!).sort().join(',') === 'A0,B1', 'decided R32 feeders => R16-0 reach = {A0,B1}');

console.log(`\n${pass}/${pass + fail} bracket-sim checks passed` + (fail ? ` — ${fail} FAILED` : ' ✅'));
process.exit(fail ? 1 : 0);
