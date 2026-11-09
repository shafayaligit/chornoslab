/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        slate3d: {
          950: '#0b0d13',
          900: '#121620',
          850: '#171c28',
          800: '#1e2433',
          700: '#2a3246',
        },
        pastel: {
          lavender: '#a78bfa',
          mint: '#34d399',
          amber: '#fbbf24',
          sky: '#38bdf8',
          rose: '#fb7185',
        }
      },
      boxShadow: {
        'clay-slab': '0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 8px 16px -4px rgba(0, 0, 0, 0.5), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.16), inset 0 -2px 4px 0 rgba(0, 0, 0, 0.45)',
        'clay-card': '0 10px 20px -5px rgba(0, 0, 0, 0.55), 0 4px 6px -2px rgba(0, 0, 0, 0.35), inset 0 1px 1px 0 rgba(255, 255, 255, 0.14), inset 0 -2px 3px 0 rgba(0, 0, 0, 0.4)',
        'clay-btn': '0 6px 12px -2px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2), inset 0 -2px 2px 0 rgba(0, 0, 0, 0.4)',
        'clay-pressed': '0 1px 2px 0 rgba(0, 0, 0, 0.6), inset 0 3px 6px 0 rgba(0, 0, 0, 0.65), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.06)',
        'clay-well': 'inset 0 3px 7px 0 rgba(0, 0, 0, 0.65), inset 0 -1px 1px 0 rgba(255, 255, 255, 0.08)',
      }
    },
  },
  plugins: [],
};
