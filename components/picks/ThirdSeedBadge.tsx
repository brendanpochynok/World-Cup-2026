'use client';

// Small badge marking a third-place team's seed among the 12 thirds (1–12).
// Filled green when the team is in the qualifying top 8, gray when eliminated.
export default function ThirdSeedBadge({ rank, qualifies }: { rank: number; qualifies: boolean }) {
  return (
    <span
      title={`3rd-place seed #${rank} — ${qualifies ? 'qualifies' : 'eliminated'}`}
      className={`inline-flex items-center justify-center text-[9px] font-bold rounded-full w-4 h-4 leading-none flex-shrink-0 ${
        qualifies ? 'bg-wc-green-500 text-white' : 'bg-gray-200 text-gray-500'
      }`}
    >
      {rank}
    </span>
  );
}
