/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#060a10',
          900: '#0d1117',
          800: '#111827',
          700: '#161b22',
          600: '#1c2333',
          500: '#21262d',
          400: '#30363d',
          300: '#484f58',
          200: '#6e7681',
          100: '#8b949e',
          50:  '#c9d1d9',
        },
        brand: {
          DEFAULT: '#1f6feb',
          light:   '#388bfd',
          dark:    '#0d419d',
          glow:    '#388bfd33',
        },
        success: { DEFAULT: '#3fb950', bg: '#3fb95022' },
        warning: { DEFAULT: '#d29922', bg: '#d2992222' },
        danger:  { DEFAULT: '#f85149', bg: '#f8514922' },
        orange:  { DEFAULT: '#db6d28', bg: '#db6d2822' },
        purple:  { DEFAULT: '#8957e5', bg: '#8957e522' },
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04)',
        glow:    '0 0 0 1px #f85149, 0 0 16px 2px #f8514944',
        panel:   '0 8px 32px rgba(0,0,0,.6)',
        modal:   '0 24px 64px rgba(0,0,0,.7)',
      },
      animation: {
        'fade-in':  'fadeIn .2s ease',
        'slide-up': 'slideUp .25s ease',
        'pulse-red':'pulseRed 1.4s ease-in-out infinite',
        'spin-slow':'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 },                  to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseRed: { '0%,100%': { boxShadow: '0 0 0 1px #f85149' }, '50%': { boxShadow: '0 0 18px 3px #f8514966' } },
      },
    },
  },
  plugins: [],
};
