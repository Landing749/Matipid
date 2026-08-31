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
        // Warm putty neutrals — driven by CSS vars (see index.css :root / .dark)
        // so the whole ramp flips for dark mode without touching components.
        surface: {
          50:  'rgb(var(--color-surface-50) / <alpha-value>)',
          100: 'rgb(var(--color-surface-100) / <alpha-value>)',
          200: 'rgb(var(--color-surface-200) / <alpha-value>)',
          300: 'rgb(var(--color-surface-300) / <alpha-value>)',
          400: 'rgb(var(--color-surface-400) / <alpha-value>)',
          500: 'rgb(var(--color-surface-500) / <alpha-value>)',
          600: 'rgb(var(--color-surface-600) / <alpha-value>)',
          700: 'rgb(var(--color-surface-700) / <alpha-value>)',
          800: 'rgb(var(--color-surface-800) / <alpha-value>)',
          900: 'rgb(var(--color-surface-900) / <alpha-value>)',
          950: 'rgb(var(--color-surface-950) / <alpha-value>)',
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
        clay: '2px 2px 4px rgba(var(--clay-edge-dark-rgb),0.22), 10px 10px 22px rgba(var(--clay-edge-dark-rgb),0.32), -9px -9px 20px rgba(var(--clay-edge-light-rgb),0.92)',
        'clay-sm': '2px 2px 3px rgba(var(--clay-edge-dark-rgb),0.25), 6px 6px 13px rgba(var(--clay-edge-dark-rgb),0.28), -5px -5px 11px rgba(var(--clay-edge-light-rgb),0.92)',
        'clay-lg': '3px 3px 6px rgba(var(--clay-edge-dark-rgb),0.26), 16px 16px 36px rgba(var(--clay-edge-dark-rgb),0.38), -14px -14px 30px rgba(var(--clay-edge-light-rgb),0.95)',
        'clay-inset': 'inset 2px 2px 4px rgba(var(--clay-edge-dark-rgb),0.42), inset 5px 5px 11px rgba(var(--clay-edge-dark-rgb),0.2), inset -4px -4px 9px rgba(var(--clay-edge-light-rgb),0.8)',
        'clay-pressed': 'inset 2px 2px 4px rgba(var(--clay-edge-dark-rgb),0.48), inset 5px 5px 11px rgba(var(--clay-edge-dark-rgb),0.26), inset -3px -3px 7px rgba(var(--clay-edge-light-rgb),0.75)',
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
