// Server-renderable bracket tree: the player's picked winners per round,
// coloured against actual results as they come in.

interface BracketPick {
  round: string;
  slot: number;
  team: string;
}

interface Props {
  picks: BracketPick[];
  results: BracketPick[]; // actual winners per round/slot
}

const COLUMNS = [
  { id: 'R32', label: 'Round of 32', slots: 16 },
  { id: 'R16', label: 'Round of 16', slots: 8 },
  { id: 'QF', label: 'Quarters', slots: 4 },
  { id: 'SF', label: 'Semis', slots: 2 },
  { id: 'Final', label: 'Champion', slots: 1 },
] as const;

function shorten(name: string): string {
  const map: Record<string, string> = {
    'Bosnia and Herzegovina': 'Bosnia',
    'United States': 'USA',
    "Cote d'Ivoire": 'Ivory Coast',
    'Saudi Arabia': 'S. Arabia',
    'South Africa': 'S. Africa',
    'South Korea': 'S. Korea',
    'New Zealand': 'N. Zealand',
    'Netherlands': 'Holland',
    'Switzerland': 'Swiss',
  };
  return map[name] ?? name;
}

export default function BracketView({ picks, results }: Props) {
  const pickMap = new Map(picks.map((p) => [`${p.round}-${p.slot}`, p.team]));
  const resultMap = new Map(results.map((r) => [`${r.round}-${r.slot}`, r.team]));

  return (
    <div className="overflow-x-auto -mx-2 px-2">
      <div className="flex gap-3 min-w-[640px]">
        {COLUMNS.map((col) => (
          <div key={col.id} className="flex-1 flex flex-col">
            <p className="text-[11px] font-bold text-gray-400 mb-2 text-center">
              {col.label}
            </p>
            <div className="flex-1 flex flex-col justify-around gap-1.5">
              {Array.from({ length: col.slots }, (_, slot) => {
                const key = `${col.id}-${slot}`;
                const pick = pickMap.get(key);
                const actual = resultMap.get(key);
                const correct = pick && actual ? pick === actual : null;
                const isChampion = col.id === 'Final';

                return (
                  <div
                    key={slot}
                    className={`rounded-lg border px-2 py-1.5 text-center ${
                      !pick
                        ? 'border-dashed border-gray-200 bg-gray-50'
                        : correct === true
                          ? 'border-wc-green-300 bg-wc-green-50'
                          : correct === false
                            ? 'border-red-200 bg-red-50'
                            : isChampion
                              ? 'border-wc-gold-300 bg-wc-gold-50'
                              : 'border-gray-200 bg-white'
                    }`}
                  >
                    {pick ? (
                      <>
                        <span
                          className={`block text-[11px] font-bold leading-tight truncate ${
                            correct === true
                              ? 'text-wc-green-700'
                              : correct === false
                                ? 'text-red-400 line-through'
                                : isChampion
                                  ? 'text-wc-gold-700'
                                  : 'text-gray-700'
                          }`}
                          title={pick}
                        >
                          {isChampion && '👑 '}
                          {shorten(pick)}
                        </span>
                        {correct === false && actual && (
                          <span className="block text-[11px] font-semibold text-wc-green-600 leading-tight truncate" title={actual}>
                            {shorten(actual)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-gray-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400 font-semibold">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-wc-green-100 border border-wc-green-300 inline-block" /> Correct</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200 inline-block" /> Wrong (actual shown below)</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-gray-200 inline-block" /> Pending</span>
      </div>
    </div>
  );
}
