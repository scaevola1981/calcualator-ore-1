/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--brand-primary)',
          500: 'var(--brand-primary)', // fallback for existing classes
        },
        surface: 'var(--card-bg)',
        background: 'var(--app-bg)',
        success: 'var(--status-success)',
        danger: 'var(--status-danger)',
        warning: 'var(--status-warning)',
        border: 'var(--border-color)',
        input: 'var(--input-bg)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      backgroundColor: {
        skin: {
          base: 'var(--app-bg)',
          card: 'var(--card-bg)',
          input: 'var(--input-bg)',
        }
      },
      textColor: {
        skin: {
          base: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          brand: 'var(--brand-primary)',
        }
      },
      borderColor: {
        skin: {
          DEFAULT: 'var(--border-color)',
        }
      },
      boxShadow: {
        card: 'var(--card-shadow)',
      }
    },
  },
  plugins: [],
}
