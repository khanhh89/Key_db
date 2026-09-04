/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#00f2fe',
        'brand-secondary': '#38bdf8',
        'brand-accent': '#6366f1',
        'admin-bg-dark': '#080c14',
        'admin-bg-light': '#f8fafc',
        'success': '#10b981',
        'error': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
