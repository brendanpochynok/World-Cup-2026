'use client';

// Pool-win breakdown + interactive scenario walkthrough. Shared by the public
// /app/scenarios page and the admin panel — always odds-weighted. `apiBase`
// points at either /api/scenarios (public) or /api/admin/win-scenarios (admin).

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTeamMeta, getFlagUrl } from '@/lib/worldcup-data';
import type { WinScenariosResponse, WalkResponse } from '@/lib/scenario-run';

export function fmtPct(n: number): string {
  if (n <= 0) return '0%';
  if (n >= 100) return '100%';
  if (n < 1) return '<1%';
  if (n > 99) return '>99%';
  if (n < 10) return `${n.toFixed(1)}%`;
  return `${Math.round(n)}%`;
}

export function fmtMoney(n: number): string {
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: n < 100 ? 2 : 0 });
}

type OkData = Extract<WinScenariosResponse, { contenders: unknown }>;

function buildSummary(d: OkData): string {
  const lines: string[] = ['🏆 POOL WIN SCENARIOS'];
  lines.push(`${d.branchingGames} game${d.branchingGames !== 1 ? 's' : ''} left · ${d.scenarios.toLocaleString()} outcomes`);
  lines.push(`${d.eliminatedCount} of ${d.totalEntries} entries can no longer win.`);
  if (d.pot > 0) lines.push(`Prize pool ${fmtMoney(d.pot)}.`);
  lines.push('');
  lines.push('Chances to win:');
  for (const c of d.contenders) {
    const label = (c.displayName || c.username) + (c.entriesCount > 1 ? ` #${c.entry}` : '');
    const tag = c.status === 'clinched' ? ' 🔒 CLINCHED' : '';
    const ev = d.pot > 0 ? ` · EV ${fmtMoney(c.expectedPayout)}` : '';
    lines.push(`• ${label}: ${fmtPct(c.winPct)}${tag}${ev}`);
  }
  if (d.byChampion.length > 0) {
    lines.push('', 'If the World Cup is won by…');
    for (const ch of d.byChampion) {
      const who = ch.winners.map((w) => `${w.displayName} ${fmtPct(w.winPct)}`).join(', ');
      lines.push(`• ${ch.champion} (${fmtPct(ch.pct)}) → ${who || 'nobody decided'}`);
    }
  }
  return lines.join('\n');
}

