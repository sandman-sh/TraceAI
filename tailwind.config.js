/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bauhaus: {
          bg: '#F4F4F0',
          black: '#0A0A0A',
          red: '#E03C31',
          blue: '#0055A4',
          yellow: '#F2C12E',
        }
      },
      boxShadow: {
        'bauhaus-md': '4px 4px 0px 0px #0A0A0A',
        'bauhaus-lg': '8px 8px 0px 0px #0A0A0A',
        'bauhaus-sm': '2px 2px 0px 0px #0A0A0A',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
