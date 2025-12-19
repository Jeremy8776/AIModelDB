/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-hover': 'var(--accentHover)',
        bg: 'var(--bg)',
        'bg-card': 'var(--bgCard)',
        'bg-input': 'var(--bgInput)',
        border: 'var(--border)',
        'border-input': 'var(--borderInput)',
        text: 'var(--text)',
        'text-secondary': 'var(--textSecondary)',
        'text-subtle': 'var(--textSubtle)',
      },
      backgroundColor: {
        primary: 'var(--bg)',
        card: 'var(--bgCard)',
        input: 'var(--bgInput)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        input: 'var(--borderInput)',
      },
      textColor: {
        DEFAULT: 'var(--text)',
        primary: 'var(--text)',
        secondary: 'var(--textSecondary)',
        subtle: 'var(--textSubtle)',
      },
    },
  },
  plugins: [],
};
