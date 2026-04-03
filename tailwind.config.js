
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.{ts,tsx,js,jsx}",
    "./index.{ts,tsx,js,jsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          750: '#2d3b4e',
        },
      },
    },
  },
  plugins: [],
}
