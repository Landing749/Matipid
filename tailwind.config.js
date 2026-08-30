/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Soft clay lavender — muted, matte, never neon
        brand: {
          50:  '#f6f2fd',
          100: '#ece3fa',
          200: '#d9c9f4',
          300: '#c0a8ea',
          400: '#a688dd',
          500: '#8d6dd1',
          600: '#7458bd',
          700: '#5f479c',
          800: '#4c397d',
          900: '#3d2f63',
          950: '#251c40',
        },
        // Warm clay amber
        gold: {
          50:  '#fdf6ec',
          100: '#f6dfb0',
          200: '#f3d49c',
          300: '#eab765',
          400: '#e0a04a',
          500: '#cf8836',
          600: '#af6d28',
          700: '#8c5620',
          800: '#6f451c',
          900: '#573719',
          950: '#301c0c',
        },
        // Clay mint — third accent for bento variety
        clay: {
          50:  '#eef8f2',
          100: '#d9efe1',
          200: '#b3dfc4',
          300: '#8ecda9',
          400: '#69ba8f',
          500: '#4fa276',
          600: '#3d825f',
          700: '#33684d',
          800: '#2a5340',
          900: '#234534',
          950: '#132720',
        },
        // Warm putty neutrals — inverted ramp: 950 = lightest (page bg), 50 = darkest (ink)
        surface: {
          50:  '#211b14',
          100: '#2b2419',
          200: '#372e21',
          300: '#493d2c',
          400: '#6b5c47',
          500: '#8c7c64',
          600: '#a99a80',
          700: '#c6b9a1',
          800: '#ddd2bc',
          900: '#ede4d2',
          950: '#f8f2e6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        clay: '9px 9px 18px rgba(150,132,103,0.35), -9px -9px 18px rgba(255,255,255,0.85)',
        'clay-sm': '5px 5px 10px rgba(150,132,103,0.32), -5px -5px 10px rgba(255,255,255,0.85)',
        'clay-lg': '14px 14px 30px rgba(150,132,103,0.4), -12px -12px 26px rgba(255,255,255,0.9)',
        'clay-inset': 'inset 4px 4px 8px rgba(150,132,103,0.32), inset -4px -4px 8px rgba(255,255,255,0.75)',
        'clay-pressed': 'inset 3px 3px 6px rgba(150,132,103,0.4), inset -3px -3px 6px rgba(255,255,255,0.7)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
