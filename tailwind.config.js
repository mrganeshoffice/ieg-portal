/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#080F1C', 900: '#0D1728', 800: '#132238', 700: '#1B3050', 600: '#264268' },
        brand: { DEFAULT: '#1FA2E8', 400: '#4DB8F0', 500: '#1FA2E8', 600: '#1487C7' },
        leaf: { DEFAULT: '#34C77B', 400: '#5AD79A', 500: '#34C77B', 600: '#22A862' },
        gold: '#E9B44C',
        app: 'rgb(var(--app) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        soft: '0 12px 32px -14px rgba(13,23,40,.28)',
        glow: '0 0 0 1px rgba(31,162,232,.35), 0 12px 40px -12px rgba(31,162,232,.5)',
      },
    },
  },
  plugins: [],
};
