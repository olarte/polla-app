'use client'

import { useEffect, useState } from 'react'

/* ─── Constants ─── */
const WORLD_CUP_DATE = new Date('2026-06-11T00:00:00Z')

const FLAGS = ['🇧🇷','🇦🇷','🇫🇷','🇩🇪','🇪🇸','🇵🇹','🇮🇹','🇳🇱','🇬🇧','🇺🇸','🇲🇽','🇨🇦','🇯🇵','🇰🇷','🇸🇦','🇦🇺','🇳🇬','🇸🇳','🇲🇦','🇨🇴']

const PARTICLES = ['⚽','🏆','⭐','🥇','🎯','🌸']

const STEPS = [
  { emoji: '📱', title: 'Connect MiniPay', desc: 'Your MiniPay wallet is your account — connect in seconds' },
  { emoji: '🔮', title: 'Predict', desc: 'Predict scores for all 104 World Cup matches' },
  { emoji: '⛱️', title: 'Create a Pool', desc: 'Start a pool with friends and set your entry fee (from $1)' },
  { emoji: '🏆', title: 'Win Prizes', desc: 'Top predictors win from the group and global prize pools' },
]

const FEATURES = [
  { icon: '💵', title: 'Low Entry Fees', desc: 'Pools start at just $1. Any entry qualifies for La Gran Polla.' },
  { icon: '💰', title: 'Real Prize Pools', desc: 'USDC/USDT entry fees. Winner takes all or podium split.' },
  { icon: '🌍', title: 'Global Competition', desc: 'Compete on the global leaderboard. Climb tiers from Bronze to Mythic.' },
  { icon: '📊', title: 'Match Intelligence', desc: 'Team form, head-to-head stats, and qualification data for every match.' },
  { icon: '💬', title: 'WhatsApp Sharing', desc: 'Invite friends, share predictions, and trash talk — all via WhatsApp.' },
  { icon: '⛓️', title: 'Multi-Chain Deposits', desc: 'Deposit USDC on Celo, Base, Polygon, Ethereum, or USDT on Tron.' },
]

const PRIZE_TIERS = [
  { icon: '🏆', label: 'Champion', players: '1', amount: '$34,268' },
  { icon: '💎', label: 'Top 5', players: '4', amount: '$11,423' },
  { icon: '⭐', label: 'Top 20', players: '15', amount: '$3,808' },
  { icon: '🥇', label: 'Top 100', players: '80', amount: '$714' },
  { icon: '🥈', label: 'Top 500', players: '400', amount: '$85' },
]

/* ─── Components ─── */

function GameBtn({ children, color = 'green', onClick, className = '' }: {
  children: React.ReactNode
  color?: 'green' | 'wood' | 'gold' | 'red'
  onClick?: () => void
  className?: string
}) {
  const colors = {
    green: { bg: 'linear-gradient(to bottom, #4CAF50, #1B5E20)', shadow: '#0d3b10' },
    wood: { bg: 'linear-gradient(to bottom, #8D6E63, #5D4037)', shadow: '#3e2723' },
    gold: { bg: 'linear-gradient(to bottom, #FFD700, #B8960F)', shadow: '#7a6308' },
    red: { bg: 'linear-gradient(to bottom, #E94560, #c73550)', shadow: '#8b1a2b' },
  }
  const c = colors[color]

  return (
    <button
      onClick={onClick}
      className={`
        relative font-display text-white uppercase tracking-wider
        px-8 py-4 rounded-xl text-lg cursor-pointer select-none
        transition-all duration-100
        active:translate-y-[3px]
        ${className}
      `}
      style={{
        background: c.bg,
        boxShadow: `0 6px 0 ${c.shadow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
        textShadow: '0 2px 0 rgba(0,0,0,0.3)',
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 3px 0 ${c.shadow}, inset 0 1px 0 rgba(255,255,255,0.3)`
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 0 ${c.shadow}, inset 0 1px 0 rgba(255,255,255,0.3)`
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 0 ${c.shadow}, inset 0 1px 0 rgba(255,255,255,0.3)`
      }}
    >
      {children}
    </button>
  )
}

function WoodDivider() {
  return (
    <div className="w-full max-w-[600px] mx-auto my-10 h-[6px] rounded-full"
      style={{
        background: 'linear-gradient(to right, transparent, #8D6E63, #5D4037, #8D6E63, transparent)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.3)',
      }}
    />
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-10">
      <h2 className="font-display text-gold uppercase"
        style={{
          fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
          textShadow: '0 3px 0 #B8960F, 0 5px 10px rgba(0,0,0,0.5)',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="font-body text-white/60 mt-2 text-base max-w-lg mx-auto">{subtitle}</p>
      )}
    </div>
  )
}

