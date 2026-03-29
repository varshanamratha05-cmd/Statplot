/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        scientific: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          cyan: '#22d3ee',
          indigo: '#6366f1',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
