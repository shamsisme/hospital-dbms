/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './demo/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark blue clinical theme. Semantic colours come from CSS variables (globals.css);
        // .screen panels (3D twin, triage monitor) sit one layer darker.
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        fg2: 'rgb(var(--c-fg2) / <alpha-value>)',
        fg3: 'rgb(var(--c-fg3) / <alpha-value>)',
        tint: 'rgb(var(--c-tint) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        ground: 'rgb(var(--c-ground) / <alpha-value>)',
        sunk: 'rgb(var(--c-sunk) / <alpha-value>)',
        ink: {
          950: 'rgb(var(--c-ground) / <alpha-value>)',
          900: 'rgb(var(--c-surface) / <alpha-value>)',
          850: 'rgb(var(--c-surface) / <alpha-value>)',
          800: 'rgb(var(--c-sunk) / <alpha-value>)',
          700: 'rgb(var(--c-sunk) / <alpha-value>)',
        },
        pulse: {
          // electric cyan (primary accent)
          200: 'rgb(var(--c-accent-text) / <alpha-value>)',
          300: 'rgb(var(--c-accent-text) / <alpha-value>)',
          400: 'rgb(var(--c-accent) / <alpha-value>)',
          500: '#13c8db',
          600: '#0aa2b8',
        },
        plasma: {
          // violet (secondary accent)
          400: '#b79bff',
          500: '#9474ff',
        },
        // Status colours use Tailwind's own emerald / rose / amber scales.
      },
      fontFamily: {
        sans: ['var(--font-body)', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Archivo', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        lamp: {
          '0%,100%': { opacity: '0.7', transform: 'translateX(-50%) scale(1)' },
          '50%': { opacity: '1', transform: 'translateX(-50%) scale(1.05)' },
        },
        aurora1: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(8vw,-6vh) scale(1.15)' },
          '66%': { transform: 'translate(-6vw,5vh) scale(0.9)' },
        },
        aurora2: {
          '0%,100%': { transform: 'translate(0,0) scale(1.1)' },
          '50%': { transform: 'translate(-10vw,8vh) scale(0.85)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        scan: {
          '0%': { transform: 'translateY(-120%)' },
          '100%': { transform: 'translateY(420%)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        ping2: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '100%': { transform: 'scale(2.6)', opacity: '0' },
        },
        ring: {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(1.18, 1.5)', opacity: '0' },
        },
        stripes: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '28px 0' },
        },
      },
      animation: {
        lamp: 'lamp 9s ease-in-out infinite',
        aurora1: 'aurora1 22s ease-in-out infinite',
        aurora2: 'aurora2 28s ease-in-out infinite',
        shine: 'shine 4s linear infinite',
        scan: 'scan 2.8s cubic-bezier(.45,0,.55,1) infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        ping2: 'ping2 1.8s cubic-bezier(0,0,.2,1) infinite',
        stripes: 'stripes 1s linear infinite',
        ring: 'ring 1.6s cubic-bezier(0,0,.2,1) infinite',
      },
    },
  },
  plugins: [],
};
