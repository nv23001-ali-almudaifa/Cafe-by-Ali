/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'coffee': {
          50: '#f7f3f0',
          100: '#efe7e0',
          200: '#dfd0c1',
          300: '#c9a981',
          400: '#a67c52',
          500: '#8b5a3c',
          600: '#704831',
          700: '#5c3d2a',
          800: '#4a2f20',
          900: '#3d2418',
        },
        'latte': {
          50: '#fdf8f3',
          100: '#faf0e4',
          200: '#f3e0c8',
          300: '#eac9a3',
          400: '#d9a66c',
          500: '#c5844f',
          600: '#a36c3f',
          700: '#865a35',
          800: '#6d4a2c',
          900: '#583d23',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'serif': ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}