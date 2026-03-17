/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0d9488', dark: '#0f766e' },
        surface: { DEFAULT: '#f8fafc', dark: '#e2e8f0' },
      },
    },
  },
  plugins: [],
}
