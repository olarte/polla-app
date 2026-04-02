'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ─── Constants ─── */

const FLAGS = ['🇧🇷','🇦🇷','🇫🇷','🇩🇪','🇪🇸','🇵🇹','🇮🇹','🇳🇱','🇬🇧','🇺🇸','🇲🇽','🇨🇦','🇯🇵','🇰🇷','🇸🇦','🇦🇺','🇳🇬','🇸🇳','🇲🇦','🇨🇴']

const STEPS = [
  { num: '01', emoji: '📱', title: 'Sign up in 10 seconds', desc: 'Pick a name and an emoji. No email, no password, no app download.' },
  { num: '02', emoji: '📝', title: 'Predict every match', desc: 'All 104 World Cup matches. Research team stats and form to gain an edge.' },
  { num: '03', emoji: '⛱️', title: 'Create or join a pool', desc: 'Free pools for bragging rights. Paid pools for real money. Invite friends via link.' },
  { num: '04', emoji: '🎯', title: 'Bet on today\'s matches', desc: 'Bet USDC on match outcomes. Odds shift in real time. Winners split the pool.' },
  { num: '05', emoji: '💸', title: 'Claim your winnings', desc: 'Tap claim, USDC goes to your wallet instantly. No waiting.' },
]

const PRIZE_TIERS = [
  { icon: '🏆', label: 'Champion', detail: '15% of pool' },
  { icon: '💎', label: 'Top 5', detail: '20% of pool' },
  { icon: '⭐', label: 'Top 20', detail: '25% of pool' },
  { icon: '🥇', label: 'Top 100', detail: '25% of pool' },
  { icon: '🥈', label: 'Top 500', detail: '15% of pool' },
]

const FAQ_ITEMS = [
  { q: 'Is Sabi free?', a: 'Yes. You can predict all 104 matches, join free pools, and compete on the leaderboard without a wallet. Connect a wallet only when you want to bet real money or join paid pools.' },
  { q: 'What is MiniPay?', a: 'MiniPay is a mobile wallet built into Opera Mini. It runs on the Celo blockchain with USDC stablecoins. Available in 10+ countries across Africa and beyond.' },
  { q: 'How do bets work?', a: 'Bets are pari-mutuel: everyone bets into a pool, and winners split it proportionally. Odds shift in real time based on how people bet. A 5% fee is deducted from winnings.' },
  { q: 'What can I bet on?', a: 'Two markets per match — result (home, draw, or away) and total goals (over or under 2.5). Simple and straightforward.' },
  { q: 'How do I get my winnings?', a: 'After a match finishes, winning bets show a "Claim" button. Tap it and USDC goes directly to your MiniPay wallet. No waiting period.' },
  { q: 'What are pools?', a: 'Private prediction groups. Create one, invite friends with a link. Free pools are for bragging rights. Paid pools have a USDC entry fee and a real prize pool.' },
  { q: 'Is this gambling?', a: 'Sabi is a skill-based prediction contest. There are no house-set odds. You compete against other players based on football knowledge — similar to fantasy sports.' },
  { q: 'What if a match is cancelled?', a: 'All bets on that match are fully refunded. No fee is charged. You\'ll see a "Refund" button to claim your original amount.' },
  { q: 'Will Sabi work for other tournaments?', a: 'The World Cup is first. Copa América, Champions League, and Premier League are on the roadmap.' },
]

/* ─── Sub-components ─── */

function GlowCard({ children, color = 'green', className = '' }: {
  children: React.ReactNode
  color?: 'green' | 'gold'
  className?: string
}) {
  const glow = color === 'green'
    ? 'radial-gradient(ellipse at top right, rgba(52,211,153,0.08), transparent 60%)'
    : 'radial-gradient(ellipse at top right, rgba(251,191,36,0.08), transparent 60%)'
  const borderColor = color === 'green'
    ? 'rgba(52,211,153,0.12)'
    : 'rgba(251,191,36,0.15)'

  return (
    <div
      className={`relative rounded-2xl p-6 transition-all duration-200 hover:-translate-y-[3px] ${className}`}
      style={{
        background: `${glow}, #151c25`,
        border: `1px solid ${borderColor}`,
      }}
    >
      {children}
    </div>
  )
}

function FaqAccordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className={`text-sm font-semibold transition-colors ${open ? 'text-[#34d399]' : 'text-[#e2e8f0]'}`}>
          {q}
        </span>
        <span
          className={`text-lg transition-all duration-300 ${open ? 'text-[#34d399] rotate-45' : 'text-[#64748b]'}`}
        >
          +
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-350"
        style={{ maxHeight: open ? '300px' : '0' }}
      >
        <p className="text-[#94a3b8] text-sm leading-relaxed pb-4">{a}</p>
      </div>
    </div>
  )
}

/* ─── Main Page ─── */

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0c1117', color: '#e2e8f0' }}>

      {/* ═══ STICKY NAV ═══ */}
      <nav
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: 'rgba(12,17,23,0.87)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-[900px] mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg" style={{ fontWeight: 800 }}>
            <span style={{ color: '#34d399' }}>sabi</span>
            <span style={{ color: '#64748b' }}>.gg</span>
          </span>
          <div className="flex items-center gap-5">
            <a href="#how" className="text-[#94a3b8] text-sm hover:text-white transition-colors hidden sm:block">
              How it works
            </a>
            <a href="#faq" className="text-[#94a3b8] text-sm hover:text-white transition-colors hidden sm:block">
              FAQ
            </a>
            <Link
              href="/app"
              className="text-sm font-bold px-4 py-2 rounded-xl transition-all hover:shadow-[0_4px_16px_rgba(52,211,153,0.25)]"
              style={{ background: '#34d399', color: '#0c1117' }}
            >
              Play free ⚽
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 px-4 flex flex-col items-center text-center overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(52,211,153,0.08), transparent 70%)' }}
        />

        {/* Pill badge */}
        <div
          className="relative flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: '#151c25',
            border: '1px solid rgba(255,255,255,0.08)',
            animation: 'fadeUp 0.6s ease both',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#34d399', animation: 'glow 2s ease-in-out infinite' }}
          />
          <span className="text-[#94a3b8] text-sm">World Cup 2026 &middot; June 11 &ndash; July 19</span>
        </div>

        {/* Headline */}
        <h1
          className="mb-6"
          style={{
            fontSize: 'clamp(2.6rem, 7vw, 4.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            animation: 'fadeUp 0.6s ease 0.1s both',
          }}
        >
          Predict the World Cup.<br />
          <span
            style={{
              background: 'linear-gradient(135deg, #34d399, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Bet on every match.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="max-w-[500px] mb-8 leading-relaxed"
          style={{
            color: '#94a3b8',
            animation: 'fadeUp 0.6s ease 0.2s both',
          }}
        >
          A football prediction game where you compete with friends
          and bet real money on match outcomes. Free to play.
          Connect a wallet when you&rsquo;re ready for stakes.
        </p>

        {/* CTA */}
        <Link
          href="/app"
          className="inline-block mb-4 transition-all hover:-translate-y-0.5"
          style={{
            background: '#34d399',
            color: '#0c1117',
            fontWeight: 700,
            borderRadius: '14px',
            padding: '16px 36px',
            boxShadow: '0 4px 20px rgba(52,211,153,0.3)',
            animation: 'fadeUp 0.6s ease 0.3s both',
          }}
        >
          Start predicting — it&rsquo;s free
        </Link>

        <p style={{ color: '#64748b', fontSize: '0.8rem', animation: 'fadeUp 0.6s ease 0.4s both' }}>
          No app download. Works in your browser.
        </p>
      </section>

      {/* ═══ FLAG MARQUEE ═══ */}
      <div
        className="overflow-hidden py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="animate-marquee-landing whitespace-nowrap inline-flex">
          {[...FLAGS, ...FLAGS].map((flag, i) => (
            <span key={i} style={{ fontSize: '1.6rem', margin: '0 10px', opacity: 0.4 }}>{flag}</span>
          ))}
        </div>
      </div>

      {/* ═══ STATS ROW ═══ */}
      <section className="py-12 px-4">
        <div className="max-w-[600px] mx-auto flex justify-center gap-10 flex-wrap">
          {[
            { emoji: '🏟️', num: '48', label: 'teams' },
            { emoji: '⚽', num: '104', label: 'matches' },
            { emoji: '📅', num: '38', label: 'days' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <span style={{ fontSize: '1.4rem' }}>{s.emoji}</span>
              <div>
                <span className="block" style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{s.num}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TWO WAYS TO PLAY ═══ */}
      <section className="py-16 px-4">
        <div className="max-w-[760px] mx-auto">
          <div className="text-center mb-10">
            <h2 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800 }}>Two ways to play</h2>
            <p className="mt-2" style={{ color: '#94a3b8' }}>Everyone starts free. Add money when you want to.</p>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {/* Free card */}
            <GlowCard color="green">
              <span className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#34d399', fontSize: '0.7rem' }}>
                🎮 Free — no wallet needed
              </span>
              <h3 className="text-lg mb-2" style={{ fontWeight: 800 }}>Predict &amp; compete</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                Predict all 104 matches, join free pools with friends,
                climb the global leaderboard, and earn XP. The full experience, zero cost.
              </p>
            </GlowCard>

            {/* Money card */}
            <GlowCard color="gold" className="relative">
              <span
                className="absolute top-4 right-4 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
              >
                USDC on Celo
              </span>
              <span className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#fbbf24', fontSize: '0.7rem' }}>
                💰 Money — connect MiniPay
              </span>
              <h3 className="text-lg mb-2" style={{ fontWeight: 800 }}>Bet on matches</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                Bet USDC on match outcomes. Pari-mutuel pools mean your payout depends
                on the crowd. 5% fee on winnings. The smarter the bet, the bigger the reward.
              </p>
            </GlowCard>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section
        id="how"
        className="py-16 px-4"
        style={{
          background: '#1a2332',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-[660px] mx-auto">
          <div className="text-center mb-12">
            <h2 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800 }}>
              Here&rsquo;s how Sabi works ✨
            </h2>
          </div>

          <div className="space-y-8">
            {STEPS.map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <div
                  className="shrink-0 w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl"
                  style={{ background: '#151c25', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {step.emoji}
                </div>
                <div>
                  <span className="text-xs font-bold" style={{ color: '#34d399' }}>{step.num}</span>
                  <h3 className="text-base mb-1" style={{ fontWeight: 800 }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ GRAND POOL ═══ */}
      <section className="py-16 px-4">
        <div className="max-w-[660px] mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>
            🏆 Grand Pool
          </span>
          <h2 className="mt-3 mb-2" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800 }}>
            Every paid pool feeds the Grand Pool
          </h2>
          <p className="mb-8" style={{ color: '#94a3b8' }}>
            A portion of every paid pool entry goes into the global prize pool.
            The best predictors in the world split it.
          </p>

          <GlowCard color="gold" className="text-left">
            {PRIZE_TIERS.map((tier, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3.5"
                style={{ borderBottom: i < PRIZE_TIERS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tier.icon}</span>
                  <span className="text-sm" style={{ fontWeight: 700 }}>{tier.label}</span>
                </div>
                <span className="text-sm" style={{ color: '#64748b' }}>{tier.detail}</span>
              </div>
            ))}
          </GlowCard>
        </div>
      </section>

      {/* ═══ PARI-MUTUEL EXPLAINER ═══ */}
      <section className="py-16 px-4">
        <div className="max-w-[660px] mx-auto text-center">
          <h2 className="mb-2" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800 }}>
            You bet against other players, <span style={{ color: '#34d399' }}>not the house</span>
          </h2>
          <p className="mb-8" style={{ color: '#94a3b8' }}>
            All bets go into a shared pool. Winners split it proportionally.
            Sabi takes a 5% fee on winnings — that&rsquo;s it.
          </p>

          <GlowCard color="gold" className="text-left">
            <p className="text-sm mb-4" style={{ fontWeight: 700 }}>⚽ Example: Brazil vs Morocco</p>
            <div className="space-y-2 text-sm" style={{ color: '#94a3b8' }}>
              <p>Total pool: <span style={{ color: '#e2e8f0', fontWeight: 700 }}>$100</span></p>
              <p>$60 on Brazil &middot; $15 on Draw &middot; $25 on Morocco</p>
              <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p>Brazil wins &rarr; bettors split <span style={{ color: '#e2e8f0', fontWeight: 700 }}>$95</span> (after 5% fee)</p>
                <p className="mt-1">
                  Your $10 bet &rarr; you get{' '}
                  <span style={{ color: '#34d399', fontWeight: 800 }}>$15.83 💰</span>
                </p>
              </div>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* ═══ FOUNDER NOTE ═══ */}
      <section
        className="py-16 px-4"
        style={{
          background: '#1a2332',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-[540px] mx-auto" style={{ fontSize: '1.05rem', lineHeight: 1.75 }}>
          <p className="mb-4" style={{ color: '#94a3b8' }}>Hey —</p>
          <p className="mb-4" style={{ color: '#94a3b8' }}>
            In Latin America we call it <em className="not-italic" style={{ color: '#fff' }}>polla</em>.
            In Brazil it&rsquo;s <em className="not-italic" style={{ color: '#fff' }}>bol&atilde;o</em>.
            In Germany, <em className="not-italic" style={{ color: '#fff' }}>Tippspiel</em>.
            In England, a <em className="not-italic" style={{ color: '#fff' }}>football pool</em>.
            Everywhere in the world, people do the same thing when a big tournament comes:
            they get together and predict.
          </p>
          <p className="mb-4" style={{ color: '#94a3b8' }}>
            For decades, this lived on spreadsheets, WhatsApp groups, and scribbled paper brackets.
            Someone always had to collect money, track scores, and calculate points by hand.
          </p>
          <p className="mb-4" style={{ color: '#94a3b8' }}>
            Sabi digitizes this tradition. Predictions, pools, leaderboards, and payouts —
            all in one place, with stablecoins so anyone can play from anywhere.
          </p>
          <p style={{ color: '#fff', fontWeight: 700 }}>— Daniel, from Bogot&aacute; 🇨🇴</p>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="py-16 px-4">
        <div className="max-w-[620px] mx-auto">
          <h2 className="text-center mb-10" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800 }}>
            Questions &amp; answers 💬
          </h2>
          {FAQ_ITEMS.map((item, i) => (
            <FaqAccordion key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative py-20 px-4 text-center overflow-hidden">
        {/* Green glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.06), transparent 70%)' }}
        />

        <div className="relative max-w-[600px] mx-auto">
          <span className="block text-4xl mb-6" style={{ animation: 'float 3s ease-in-out infinite' }}>⚽</span>
          <h2 className="mb-3" style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 800 }}>
            The World Cup starts June 11
          </h2>
          <p className="mb-8" style={{ color: '#94a3b8' }}>
            48 teams. 104 matches. One champion. Don&rsquo;t just watch — predict it.
          </p>
          <Link
            href="/app"
            className="inline-block transition-all hover:-translate-y-0.5"
            style={{
              background: '#34d399',
              color: '#0c1117',
              fontWeight: 700,
              borderRadius: '14px',
              padding: '16px 36px',
              boxShadow: '0 4px 20px rgba(52,211,153,0.3)',
            }}
          >
            Start predicting — it&rsquo;s free
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer
        className="py-12 px-4 text-center"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-lg mb-2" style={{ fontWeight: 800 }}>
          <span style={{ color: '#34d399' }}>sabi</span>
          <span style={{ color: '#64748b' }}>.gg</span>
        </p>
        <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
          Predict football. Bet on matches. Compete with friends.
        </p>
        <div className="flex justify-center gap-6 mb-6">
          {['Terms', 'Privacy'].map((link) => (
            <a key={link} href="#" className="text-sm transition-colors hover:text-white" style={{ color: '#64748b' }}>
              {link}
            </a>
          ))}
          <a
            href="https://x.com/sabi_gg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm transition-colors hover:text-white"
            style={{ color: '#64748b' }}
          >
            @sabi_gg
          </a>
        </div>
        <p style={{ color: '#475569', fontSize: '0.75rem' }}>
          &copy; 2026 Sabi. Not affiliated with FIFA.
        </p>
      </footer>
    </div>
  )
}
