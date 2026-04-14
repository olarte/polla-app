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
        // App design system — "Prize Arcade" (cosmic purple + gold)
        polla: {
          bg: '#0B0714',
          accent: '#7B2CFF',
          'accent-dark': '#FF3D6E',
          secondary: '#15102A',
          'secondary-deep': '#1F1538',
          light: '#2A1F4A',
          success: '#14B8A6',
          warning: '#FFC93C',
          whatsapp: '#25D366',
          gold: '#FFC93C',
          silver: '#C0C0C0',
          bronze: '#CD7F32',
          coral: '#FF7B54',
          magenta: '#FF3D6E',
          teal: '#0F766E',
          cream: '#FFF5DC',
        },
        card: {
          DEFAULT: 'rgba(255,245,220,0.04)',
          border: 'rgba(255,201,60,0.1)',
        },
        text: {
          100: '#FFF5DC',
          70: 'rgba(255,245,220,0.7)',
          40: 'rgba(255,245,220,0.4)',
          35: 'rgba(255,245,220,0.35)',
          25: 'rgba(255,245,220,0.25)',
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
        'glow-card': 'linear-gradient(160deg, #15102A, #1F1538, #2A1F4A)',
        'btn-primary': 'linear-gradient(135deg, #7B2CFF, #FF3D6E)',
      },
    },
  },
  plugins: [],
}
export default config
