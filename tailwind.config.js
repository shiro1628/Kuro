/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#080808',
          1: '#111111',
          2: '#181818',
          3: '#202020',
          border: '#242424',
        },
        accent: {
          DEFAULT: '#f0a500',   // 고양이 눈 호박색
          dim: '#c8850a',
          glow: 'rgba(240,165,0,0.15)',
        },
        gem: {
          DEFAULT: '#7c6af7',   // Gemini 전용 (보라)
          dim: '#4f3ff0',
        },
        cat: {
          ear:  '#1a0d10',
          nose: '#d06070',
        },
      },
      fontFamily: {
        mono: ['Cascadia Code', 'Consolas', 'monospace'],
      },
      keyframes: {
        'eye-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px #f0a500)' },
          '50%':      { filter: 'drop-shadow(0 0 12px #f0a500) drop-shadow(0 0 24px #f0a500aa)' },
        },
        'tail-wag': {
          '0%,100%': { transform: 'rotate(-15deg) translateX(0)' },
          '50%':     { transform: 'rotate(15deg)  translateX(2px)' },
        },
        'blink': {
          '0%,90%,100%': { scaleY: 1 },
          '95%':          { scaleY: 0.05 },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'eye-glow':  'eye-glow 2.4s ease-in-out infinite',
        'tail-wag':  'tail-wag 0.8s ease-in-out infinite',
        'blink':     'blink 4s ease-in-out infinite',
        'fade-in':   'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
