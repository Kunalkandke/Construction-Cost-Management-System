/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#EAF2FB', 100: '#D2E5F6', 200: '#A9CBEA', 500: '#1F78B4', 600: '#0B5A8C', 700: '#0B4F7C', 900: '#062C47' },
        accent: { 50: '#FFF6E8', 200: '#FBE2B6', 400: '#F6B24A', 500: '#E8941A', 600: '#C97A0A' },
        ink: { 900: '#0F172A', 700: '#334155', 500: '#64748B', 300: '#CBD5E1', 100: '#F1F5F9' },
        success: { DEFAULT: '#16A34A', 50: '#F0FDF4' },
        warning: { DEFAULT: '#D97706', 50: '#FFFBEB' },
        danger: { DEFAULT: '#DC2626', 50: '#FEF2F2' },
        info: { DEFAULT: '#0284C7', 50: '#F0F9FF' },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: { glass: '0 8px 32px rgba(11, 79, 124, 0.10)' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      keyframes: { shimmer: { '100%': { transform: 'translateX(100%)' } } },
      animation: { shimmer: 'shimmer 1.6s infinite' },
    },
  },
  plugins: [],
};
