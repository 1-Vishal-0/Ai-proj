/** @type {import('tailwindcss').Config} */
export default {
  // Dark mode is intentionally not enabled during this design stage.
  darkMode: 'class',
  content: [
    './index.html',
    './src/main.tsx',
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/layouts/**/*.{ts,tsx}',
    './src/features/{auth,attendance,students,faculty,academics,timetable,analytics,reports,notifications,requests,settings}/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        elevated: 'var(--bg-elevated)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        border: 'var(--border-default)',
        'border-subtle': 'var(--border-subtle)',
        nav: {
          rail: 'var(--nav-rail)',
          panel: 'var(--nav-panel)',
          active: 'var(--nav-active)',
          hover: 'var(--nav-hover)',
          input: 'var(--nav-input)',
          text: 'var(--nav-text)',
          muted: 'var(--nav-text-muted)',
          divider: 'var(--nav-divider)',
        },
        brand: {
          DEFAULT: '#3939E7',
          50: '#EEEEFD',
          100: '#E0E0FC',
          200: '#C7C7FF',
          300: '#A5A5F7',
          400: '#7B7BF0',
          500: '#5656EB',
          600: '#3939E7',
          700: '#2828D6',
          800: '#2020AE',
          900: '#1A1A8A',
          950: '#10105A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Enterprise scale: 12 labels / 13 tables / 14 body & nav / 16 sections / 22 page titles
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.375rem', { lineHeight: '1.875rem' }],
      },
      boxShadow: {
        subtle: 'none',
        card: 'none',
        float: '0 4px 12px rgba(23, 25, 35, 0.08)',
        md: '0 4px 12px rgba(23, 25, 35, 0.08)',
      },
      borderRadius: {
        md: '0.25rem',
        lg: '0.375rem',
        xl: '0.5rem',
        '2xl': '0.5rem',
      },
      width: {
        rail: 'var(--rail-width)',
        panel: 'var(--panel-width)',
      },
      height: {
        header: 'var(--header-height)',
      },
    },
  },
  plugins: [],
};
