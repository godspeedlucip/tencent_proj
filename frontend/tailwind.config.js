/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        surface: {
          glass: 'rgba(255, 255, 255, 0.6)',
          border: 'rgba(253, 230, 138, 0.3)',
        },
      },
      backdropBlur: {
        glass: '12px',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(245, 158, 11, 0.08)',
        'glass-hover': '0 12px 32px rgba(245, 158, 11, 0.12)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'bounce-arrow': 'bounce 2s infinite',
        'progress-fill': 'progressFill 0.6s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        progressFill: {
          '0%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}
