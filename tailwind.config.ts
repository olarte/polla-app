import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'SF Pro Rounded',
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Helvetica Neue',
          'sans-serif',
        ],
        display: ['Lilita One', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        // App design system
        polla: {
          bg: '#0A0A12',
          accent: '#E94560',
          'accent-dark': '#c73550',
          secondary: '#0F3460',
          'secondary-deep': '#1A1A4E',
          light: '#16213E',
          success: '#27AE60',
          warning: '#F39C12',
          whatsapp: '#25D366',
          gold: '#FFD700',
          silver: '#C0C0C0',
          bronze: '#CD7F32',
        },
        card: {
          DEFAULT: 'rgba(255,255,255,0.03)',
          border: 'rgba(255,255,255,0.06)',
        },
        text: {
          100: '#FFFFFF',
          70: 'rgba(255,255,255,0.7)',
          40: 'rgba(255,255,255,0.4)',
          35: 'rgba(255,255,255,0.35)',
          25: 'rgba(255,255,255,0.25)',
        },
        rarity: {
          common: 'rgba(255,255,255,0.4)',
          rare: '#4FC3F7',
          epic: '#CE93D8',
          legendary: '#FFD700',
        },
        // Landing page tokens
        forest: '#0a1a08',
        gold: '#FFD700',
        'gold-dark': '#B8960F',
        wood: '#5D4037',
        'wood-light': '#8D6E63',
        cream: '#FFF8E1',
      },
      borderRadius: {
        card: '14px',
      },
      letterSpacing: {
        label: '0.1em',
      },
      fontSize: {
        label: ['10px', { lineHeight: '1', letterSpacing: '0.1em' }],
      },
      backgroundImage: {
        'glow-card': 'linear-gradient(135deg, #0F3460, #1A1A4E, #16213E)',
        'btn-primary': 'linear-gradient(to bottom, #E94560, #c73550)',
      },
    },
  },
  plugins: [],
}
export default config
