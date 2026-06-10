// Shared trophy glyph — used wherever a pool win has no custom image
export default function TrophyIcon({ className = 'w-5 h-5 text-wc-gold-400' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3h14l-1 7c0 3.87-3.13 7-7 7s-7-3.13-7-7L5 3zm0 0H2v2c0 2.76 1.34 5.21 3.41 6.72L5 3zm14 0h3v2c0 2.76-1.34 5.21-3.41 6.72L19 3zM12 17c1.1 0 2 .9 2 2v1H10v-1c0-1.1.9-2 2-2zm-4 3h8v1H8v-1z" />
    </svg>
  );
}