/* ─── FAQ content ─── */

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'How does scoring work?',
    a: 'Pick a score for every match. You earn points based on how close you were: 10 for the exact score, 5 for the right winner + goal difference, 3 for the right winner + one team\u2019s goals, 2 for just the right winner, 0 if you got the winner wrong. Every match is worth the same — no stage multipliers, no side bonuses.',
  },
  {
    q: 'Can I join more than one pool? Does that give me more chances to win?',
    a: 'Join as many pools as you want — with your family, your office, a group of die-hard fans. But you only make ONE set of predictions, and that same bracket is scored in every pool you\u2019ve joined. Joining ten pools doesn\u2019t give you ten shots at the global prize; your skill is your skill. What joining more pools does do is put you on more leaderboards where you can compete against different circles of friends.',
  },
  {
    q: 'Is there a minimum entry fee to compete for the big prize?',
    a: 'The minimum is $1. Any pool entry — even a dollar — qualifies you for La Gran Polla. We want the underdog story — a casual player topping the leaderboard and winning big — to be possible.',
  },
  {
    q: 'How are the global prizes distributed?',
    a: 'The global prize pool is split across the top 500 ranked players: 15% to the Champion, 20% to positions 2\u20135, 25% to positions 6\u201320, 25% to positions 21\u2013100, and 15% to positions 101\u2013500. Flat and final — no held-back side pools, no perfect-bracket jackpots.',
  },
  {
    q: 'Do I need a wallet to play?',
    a: 'Yes. Polla uses MiniPay (Celo USDC) as the sole sign-up and payment method — your wallet is your account. Every pool has a stablecoin entry fee, starting at $1, so wallet connection happens the moment you sign up.',
  },
  {
    q: 'Is this gambling?',
    a: 'No. Polla is a skill-based prediction contest. Everyone pays the same entry fee inside a pool, everyone is scored on the same matches by the same rules, and the prize pool is distributed by accuracy ranking. We don\u2019t set odds, we don\u2019t take trades, and there\u2019s no outcome-based pool splitting. It\u2019s closer to a March Madness office bracket than a sportsbook.',
  },
]

/* ─── Main Page ─── */

