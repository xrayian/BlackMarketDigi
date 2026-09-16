/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tavern: { bg: '#0f0d0a', surface: '#1a1714', border: '#2a2520', card: '#231f1a' },
        gold: { light: '#f5d680', DEFAULT: '#d4a84b', dark: '#a67c35', muted: '#8b6e3c' },
        parchment: '#e8dcc8',
        crimson: '#9b2c2c',
        emerald: '#2d6a4f',
        royal: '#6b21a8'
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
