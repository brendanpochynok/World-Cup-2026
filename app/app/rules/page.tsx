import { prisma } from '@/lib/prisma';
import { SCORING, BRACKET_ROUNDS, BRACKET_LOCK_ISO } from '@/lib/worldcup-data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function lockDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export default async function RulesPage() {
  const [playerCount, poolConfig] = await Promise.all([
    prisma.user.count(),
    prisma.poolConfig.findUnique({ where: { id: 1 } }),
  ]);

  const entryFee = poolConfig?.entryFeePerPlayer ?? 0;
  const totalPool = entryFee * playerCount;
  const prize1st = Math.floor(totalPool * 0.75);
  const prize2nd = Math.floor(totalPool * 0.25);
  const hasPrize = totalPool > 0;

  return (
    <div className="max-w-2xl space-y-8">

      {/* Header */}
      <div>
        <p className="eyebrow mb-2">Pool</p>
        <h1 className="text-4xl font-black text-gray-900 leading-tight">How it works</h1>
        <p className="text-gray-500 text-sm mt-2">
          FIFA World Cup 2026™ · June 11 – July 19, 2026
        </p>
      </div>

      {/* Prize pool */}
      {hasPrize && (
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-wc-gold-400" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="eyebrow mb-1">Prize Pool</p>
              <div className="text-4xl font-black text-gray-900">{fmt(totalPool)}</div>
              <p className="text-gray-400 text-xs mt-1">{playerCount} players × {fmt(entryFee)} entry</p>
            </div>
            <svg className="w-8 h-8 text-wc-gold-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 3h14l-1 7c0 3.87-3.13 7-7 7s-7-3.13-7-7L5 3zm0 0H2v2c0 2.76 1.34 5.21 3.41 6.72L5 3zm14 0h3v2c0 2.76-1.34 5.21-3.41 6.72L19 3zM12 17c1.1 0 2 .9 2 2v1H10v-1c0-1.1.9-2 2-2zm-4 3h8v1H8v-1z"/>
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-wc-gold-50 border border-wc-gold-200 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-wc-gold-600 mb-1">1st Place · 75%</p>
              <p className="text-2xl font-black text-wc-gold-600">{fmt(prize1st)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">2nd Place · 25%</p>
              <p className="text-2xl font-black text-gray-700">{fmt(prize2nd)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overview */}
      <div className="card space-y-3">
        <h2 className="font-black text-gray-900 text-lg">Overview</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Make predictions for every group stage match, fill in your knockout bracket, and pick the
          tournament champion. Points are tallied as results come in — whoever has the most points
          when the final whistle blows wins the pool.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { label: 'Group stage matches', value: '72' },
            { label: 'Knockout rounds', value: '5' },
            { label: 'Players', value: String(playerCount) },
            { label: 'Entry fee', value: entryFee > 0 ? fmt(entryFee) : 'Free' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
              <div className="text-lg font-black text-gray-900 mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Group stage scoring */}
      <div className="card space-y-4">
        <h2 className="font-black text-gray-900 text-lg">Group Stage Picks</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          For each of the 72 group stage matches you predict the result: Home win, Draw, or Away win.
        </p>
        <div className="space-y-2">
          {[
            { label: 'Correct result', pts: `+${SCORING.groupCorrect} pt`, note: 'Exact match', color: 'text-wc-green-600', bg: 'bg-wc-green-50 border-wc-green-200' },
            { label: 'Match ends in a draw', pts: '0 pts', note: 'You picked a side', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
            { label: 'Totally wrong', pts: `${SCORING.groupWrong} pt`, note: 'Picked home, away won (or vice versa)', color: 'text-wc-red-500', bg: 'bg-red-50 border-red-100' },
          ].map(({ label, pts, note, color, bg }) => (
            <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${bg}`}>
              <div>
                <div className="text-sm font-semibold text-gray-800">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{note}</div>
              </div>
              <span className={`font-black text-lg tabular-nums ml-4 flex-shrink-0 ${color}`}>{pts}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-wc-blue-50 border border-wc-blue-100 px-4 py-3 text-xs text-wc-blue-700 font-medium">
          <strong>Pick locking:</strong> Each match locks individually at its scheduled kick-off time.
          You can change a pick right up until the match starts.
        </div>
      </div>

      {/* Bracket scoring */}
      <div className="card space-y-4">
        <h2 className="font-black text-gray-900 text-lg">Knockout Bracket Picks</h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Predict which teams advance through the knockout rounds. Points increase each round —
          a correct semi-final pick is worth more than a correct round-of-32 pick.
        </p>
        <div className="space-y-2">
          {BRACKET_ROUNDS.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-gray-50 border-gray-200">
              <span className="text-sm font-semibold text-gray-800">{r.name}</span>
              <span className="font-black text-lg text-wc-gold-500 tabular-nums ml-4">{r.points} pts</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border bg-wc-gold-50 border-wc-gold-200">
            <div>
              <div className="text-sm font-semibold text-gray-800">Tournament Champion</div>
              <div className="text-xs text-gray-400 mt-0.5">Correct champion pick bonus</div>
            </div>
            <span className="font-black text-lg text-wc-gold-500 tabular-nums ml-4">{SCORING.champion} pts</span>
          </div>
        </div>
        <div className="rounded-xl bg-wc-blue-50 border border-wc-blue-100 px-4 py-3 text-xs text-wc-blue-700 font-medium">
          <strong>Bracket lock:</strong> All bracket picks freeze on <strong>{lockDate(BRACKET_LOCK_ISO)}</strong> when
          the first Round of 32 match kicks off. Make sure your bracket is complete before then.
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link href="/app/picks" className="btn-primary text-sm">
          Make my picks →
        </Link>
        <Link href="/app/standings" className="btn-secondary text-sm">
          View standings
        </Link>
      </div>

    </div>
  );
}
