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
        // Pitch green — hand-tuned for a "floodlit stadium at night" feel
        'wc-green': {
          50:  '#edf7f0',
          100: '#cfe9d8',
          200: '#9fd3b4',
          300: '#68b48a',
          400: '#3d9162',
          500: '#22723f',
          600: '#165930',
          700: '#104021',
          800: '#0b2b16',
          900: '#07180d',
          950: '#030c06',
        },
        // Trophy gold — warm, rich, the actual FIFA trophy colour
        'wc-gold': {
          50:  '#fdf8ee',
          100: '#f8ead1',
          200: '#f0d49e',
          300: '#e5b85d',
          400: '#d99e2e',
          500: '#bf861e',
          600: '#9b6b17',
          700: '#795114',
          800: '#5b3c0f',
          900: '#3c270a',
        },
      },
    },
  },
  plugins: [],
};
