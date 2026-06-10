import { prisma } from '@/lib/prisma';
import { SCORING, BRACKET_ROUNDS, BRACKET_LOCK_ISO } from '@/lib/worldcup-data';
import Link from 'next/link';
import LocalDateTime from '@/components/LocalDateTime';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'How it works' };

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-4">
      <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
      {children}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-wc-blue-50 border border-wc-blue-100 px-4 py-3 text-xs text-wc-blue-700 font-medium leading-relaxed">
      {children}
    </div>
  );
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
        <h1 className="text-4xl font-bold text-gray-900 leading-tight">How it works</h1>
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
              <div className="text-4xl font-bold text-gray-900">{fmt(totalPool)}</div>
              <p className="text-gray-400 text-xs mt-1">{playerCount} players × {fmt(entryFee)} entry</p>
            </div>
            <svg className="w-8 h-8 text-wc-gold-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 3h14l-1 7c0 3.87-3.13 7-7 7s-7-3.13-7-7L5 3zm0 0H2v2c0 2.76 1.34 5.21 3.41 6.72L5 3zm14 0h3v2c0 2.76-1.34 5.21-3.41 6.72L19 3zM12 17c1.1 0 2 .9 2 2v1H10v-1c0-1.1.9-2 2-2zm-4 3h8v1H8v-1z"/>
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-wc-gold-50 border border-wc-gold-200 px-4 py-3">
              <p className="text-[11px] font-bold text-wc-gold-600 mb-1">1st Place · 75%</p>
              <p className="text-2xl font-bold text-wc-gold-600">{fmt(prize1st)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-[11px] font-bold text-gray-500 mb-1">2nd Place · 25%</p>
              <p className="text-2xl font-bold text-gray-700">{fmt(prize2nd)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Overview">
        <p className="text-gray-600 text-sm leading-relaxed">
          The pool has two parts: <strong className="text-gray-800">group stage picks</strong> and a <strong className="text-gray-800">knockout bracket</strong>. You score points in both — whoever has the most points after the final whistle on July 19 wins the pool.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            { label: 'Group stage matches', value: '72' },
            { label: 'Knockout rounds', value: '5' },
            { label: 'Players', value: String(playerCount) },
            { label: 'Entry fee', value: entryFee > 0 ? fmt(entryFee) : 'Free' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
              <div className="text-xs text-gray-400 font-semibold">{label}</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Tournament format */}
      <Section title="Tournament Format">
        <p className="text-gray-600 text-sm leading-relaxed">
          The 2026 World Cup uses an expanded 48-team format across three host countries — USA, Canada, and Mexico.
        </p>
        <div className="space-y-2.5">
          {[
            {
              step: '1',
              title: 'Group Stage',
              desc: '48 teams split into 12 groups of 4. Each team plays the other 3 teams in their group once — 6 matches per group, 72 total.',
            },
            {
              step: '2',
              title: 'Who advances?',
              desc: 'The top 2 teams from each group advance automatically (24 teams). The best 8 third-place finishers across all 12 groups also advance — giving 32 teams total in the knockout stage.',
            },
            {
              step: '3',
              title: 'Knockout Rounds',
              desc: 'Single-elimination from Round of 32 → Round of 16 → Quarter-Finals → Semi-Finals → Final. One loss and you\'re out.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-wc-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">{title}</div>
                <div className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Group stage scoring */}
      <Section title="Group Stage Picks">
        <p className="text-gray-600 text-sm leading-relaxed">
          For each of the 72 group stage matches, predict the result: <strong className="text-gray-800">Home win</strong>, <strong className="text-gray-800">Draw</strong>, or <strong className="text-gray-800">Away win</strong>. Picks for each match lock individually at kick-off — you can change your mind right up until the whistle blows.
        </p>

        <div className="space-y-2">
          {[
            {
              label: 'Correct result',
              example: 'You picked Home win → Home wins',
              pts: `+${SCORING.groupCorrect} pt`,
              color: 'text-wc-green-600',
              bg: 'bg-wc-green-50 border-wc-green-200',
            },
            {
              label: 'Match ends in a draw, you didn\'t pick draw',
              example: 'You picked Home win or Away win → Draw',
              pts: '0 pts',
              color: 'text-gray-500',
              bg: 'bg-gray-50 border-gray-200',
            },
            {
              label: 'Wrong result',
              example: 'You picked Home win → Away wins (or vice versa)',
              pts: `${SCORING.groupWrong} pt`,
              color: 'text-wc-red-500',
              bg: 'bg-red-50 border-red-100',
            },
            {
              label: 'You picked draw, match has a winner',
              example: 'You picked Draw → Home wins or Away wins',
              pts: `${SCORING.groupWrong} pt`,
              color: 'text-wc-red-500',
              bg: 'bg-red-50 border-red-100',
            },
          ].map(({ label, example, pts, color, bg }) => (
            <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${bg}`}>
              <div>
                <div className="text-sm font-semibold text-gray-800">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{example}</div>
              </div>
              <span className={`font-bold text-lg tabular-nums ml-4 flex-shrink-0 ${color}`}>{pts}</span>
            </div>
          ))}
        </div>

      </Section>

      {/* Bracket scoring */}
      <Section title="Knockout Bracket Picks">
        <p className="text-gray-600 text-sm leading-relaxed">
          Before the knockout stage begins, you fill in a full bracket predicting which team wins each match all the way to the final. Points increase significantly each round — getting a semi-final right is worth more than four correct Round-of-32 picks.
        </p>

        <div className="space-y-2">
          {BRACKET_ROUNDS.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl border bg-gray-50 border-gray-200">
              <div>
                <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                <span className="text-xs text-gray-400 ml-2">({r.slots / 2} matches)</span>
              </div>
              <span className="font-bold text-lg text-wc-gold-500 tabular-nums ml-4">{r.points} pts each</span>
            </div>
          ))}
        </div>

        <p className="text-gray-600 text-sm leading-relaxed">
          Points double each round — just like March Madness. You earn points for each match your picked team wins. For example, if you pick France to win their Semi-Final and they do, you earn 8 pts even if they lose in the Final.
        </p>

        <InfoBox>
          <strong>Bracket lock:</strong> All bracket picks freeze on <strong><LocalDateTime iso={BRACKET_LOCK_ISO} /></strong> when the first Round of 32 match kicks off. Make sure your bracket is complete before then — you won&apos;t be able to change anything after that.
        </InfoBox>
      </Section>

      {/* CTA */}
      <div className="flex gap-3">
        <Link href="/app/picks" className="btn-primary text-sm">
          Make my picks
        </Link>
        <Link href="/app/standings" className="btn-secondary text-sm">
          View standings
        </Link>
      </div>

    </div>
  );
}
