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
        'app-bg': '#0f1117',
        'sidebar-bg': '#161b22',
        'card-bg': '#1c2333',
        'border-color': '#30363d',
        'accent': '#58a6ff',
        'accent-hover': '#79b8ff',
        'user-bubble': '#1e3a5f',
        'assistant-bubble': '#1c2333',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-dot': 'pulseDot 1.4s infinite ease-in-out',
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
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#e6edf3',
            a: { color: '#58a6ff' },
            strong: { color: '#e6edf3' },
            code: { color: '#f0883e', backgroundColor: '#161b22', padding: '2px 4px', borderRadius: '4px' },
            'pre code': { backgroundColor: 'transparent', padding: '0' },
          },
        },
      },
    },
  },
  plugins: [],
};
