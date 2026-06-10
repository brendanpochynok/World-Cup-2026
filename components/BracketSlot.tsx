'use client';

interface BracketSlotProps {
  round: string;
  slot: number;
  currentPick: string | null;
  teams: string[];
  locked: boolean;
  onPickChange: (round: string, slot: number, team: string) => void;
}

export default function BracketSlot({
  round,
  slot,
  currentPick,
  teams,
  locked,
  onPickChange,
}: BracketSlotProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-wc-green-500 w-8 text-right">#{slot}</span>
      <select
        value={currentPick || ''}
        disabled={locked}
        onChange={(e) => onPickChange(round, slot, e.target.value)}
        className={`flex-1 rounded-lg px-3 py-2 text-sm border transition-colors ${
          locked
            ? 'bg-wc-green-800 border-wc-green-700 text-wc-green-500 cursor-not-allowed'
            : currentPick
            ? 'bg-wc-green-800 border-wc-gold-600 text-wc-gold-300'
            : 'bg-wc-green-800 border-wc-green-600 text-wc-green-300'
        } focus:outline-none focus:ring-2 focus:ring-wc-gold-500`}
      >
        <option value="">-- Select team --</option>
        {teams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
      {locked && (
        <svg aria-label="Locked" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}
