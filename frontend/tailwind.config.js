/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'app-bg': '#0a0a0a',
        'sidebar-bg': '#111111',
        'card-bg': '#1a1a1a',
        'border-color': '#2a2a2a',
        'accent': '#58a6ff',
        'accent-hover': '#79b8ff',
        'user-bubble': '#1e3a5f',
        'assistant-bubble': '#1c1c1c',
        'gold': '#d4af37',
        'gold-light': '#ffd700',
        'gold-dark': '#b8860b',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-dot': 'pulseDot 1.4s infinite ease-in-out',
        'gold-shimmer': 'goldShimmer 3s ease-in-out infinite',
        'gold-pulse': 'goldPulse 2s ease-in-out infinite',
        'border-glow': 'borderGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        goldShimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        goldPulse: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: '#d4af37', boxShadow: '0 0 5px rgba(212,175,55,0.3)' },
          '50%': { borderColor: '#ffd700', boxShadow: '0 0 15px rgba(255,215,0,0.6)' },
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #d4af37 0%, #ffd700 50%, #b8860b 100%)',
        'gold-shimmer': 'linear-gradient(90deg, #d4af37 0%, #ffd700 25%, #fffacd 50%, #ffd700 75%, #b8860b 100%)',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#f0f0f0',
            a: { color: '#58a6ff' },
            strong: { color: '#f0f0f0' },
            code: { color: '#f0883e', backgroundColor: '#1a1a1a', padding: '2px 4px', borderRadius: '4px' },
            'pre code': { backgroundColor: 'transparent', padding: '0' },
          },
        },
      },
    },
  },
  plugins: [],
};

