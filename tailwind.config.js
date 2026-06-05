/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Surface colours ─────────────────────────────────────────
        // Dark FIFA navy — the base of the whole UI
        'wc-navy': {
          50:  '#E8F2FA',
          100: '#C4D9F0',
          200: '#8FB4DC',
          300: '#5B8EC4',
          400: '#3570A8',
          500: '#1F5288',
          600: '#153D6A',
          700: '#0E2B4E',
          800: '#071C34',
          900: '#040E1E',
          950: '#020813',
        },
        // ── Accent — FIFA / Mexico emerald green ────────────────────
        'wc-green': {
          50:  '#E5FFF2',
          100: '#BAFAD5',
          200: '#80EEB0',
          300: '#40DC87',
          400: '#1CC66A',
          500: '#12A055',
          600: '#098040',
          700: '#05582C',
          800: '#033A1D',
          900: '#022010',
          950: '#010F07',
        },
        // ── Accent — USA / Canada red ───────────────────────────────
        'wc-red': {
          300: '#F07585',
          400: '#E53E52',
          500: '#C41C2A',
          600: '#991B1B',
          700: '#7A1018',
        },
        // ── FIFA Trophy gold ────────────────────────────────────────
        'wc-gold': {
          50:  '#FCF4E7',
          100: '#F7E3B5',
          200: '#EDCA7E',
          300: '#DFB04F',
          400: '#C99030',
          500: '#B07821',
          600: '#8F5F1A',
          700: '#6E4813',
          800: '#4D310D',
          900: '#2C1C07',
        },
      },
    },
  },
  plugins: [],
};
