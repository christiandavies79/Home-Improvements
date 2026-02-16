/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FFF8F0',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2420C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        terra: {
          50: '#FDF2EC',
          100: '#F9DDD0',
          200: '#F2B9A0',
          300: '#E8926D',
          400: '#D4714D',
          500: '#C2603A',
          600: '#A84E2E',
          700: '#8B3F25',
          800: '#6E321E',
          900: '#522618',
        },
        sage: {
          50: '#F4F6F0',
          100: '#E5EAD9',
          200: '#CDD7B7',
          300: '#B0BF8E',
          400: '#96A86F',
          500: '#7D8B55',
          600: '#627043',
          700: '#4D5836',
          800: '#3E472D',
          900: '#333B27',
        },
        cream: {
          50: '#FFFDF7',
          100: '#FFF9EB',
          200: '#FFF3D6',
          300: '#FFE8B8',
          400: '#FFD98A',
          500: '#FFC85C',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Nunito"', '"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