export default function WinScenarios({
  apiBase,
  heading = 'Who can still win the pool',
  blurb = 'Every remaining knockout game is weighted by live Polymarket odds, so these are realistic chances of finishing first — and expected winnings.',
  meLabel,
}: {
  apiBase: string;
  heading?: string;
  blurb?: string;
  meLabel?: string; // highlight the signed-in player's own entries
}) {
  const [data, setData] = useState<WinScenariosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [walk, setWalk] = useState<{ key: string; label: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiBase);
      const json: WinScenariosResponse = await res.json();
      if ('error' in json) { setError(json.error); setData(null); }
      else setData(json);
    } catch {
      setError('Failed to load scenarios.');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { load(); }, [load]);

  async function copySummary() {
    if (!data || 'error' in data) return;
    try {
      await navigator.clipboard.writeText(buildSummary(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  const isMe = (label: string) => !!meLabel && label.startsWith(meLabel);

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{heading}</h3>
            <p className="text-gray-500 text-sm mt-0.5">{blurb}</p>
          </div>
          <button onClick={load} className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0" disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="card text-center text-gray-400 text-sm py-12">Crunching the scenarios…</div>
      ) : error ? (
        <div className="card text-center py-10">
          <p className="text-wc-red-500 text-sm font-semibold">{error}</p>
          <button onClick={load} className="btn-secondary text-xs px-3 py-1.5 mt-3">Try again</button>
        </div>
      ) : data && !('error' in data) ? (
        <>
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="text-gray-700">
                <span className="font-bold tabular-nums">{data.branchingGames}</span> game
                {data.branchingGames !== 1 ? 's' : ''} left
              </span>
              <span className="text-gray-700">
                <span className="font-bold tabular-nums">{data.scenarios.toLocaleString()}</span> outcomes
              </span>
              <span className="text-gray-700">
                <span className="font-bold tabular-nums">{data.eliminatedCount}</span> of{' '}
                <span className="tabular-nums">{data.totalEntries}</span> eliminated
              </span>
              {data.pot > 0 && <span className="text-wc-gold-600 font-bold">{fmtMoney(data.pot)} prize pool</span>}
              <button onClick={copySummary} className="btn-secondary text-xs px-3 py-1.5 ml-auto">
                {copied ? 'Copied!' : 'Copy summary'}
              </button>
            </div>
            {data.method === 'monte-carlo' && (
              <p className="text-[11px] text-gray-400">Sampled across {data.scenarios.toLocaleString()} outcomes — percentages are approximate (±~0.2%).</p>
            )}
            {data.pendingGroupGames > 0 && (
              <p className="text-[11px] text-amber-600">
                {data.pendingGroupGames} group pick{data.pendingGroupGames !== 1 ? 's' : ''} still pending, counted at current value.
              </p>
            )}
          </div>

          {/* Chances to win */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h4 className="font-bold text-gray-900 text-sm">Chances to win</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">Tap an entry to walk through the games that decide their fate.</p>
            </div>
            <div className="divide-y divide-gray-50">
              {data.contenders.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No entries in contention.</p>
              ) : (
                data.contenders.map((c, i) => {
                  const label = (c.displayName || c.username) + (c.entriesCount > 1 ? ` · Entry ${c.entry}` : '');
                  const mine = isMe(c.displayName || c.username);
                  return (
                    <button
                      key={c.key}
                      onClick={() => setWalk({ key: c.key, label })}
                      className={`group w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-gray-100 ${mine ? 'bg-wc-blue-50/40 hover:bg-wc-blue-50' : 'hover:bg-gray-50'}`}
                      title="Walk through this entry's path to winning"
                    >
                      <span className="text-gray-400 font-bold tabular-nums w-5 text-right text-sm">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {c.displayName || c.username}
                          {c.entriesCount > 1 && <span className="text-gray-400 font-normal"> · Entry {c.entry}</span>}
                          {mine && <span className="ml-1.5 text-[10px] font-bold text-wc-blue-500">YOU</span>}
                          {c.status === 'clinched' && (
                            <span className="ml-2 text-[10px] font-bold text-wc-green-700 bg-wc-green-50 px-1.5 py-0.5 rounded">🔒 CLINCHED</span>
                          )}
                        </p>
                        {/* Win-chance bar */}
                        <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${c.winPct >= 50 ? 'bg-wc-green-500' : c.winPct > 0 ? 'bg-wc-blue-400' : 'bg-gray-200'}`}
                            style={{ width: `${Math.max(c.winPct, c.winPct > 0 ? 3 : 0)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">
                          {c.fixedScore} pts · {c.maxScore} max
                          {c.aliveChampions.length > 0 && c.aliveChampions.length <= 4 && (
                            <span> · needs: {c.aliveChampions.join(' / ')}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold tabular-nums text-sm ${c.winPct >= 50 ? 'text-wc-green-700' : c.winPct > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                          {fmtPct(c.winPct)}
                        </p>
                        {c.soleWinPct < c.winPct && (
                          <p className="text-[10px] text-gray-400 tabular-nums" title="Wins outright (not tied)">{fmtPct(c.soleWinPct)} solo</p>
                        )}
                      </div>
                      {data.pot > 0 && (
                        <div className="text-right flex-shrink-0 w-16" title="Expected payout across all scenarios">
                          <p className="font-bold tabular-nums text-sm text-wc-gold-600">{fmtMoney(c.expectedPayout)}</p>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide">exp. $</p>
                        </div>
                      )}
                      <span className="text-gray-300 text-lg flex-shrink-0 transition-transform group-hover:translate-x-0.5">›</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Expected payout */}
          {data.pot > 0 && data.expectedWinnings.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <h4 className="font-bold text-gray-900 text-sm">Expected payout</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Probability-weighted winnings across every scenario (1st &amp; 2nd money). Sums to the {fmtMoney(data.pot)} pool.
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.expectedWinnings.map((w, i) => (
                  <div key={w.key} className={`flex items-center gap-3 px-4 py-2 ${isMe(w.displayName) ? 'bg-wc-blue-50/40' : ''}`}>
                    <span className="text-gray-400 font-bold tabular-nums w-5 text-right text-sm">{i + 1}</span>
                    <span className="min-w-0 flex-1 font-semibold text-gray-900 text-sm truncate">{w.displayName}</span>
                    <span className="text-[11px] text-gray-400 tabular-nums flex-shrink-0">
                      {w.winPct > 0 ? `${fmtPct(w.winPct)} win` : 'cashes 2nd'}
                    </span>
                    <span className="font-bold tabular-nums text-sm text-wc-gold-600 w-16 text-right flex-shrink-0">{fmtMoney(w.ev)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By champion */}
          {data.byChampion.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <h4 className="font-bold text-gray-900 text-sm">If the World Cup is won by…</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Pool winner(s) for each possible champion.</p>
              </div>
              <div className="divide-y divide-gray-50">
                {data.byChampion.map((ch) => {
                  const meta = getTeamMeta(ch.champion);
                  return (
                    <div key={ch.champion} className="flex items-start gap-3 px-4 py-2.5">
                      <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
                        <img src={getFlagUrl(meta.flag)} alt={ch.champion} className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{ch.champion}</p>
                          <p className="text-[11px] text-gray-400 tabular-nums">{fmtPct(ch.pct)}</p>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                        {ch.winners.length === 0 ? (
                          <span className="text-gray-300 text-sm">—</span>
                        ) : (
                          ch.winners.map((w) => (
                            <span key={w.key} className="text-sm text-gray-700">
                              {w.displayName} <span className="text-gray-400 tabular-nums">{fmtPct(w.winPct)}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}

      {walk && (
        <ScenarioWalk selectedKey={walk.key} label={walk.label} apiBase={apiBase} onClose={() => setWalk(null)} />
      )}
    </div>
  );
}

// ── Walkthrough modal ─────────────────────────────────────────────────────────

const WALK_ROUND_LABEL: Record<string, string> = {
  R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarterfinal', SF: 'Semifinal', Final: 'the Final',
};
function walkQuestion(round: string, slot: number): string {
  if (round === 'Final') return 'Who wins the World Cup? 🏆';
  return `Who wins ${WALK_ROUND_LABEL[round] ?? round} #${slot + 1}?`;
}
function shortQuestion(round: string, slot: number): string {
  if (round === 'Final') return 'Champion';
  return `${WALK_ROUND_LABEL[round] ?? round} #${slot + 1}`;
}

function ScenarioWalk({
  selectedKey, label, apiBase, onClose,
}: {
  selectedKey: string;
  label: string;
  apiBase: string;
  onClose: () => void;
}) {
  const [path, setPath] = useState<{ key: string; team: string; label: string }[]>([]);
  const [step, setStep] = useState<WalkResponse | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const [pending, setPending] = useState(false);
  const seq = useRef(0);

  const fetchStep = useCallback(async (p: { key: string; team: string }[]) => {
    const mine = ++seq.current;
    setPending(true);
    try {
      const res = await fetch(`${apiBase}/walk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedKey, path: p.map((x) => ({ key: x.key, team: x.team })) }),
      });
      const json: WalkResponse = await res.json();
      if (mine === seq.current) setStep(json);
    } catch {
      if (mine === seq.current) setStep({ error: 'Failed to compute.' } as WalkResponse);
    } finally {
      if (mine === seq.current) { setPending(false); setFirstLoad(false); }
    }
  }, [selectedKey, apiBase]);

  useEffect(() => { fetchStep(path); }, [path, fetchStep]);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choose = (team: string, round: string, slot: number) =>
    setPath((p) => [...p, { key: `${round}-${slot}`, team, label: shortQuestion(round, slot) }]);
  const backTo = (index: number) => setPath((p) => p.slice(0, index));

  const ok = step && !('error' in step);
  const winPct = ok ? step.winPct : 0;
  const name = label.split(' · ')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with a live win-chance bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 text-sm truncate">{label}</p>
              <p className="text-[11px] text-gray-400">Path to winning · live odds</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`font-black tabular-nums text-lg leading-none ${winPct >= 50 ? 'text-wc-green-700' : winPct > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                {ok ? fmtPct(winPct) : '—'}
              </p>
              {ok && step.expectedPayout > 0 && (
                <p className="text-[10px] text-wc-gold-600 tabular-nums font-semibold">{fmtMoney(step.expectedPayout)} exp.</p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1 self-start" aria-label="Close">×</button>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${winPct >= 50 ? 'bg-wc-green-500' : winPct > 0 ? 'bg-wc-blue-400' : 'bg-gray-200'}`}
              style={{ width: `${Math.max(winPct, winPct > 0 ? 3 : 0)}%` }}
            />
          </div>
        </div>

        <div className={`overflow-y-auto p-4 space-y-3 relative transition-opacity ${pending ? 'opacity-60' : ''}`}>
          {/* Breadcrumb of choices */}
          {path.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {path.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => backTo(idx)}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 hover:bg-gray-200 px-2 py-1 text-[11px] text-gray-700 transition-colors"
                  title={`Undo — back to ${p.label}`}
                >
                  <span className="text-gray-400">{p.label}:</span>
                  <span className="font-semibold">{p.team}</span>
                </button>
              ))}
              <button
                onClick={() => backTo(0)}
                className="text-[11px] text-gray-400 hover:text-gray-700 px-1.5 py-1"
              >
                Start over
              </button>
            </div>
          )}

          {firstLoad ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-2/3 bg-gray-100 rounded" />
              {[0, 1, 2].map((k) => <div key={k} className="h-10 bg-gray-100 rounded-xl" />)}
            </div>
          ) : !ok ? (
            <p className="text-center text-wc-red-500 text-sm py-8">{(step as { error: string }).error}</p>
          ) : step.status === 'clinched' ? (
            <Terminal icon="✅" tone="text-wc-green-700" title={`${name} wins the pool.`}
              sub={path.length ? sentence(name, path, 'wins') : 'Already guaranteed first — every remaining outcome keeps them on top.'} />
          ) : step.status === 'dead' ? (
            <Terminal icon="❌" tone="text-gray-700" title={`${name} can’t win on this path.`}
              sub={path.length ? `${sentence(name, path, 'out')} Tap a breadcrumb above to explore another branch.` : 'No remaining outcome puts them first.'} />
          ) : step.status === 'tossup' ? (
            <Terminal icon="🎲" tone="text-gray-800" title={`${fmtPct(step.winPct)} from here`}
              sub="It comes down to several games at once — no single one decides it." />
          ) : step.pivotal ? (
            <div className="space-y-2">
              <p className="font-bold text-gray-900 text-sm">{walkQuestion(step.pivotal.round, step.pivotal.slot)}</p>
              <div className="space-y-1.5">
                {step.pivotal.branches.map((b) => {
                  const meta = getTeamMeta(b.team);
                  const tone =
                    b.terminal === 'win' ? 'border-wc-green-200 bg-wc-green-50'
                    : b.terminal === 'lose' ? 'border-gray-200 bg-gray-50 opacity-70'
                    : 'border-gray-200 hover:border-wc-blue-300 hover:bg-wc-blue-50/30';
                  return (
                    <button
                      key={b.team}
                      onClick={() => choose(b.team, step.pivotal!.round, step.pivotal!.slot)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all active:scale-[0.98] ${tone}`}
                    >
                      <img src={getFlagUrl(meta.flag)} alt={b.team} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
                      <span className="font-semibold text-gray-800 text-sm truncate">{b.team}</span>
                      <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0">{fmtPct(b.share)} likely</span>
                      <span className="ml-auto flex items-center gap-2 flex-shrink-0">
                        <span className="text-right">
                          <span className={`block text-sm font-bold tabular-nums ${b.terminal === 'win' ? 'text-wc-green-700' : b.terminal === 'lose' ? 'text-gray-300' : 'text-gray-900'}`}>
                            {b.terminal === 'win' ? '✅ win' : b.terminal === 'lose' ? '❌ out' : fmtPct(b.winPct)}
                          </span>
                          {b.expectedPayout > 0 && (
                            <span className="block text-[10px] text-wc-gold-600 tabular-nums">{fmtMoney(b.expectedPayout)} exp.</span>
                          )}
                        </span>
                        {b.terminal === null && <span className="text-gray-300">›</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 pt-1">
                “likely” is how often the game goes that way (live odds); the bold figure is {name}’s win chance if it does.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Terminal({ icon, tone, title, sub }: { icon: string; tone: string; title: string; sub: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-4xl mb-1.5">{icon}</p>
      <p className={`font-bold ${tone}`}>{title}</p>
      <p className="text-gray-400 text-xs mt-1 leading-relaxed px-2">{sub}</p>
    </div>
  );
}

// "If England win the Champion and Brazil win the Semifinal #1, poch wins."
function sentence(name: string, path: { team: string; label: string }[], verb: 'wins' | 'out'): string {
  const clauses = path.map((p) => `${p.team} win ${p.label}`).join(', and ');
  return verb === 'wins' ? `If ${clauses}, ${name} wins.` : `Even if ${clauses}, ${name} misses out.`;
}
