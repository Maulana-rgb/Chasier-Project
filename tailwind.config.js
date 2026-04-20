/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dimsum: {
          red: "#D32F2F",
          yellow: "#FBC02D",
          dark: "#1A1A1A"
        }
      }
    },
  },
  plugins: [],
}