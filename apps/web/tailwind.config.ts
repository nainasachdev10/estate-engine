import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Instrument-panel geometry: tight radii everywhere. Every rounded-* in the
    // app resolves through this scale, so the whole console reads as one system.
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '3px',
      md: '4px',
      lg: '4px',
      xl: '5px',
      '2xl': '6px',
      '3xl': '8px',
      full: '9999px',
    },
    extend: {
      colors: {
        gold: '#D4AF37',
        'gold-spark': '#E6C55A',
        'dark-bg': '#0B0B0C',        // ink
        'dark-secondary': '#131315', // graphite
        'dark-tertiary': '#1B1B1E',  // slate
        filament: '#26262A',         // hairline borders
        bone: '#F2F2F3',
        ash: '#8B8B92',
      },
      fontFamily: {
        display: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #d4af37 0%, #c9a137 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