export default function LandingPage() {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    function update() {
      const diff = WORLD_CUP_DATE.getTime() - Date.now()
      if (diff <= 0) return
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <main className="min-h-screen bg-forest">

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Particles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-${Math.random() * 20}%`,
              fontSize: `${16 + Math.random() * 20}px`,
              animation: `particle-float ${8 + Math.random() * 12}s linear ${Math.random() * 10}s infinite`,
              opacity: 0,
            }}
          >
            {PARTICLES[i % PARTICLES.length]}
          </span>
        ))}

        {/* Logo */}
        <div className="animate-float mb-6">
          <div className="text-[100px] sm:text-[140px]"
            style={{ filter: 'drop-shadow(0 8px 20px rgba(255,215,0,0.4))' }}
          >
            ⚽
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-display text-gold text-center uppercase leading-tight"
          style={{
            fontSize: 'clamp(1.8rem, 7vw, 3.5rem)',
            textShadow: '0 4px 0 #B8960F, 0 6px 15px rgba(0,0,0,0.6)',
          }}
        >
          Predict the<br />World Cup 2026
        </h1>

        <p className="font-body text-white/70 text-center mt-4 mb-8 max-w-md text-lg font-semibold">
          The ultimate social prediction game. Create groups, compete globally, win real prizes.
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <GameBtn color="green">Join a Pool</GameBtn>
          <GameBtn color="wood" onClick={() => {
            document.getElementById('prizes')?.scrollIntoView({ behavior: 'smooth' })
          }}>
            See Prizes
          </GameBtn>
        </div>

        {/* Countdown */}
        <div className="flex gap-4 text-center">
          {(['days', 'hours', 'minutes', 'seconds'] as const).map((unit) => (
            <div key={unit} className="flex flex-col items-center">
              <span className="font-display text-gold text-2xl sm:text-4xl"
                style={{ textShadow: '0 2px 0 #B8960F' }}
              >
                {String(countdown[unit]).padStart(2, '0')}
              </span>
              <span className="font-body text-white/40 text-[10px] uppercase tracking-widest mt-1">
                {unit}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FLAG MARQUEE ═══ */}
      <div className="overflow-hidden py-4 border-y border-white/5">
        <div className="animate-marquee whitespace-nowrap inline-flex">
          {[...FLAGS, ...FLAGS].map((flag, i) => (
            <span key={i} className="text-3xl mx-3">{flag}</span>
          ))}
        </div>
      </div>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-20 px-4">
        <div className="max-w-[900px] mx-auto">
          <SectionTitle title="How It Works" subtitle="Four simple steps to glory" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center
                  transition-transform duration-200 hover:-translate-y-1.5 cursor-default"
              >
                <span className="absolute top-3 left-4 font-display text-white/[0.06] text-6xl leading-none">
                  {i + 1}
                </span>
                <div className="text-5xl mb-4">{step.emoji}</div>
                <h3 className="font-display text-cream uppercase text-lg mb-2">{step.title}</h3>
                <p className="font-body text-white/50 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WoodDivider />

      {/* ═══ FEATURES ═══ */}
      <section className="py-16 px-4">
        <div className="max-w-[900px] mx-auto">
          <SectionTitle title="Features" subtitle="Everything you need for the World Cup" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.06]
                  rounded-xl p-5 transition-transform duration-200 hover:-translate-y-1"
                style={{ borderColor: 'rgba(255,215,0,0.08)' }}
              >
                <div className="shrink-0 w-12 h-12 rounded-lg bg-white/[0.06] flex items-center justify-center text-2xl">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-display text-cream uppercase text-sm mb-1">{f.title}</h3>
                  <p className="font-body text-white/45 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WoodDivider />

      {/* ═══ GRAND POOL ═══ */}
      <section id="prizes" className="py-20 px-4">
        <div className="max-w-[700px] mx-auto">
          <SectionTitle title="Grand Pool" subtitle="The global prize pool — every paid player competes" />

          {/* Pool card */}
          <div className="rounded-2xl p-8 text-center mb-10"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02))',
              border: '2px solid rgba(255,215,0,0.3)',
              boxShadow: '0 0 40px rgba(255,215,0,0.1)',
            }}
          >
            <p className="font-body text-white/50 text-sm uppercase tracking-widest mb-2">Total Prize Pool</p>
            <p className="font-display text-gold"
              style={{
                fontSize: 'clamp(2.5rem, 10vw, 4.5rem)',
                textShadow: '0 4px 0 #B8960F, 0 8px 20px rgba(255,215,0,0.3)',
              }}
            >
              $228,456
            </p>
          </div>

          {/* Prize tiers */}
          <div className="space-y-0">
            {PRIZE_TIERS.map((tier, i) => (
              <div key={i}
                className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tier.icon}</span>
                  <div>
                    <span className="font-display text-cream text-sm uppercase">{tier.label}</span>
                    <span className="font-body text-white/35 text-xs ml-2">({tier.players} {Number(tier.players) === 1 ? 'player' : 'players'})</span>
                  </div>
                </div>
                <span className="font-display text-gold text-lg"
                  style={{ textShadow: '0 1px 0 #B8960F' }}
                >
                  {tier.amount}
                </span>
              </div>
            ))}
          </div>

        </div>
      </section>

      <WoodDivider />

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-[760px] mx-auto">
          <SectionTitle title="FAQ" subtitle="The rules in plain English" />
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-gold/20 bg-white/[0.03] px-5 py-4 open:bg-white/[0.05] transition-colors"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="font-display text-cream text-base sm:text-lg uppercase leading-tight">
                    {item.q}
                  </span>
                  <span className="font-display text-gold text-2xl leading-none shrink-0 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="font-body text-white/70 text-sm sm:text-base mt-3 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-[600px] mx-auto">
          <p className="text-4xl mb-6">🇺🇸 🇲🇽 🇨🇦</p>
          <h2 className="font-display text-gold uppercase mb-4"
            style={{
              fontSize: 'clamp(1.3rem, 5vw, 2rem)',
              textShadow: '0 3px 0 #B8960F, 0 5px 10px rgba(0,0,0,0.5)',
            }}
          >
            The World Cup Only Happens<br />Every 4 Years
          </h2>
          <p className="font-body text-white/50 mb-8 text-base">
            Don&apos;t miss your chance to predict, compete, and win.
          </p>
          <GameBtn color="green" className="text-xl px-12 py-5">
            Join a Pool
          </GameBtn>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.06] py-12 px-4 text-center">
        <div className="text-5xl mb-4">⚽</div>
        <h3 className="font-display text-gold text-xl uppercase mb-2"
          style={{ textShadow: '0 2px 0 #B8960F' }}
        >
          Sabi.gg
        </h3>
        <p className="font-body text-white/40 text-sm mb-6">
          The ultimate World Cup prediction game
        </p>
        <div className="flex justify-center gap-6 mb-8">
          {[
            { label: 'Terms', href: '#' },
            { label: 'Privacy', href: '#' },
            { label: 'FAQ', href: '#faq' },
          ].map((link) => (
            <a key={link.label} href={link.href} className="font-body text-white/35 text-sm hover:text-white/60 transition-colors">
              {link.label}
            </a>
          ))}
        </div>
        <p className="font-body text-white/20 text-xs">
          &copy; 2026 Sabi. This is a skill-based prediction contest, not gambling.
        </p>
      </footer>
    </main>
  )
}
