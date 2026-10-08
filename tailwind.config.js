/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        finguard: {
          bg: '#0B0F17',
          surface: '#131B2E',
          'surface-subtle': '#182238',
          border: '#1F2B48',
          text: '#E2E8F0',
          muted: '#94A3B8',
          accent: '#38BDF8',
          'accent-hover': '#0284C7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
