/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)', // используем CSS-переменные
        ring: 'var(--ring)',
      },
      ringWidth: {
        DEFAULT: '1px',
      },
    },
  },
  plugins: [],
}
