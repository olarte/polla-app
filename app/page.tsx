'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════
   SABI — "Prize Arcade" landing preview
   Throwaway route: /preview
   Palette: cosmic purple + gold + magenta + card-block colors
   ═══════════════════════════════════════════════════════════ */

const FLAGS = ['🇲🇽','🇿🇦','🇰🇷','🇨🇿','🇨🇦','🇧🇦','🇶🇦','🇨🇭','🇧🇷','🇲🇦','🇭🇹','🏴󠁧󠁢󠁳󠁣󠁴󠁿','🇺🇸','🇵🇾','🇦🇺','🇹🇷','🇩🇪','🇨🇼','🇨🇮','🇪🇨','🇳🇱','🇯🇵','🇸🇪','🇹🇳','🇧🇪','🇪🇬','🇮🇷','🇳🇿','🇪🇸','🇨🇻','🇸🇦','🇺🇾','🇫🇷','🇸🇳','🇮🇶','🇳🇴','🇦🇷','🇩🇿','🇦🇹','🇯🇴','🇵🇹','🇨🇩','🇺🇿','🇨🇴','🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇭🇷','🇬🇭','🇵🇦']

const STEPS = [
  { n: '01', emoji: '📱', title: 'Sign up', desc: 'Pick a name and an emoji. No email, no password.', bg: '#7B2CFF', text: '#FFF5DC' },
  { n: '02', emoji: '📝', title: 'Predict every match', desc: 'All 104 games. Research form, stats, and history.', bg: '#FF7B54', text: '#1a0b05' },
  { n: '03', emoji: '⛱️', title: 'Join a pool', desc: 'Create one or jump in. Free or paid, your call.', bg: '#FFC93C', text: '#1a1106' },
  { n: '04', emoji: '🎯', title: 'Bet on matches', desc: 'Real-time odds. Winners split the pool.', bg: '#0F766E', text: '#FFF5DC' },
  { n: '05', emoji: '💸', title: 'Claim winnings', desc: 'One tap. USDC lands in your wallet instantly.', bg: '#FF3D6E', text: '#FFF5DC' },
]

const PRIZE_TIERS = [
  { icon: '🏆', label: 'Champion', players: '1 player', detail: '15%' },
  { icon: '💎', label: 'Top 5', players: '4 players', detail: '20%' },
  { icon: '⭐', label: 'Top 20', players: '15 players', detail: '25%' },
  { icon: '🥇', label: 'Top 100', players: '80 players', detail: '25%' },
  { icon: '🥈', label: 'Top 500', players: '400 players', detail: '15%' },
]

const FAQS = [
  { q: 'Is Sabi free?', a: 'Yes. Predict all 104 matches, join free pools, compete on the global leaderboard — all without a wallet. Connect a wallet only for real-money features.' },
  { q: 'What is MiniPay?', a: 'A mobile wallet built into Opera Mini, running on Celo with USDC. Available in 10+ countries across Africa and beyond.' },
  { q: 'How do bets work?', a: 'Pari-mutuel: everyone bets into a pool, winners split it proportionally. Odds shift in real time based on how people bet. A 5% fee is deducted from winnings.' },
  { q: 'What can I bet on?', a: 'Two markets per match — result (home/draw/away) and total goals (over/under 2.5). Clean and simple.' },
  { q: 'How do I get my winnings?', a: 'After a match finishes, winning bets show a Claim button. Tap it and USDC goes straight to your MiniPay wallet.' },
  { q: 'What are pools?', a: 'Private prediction groups. Create one, invite friends with a link. Free for bragging rights, paid for real prize pools.' },
  { q: 'Is this gambling?', a: 'Sabi is a skill-based prediction contest. No house-set odds. You compete against other players based on football knowledge — similar to fantasy sports.' },
  { q: 'What if a match is cancelled?', a: 'All bets fully refunded, no fee charged. You\u2019ll see a Refund button for your original amount.' },
  { q: 'Will Sabi work for other tournaments?', a: 'World Cup is first. Copa Am\u00e9rica, Champions League, and Premier League are on the roadmap.' },
]

/* ═══ Countdown hook ═══ */
function useCountdown(target: string) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, new Date(target).getTime() - now.getTime())
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return { d, h, m }
}

/* ═══ PillTag — the signature header label used on every card ═══ */
function PillTag({ children, color = 'rgba(255,255,255,0.18)', text = '#fff' }: {
  children: React.ReactNode
  color?: string
  text?: string
}) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{
        background: color,
        color: text,
        fontSize: '0.65rem',
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

/* ═══ Chunky headline — fakes the logo\u2019s 3D text feel ═══ */
function Chunky({ children, size = 'clamp(2.4rem, 7vw, 4rem)', color = '#fff', shadow = '0 2px 0 rgba(0,0,0,0.35), 0 8px 24px rgba(123,44,255,0.35)' }: {
  children: React.ReactNode
  size?: string
  color?: string
  shadow?: string
}) {
  return (
    <h2
      style={{
        fontSize: size,
        fontWeight: 900,
        letterSpacing: '-0.03em',
        lineHeight: 1.05,
        color,
        textShadow: shadow,
      }}
    >
      {children}
    </h2>
  )
}

/* ═══ Main ═══ */
export default function PreviewLanding() {
  const { d, h, m } = useCountdown('2026-06-11T16:00:00Z')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div
      style={{
        background: '#0B0714',
        color: '#FFF5DC',
        minHeight: '100vh',
        fontFamily: "'SF Pro Rounded', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Ambient cosmic glow layer ── */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 20% 10%, rgba(123,44,255,0.25), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(255,61,110,0.15), transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(255,201,60,0.12), transparent 50%)',
          zIndex: 0,
        }}
      />

      {/* ═══ STICKY NAV ═══ */}
      <nav
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: 'rgba(11,7,20,0.78)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(255,201,60,0.12)',
        }}
      >
        <div className="max-w-[960px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" style={{ fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
            <span style={{ color: '#FFC93C' }}>sabi</span>
            <span style={{ color: 'rgba(255,245,220,0.35)' }}>.gg</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#how" className="hidden sm:block text-sm" style={{ color: 'rgba(255,245,220,0.55)' }}>
              How
            </a>
            <a href="#faq" className="hidden sm:block text-sm" style={{ color: 'rgba(255,245,220,0.55)' }}>
              FAQ
            </a>
            <Link
              href="/app"
              className="transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #7B2CFF, #FF3D6E)',
                color: '#fff',
                fontWeight: 800,
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '0.9rem',
                boxShadow: '0 4px 18px rgba(123,44,255,0.45)',
              }}
            >
              Play
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        {/* ═══ HERO ═══ */}
        <section className="pt-32 pb-16 px-4 flex flex-col items-center text-center">
          {/* Countdown pill */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{
              background: 'rgba(255,201,60,0.12)',
              border: '1px solid rgba(255,201,60,0.3)',
              animation: 'fadeUp 0.6s ease both',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: '#FFC93C', animation: 'glow 2s ease-in-out infinite' }}
            />
            <span style={{ color: '#FFC93C', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.05em' }}>
              {d}d {h}h {m}m · World Cup 2026
            </span>
          </div>

          {/* Logo hero */}
          <img
            src="/sabi_applogo.png"
            alt="Sabi"
            className="mb-8"
            style={{
              width: 'clamp(200px, 48vw, 260px)',
              height: 'auto',
              borderRadius: '32px',
              filter: 'drop-shadow(0 12px 48px rgba(123,44,255,0.55)) drop-shadow(0 4px 20px rgba(255,201,60,0.3))',
              animation: 'float 4s ease-in-out infinite, fadeUp 0.8s ease both',
            }}
          />

          {/* Chunky headline */}
          <div style={{ animation: 'fadeUp 0.6s ease 0.2s both' }}>
            <Chunky>
              Predict the World Cup.
            </Chunky>
            <div style={{ marginTop: '0.25em' }}>
              <Chunky
                color="#FFC93C"
                shadow="0 2px 0 rgba(0,0,0,0.35), 0 8px 32px rgba(255,201,60,0.4)"
              >
                Win the World Pool.
              </Chunky>
            </div>
          </div>

          <p
            className="max-w-[480px] mt-6 mb-8"
            style={{
              color: 'rgba(255,245,220,0.65)',
              fontSize: '1.05rem',
              lineHeight: 1.55,
              animation: 'fadeUp 0.6s ease 0.3s both',
            }}
          >
            A football prediction game where you compete with friends on the World Cup outcomes.
          </p>

          <Link
            href="/app"
            className="transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #7B2CFF, #FF3D6E)',
              color: '#fff',
              fontWeight: 800,
              padding: '18px 40px',
              borderRadius: '16px',
              fontSize: '1.05rem',
              boxShadow: '0 10px 40px rgba(123,44,255,0.55), 0 0 0 1px rgba(255,255,255,0.1) inset',
              animation: 'fadeUp 0.6s ease 0.4s both',
              display: 'inline-block',
            }}
          >
            Start predicting
          </Link>

          <p style={{ color: 'rgba(255,245,220,0.35)', fontSize: '0.8rem', marginTop: '14px', animation: 'fadeUp 0.6s ease 0.5s both' }}>
            Reuse your prediction in as many pools as you want.
          </p>
        </section>

        {/* ═══ TWO WAYS TO PLAY ═══ */}
        <section className="px-4 py-10 max-w-[960px] mx-auto">
          <div className="text-center mb-8">
            <Chunky size="clamp(1.6rem, 4.5vw, 2.4rem)">Two ways to play</Chunky>
            <p className="mt-3" style={{ color: 'rgba(255,245,220,0.55)' }}>
              Everyone starts free. Add money when you\u2019re ready.
            </p>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {/* FREE card (coral) */}
            <div
              className="relative overflow-hidden transition-transform hover:-translate-y-1"
              style={{
                background: 'linear-gradient(145deg, #FF7B54, #E85A2C)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 20px 60px rgba(255,123,84,0.25)',
                minHeight: '240px',
              }}
            >
              <div className="absolute top-5 right-5 text-5xl opacity-30">🎮</div>
              <PillTag color="rgba(0,0,0,0.25)" text="#FFF5DC">🎮 Free — no wallet</PillTag>
              <h3
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  marginTop: '18px',
                  color: '#1a0b05',
                  letterSpacing: '-0.02em',
                }}
              >
                Predict & compete
              </h3>
              <p style={{ color: 'rgba(26,11,5,0.75)', marginTop: '10px', lineHeight: 1.5, fontSize: '0.95rem' }}>
                Call every match. Join free pools. Climb the global leaderboard. No signup friction — just a name and an emoji.
              </p>
            </div>

            {/* MONEY card (teal) */}
            <div
              className="relative overflow-hidden transition-transform hover:-translate-y-1"
              style={{
                background: 'linear-gradient(145deg, #14B8A6, #0F766E)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 20px 60px rgba(15,118,110,0.35)',
                minHeight: '240px',
              }}
            >
              <div className="absolute top-5 right-5 text-5xl opacity-25">💰</div>
              <div
                className="absolute top-5 left-5"
                style={{
                  background: '#FFC93C',
                  color: '#1a1106',
                  fontSize: '0.6rem',
                  fontWeight: 900,
                  padding: '5px 10px',
                  borderRadius: '100px',
                  letterSpacing: '0.1em',
                }}
              >
                USDC · CELO
              </div>
              <div style={{ marginTop: '32px' }}>
                <PillTag color="rgba(0,0,0,0.3)" text="#FFF5DC">💰 Money — connect MiniPay</PillTag>
              </div>
              <h3
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  marginTop: '18px',
                  color: '#FFF5DC',
                  letterSpacing: '-0.02em',
                }}
              >
                Bet on matches
              </h3>
              <p style={{ color: 'rgba(255,245,220,0.75)', marginTop: '10px', lineHeight: 1.5, fontSize: '0.95rem' }}>
                Pari-mutuel betting on result + goals. Live odds. Winners split the pool. 5% fee, no house.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how" className="px-4 py-12 max-w-[960px] mx-auto">
          <div className="text-center mb-10">
            <Chunky size="clamp(1.6rem, 4.5vw, 2.4rem)">How Sabi works ✨</Chunky>
            <p className="mt-3" style={{ color: 'rgba(255,245,220,0.55)' }}>
              Five simple steps to the prize pool.
            </p>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="relative overflow-hidden transition-transform hover:-translate-y-1"
                style={{
                  background: step.bg,
                  color: step.text,
                  borderRadius: '24px',
                  padding: '22px',
                  minHeight: '200px',
                  boxShadow: `0 16px 40px ${step.bg}55`,
                }}
              >
                <PillTag color="rgba(0,0,0,0.25)" text={step.text}>
                  Step {step.n}
                </PillTag>
                <div style={{ fontSize: '2.6rem', marginTop: '14px' }}>{step.emoji}</div>
                <h4
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    marginTop: '8px',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {step.title}
                </h4>
                <p style={{ fontSize: '0.85rem', opacity: 0.75, marginTop: '6px', lineHeight: 1.45 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ GRAND POOL (eye magnet — gold card, dark text) ═══ */}
        <section className="px-4 py-12 max-w-[760px] mx-auto">
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #FFD96B, #FFC93C 45%, #F5A524)',
              borderRadius: '32px',
              padding: '36px 28px',
              color: '#1a1106',
              boxShadow: '0 30px 80px rgba(255,201,60,0.3), 0 0 0 1px rgba(255,255,255,0.3) inset',
            }}
          >
            <div className="absolute top-6 right-6 text-6xl opacity-20">🏆</div>
            <PillTag color="rgba(26,17,6,0.85)" text="#FFC93C">🏆 Grand Pool</PillTag>
            <h3
              style={{
                fontSize: 'clamp(1.6rem, 4.5vw, 2.2rem)',
                fontWeight: 900,
                marginTop: '18px',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Every paid pool feeds the Grand Pool.
            </h3>
            <p style={{ color: 'rgba(26,17,6,0.7)', marginTop: '10px', fontSize: '0.95rem' }}>
              20% of every pool joins a global prize, split across the top 500 finishers on the world leaderboard.
            </p>

            <div
              style={{
                fontSize: 'clamp(2.8rem, 10vw, 4.6rem)',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                marginTop: '22px',
                color: '#1a1106',
                textShadow: '0 3px 0 rgba(255,255,255,0.4)',
                lineHeight: 1,
              }}
            >
              $228,456
            </div>
            <p style={{ color: 'rgba(26,17,6,0.55)', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, marginTop: '4px' }}>
              Projected Grand Pool
            </p>

            {/* Prize tiers */}
            <div className="mt-8 space-y-1">
              {PRIZE_TIERS.map((tier, i) => (
                <div
                  key={tier.label}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < PRIZE_TIERS.length - 1 ? '1px solid rgba(26,17,6,0.15)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.4rem' }}>{tier.icon}</span>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>{tier.label}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.55 }}>{tier.players}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{tier.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ NOT THE HOUSE (pari-mutuel explainer — ink navy) ═══ */}
        <section className="px-4 py-12 max-w-[760px] mx-auto">
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1E293B, #0F172A)',
              borderRadius: '32px',
              padding: '36px 28px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,201,60,0.15)',
            }}
          >
            <PillTag color="rgba(255,201,60,0.15)" text="#FFC93C">⚔️ Pari-mutuel</PillTag>
            <h3
              style={{
                fontSize: 'clamp(1.6rem, 4.5vw, 2.2rem)',
                fontWeight: 900,
                marginTop: '18px',
                color: '#FFF5DC',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              You bet other players,<br />
              <span
                style={{
                  color: '#FFC93C',
                  textShadow: '0 2px 0 rgba(0,0,0,0.35), 0 8px 24px rgba(255,201,60,0.3)',
                }}
              >
                not the house.
              </span>
            </h3>
            <p style={{ color: 'rgba(255,245,220,0.55)', marginTop: '12px', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Sabi takes a 5% fee — that\u2019s it. No odds, no markup, no edge. Pools are split between everyone who called it right.
            </p>

            {/* Example ticket */}
            <div
              className="mt-6"
              style={{
                background: '#0B0714',
                border: '1px solid rgba(255,245,220,0.08)',
                borderRadius: '20px',
                padding: '20px',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,245,220,0.4)', textTransform: 'uppercase' }}>
                Example
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFF5DC', marginTop: '4px' }}>
                ⚽ Brazil vs Morocco
              </div>
              <div className="flex justify-between mt-4 text-sm" style={{ color: 'rgba(255,245,220,0.55)' }}>
                <span>Total pool</span>
                <span style={{ color: '#FFC93C', fontWeight: 800 }}>$100</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div style={{ background: 'rgba(123,44,255,0.15)', padding: '10px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,245,220,0.4)', fontWeight: 800, letterSpacing: '0.08em' }}>BRA</div>
                  <div style={{ fontWeight: 900, color: '#FFF5DC', marginTop: '2px' }}>$60</div>
                </div>
                <div style={{ background: 'rgba(255,245,220,0.06)', padding: '10px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,245,220,0.4)', fontWeight: 800, letterSpacing: '0.08em' }}>DRAW</div>
                  <div style={{ fontWeight: 900, color: '#FFF5DC', marginTop: '2px' }}>$15</div>
                </div>
                <div style={{ background: 'rgba(255,61,110,0.15)', padding: '10px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,245,220,0.4)', fontWeight: 800, letterSpacing: '0.08em' }}>MAR</div>
                  <div style={{ fontWeight: 900, color: '#FFF5DC', marginTop: '2px' }}>$25</div>
                </div>
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: '1px dashed rgba(255,245,220,0.15)', fontSize: '0.85rem', color: 'rgba(255,245,220,0.7)', lineHeight: 1.6 }}>
                Brazil wins → bettors split <strong style={{ color: '#FFC93C' }}>$95</strong> (after 5% fee).<br />
                Your <strong style={{ color: '#FFF5DC' }}>$10</strong> bet → you get <strong style={{ color: '#14B8A6', fontSize: '1.1rem' }}>$15.83 💰</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FLAG MARQUEE ═══ */}
        <div
          className="overflow-hidden py-6 my-8"
          style={{
            borderTop: '1px solid rgba(255,245,220,0.08)',
            borderBottom: '1px solid rgba(255,245,220,0.08)',
          }}
        >
          <div className="flex animate-marquee-landing" style={{ width: 'max-content' }}>
            {[...FLAGS, ...FLAGS].map((f, i) => (
              <span key={i} className="flex-shrink-0" style={{ fontSize: '1.6rem', margin: '0 12px', opacity: 0.5 }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* ═══ FOUNDER NOTE (cream card, dark text) ═══ */}
        <section className="px-4 py-12 max-w-[640px] mx-auto">
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #FFF5DC, #F5E6B8)',
              borderRadius: '28px',
              padding: '32px 28px',
              color: '#1a1106',
              boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div className="absolute top-5 right-5 text-5xl opacity-20">🐔</div>
            <PillTag color="rgba(26,17,6,0.1)" text="#5C3D1E">💌 Founder note</PillTag>
            <div style={{ marginTop: '20px', fontSize: '1rem', lineHeight: 1.75, color: '#3d2a10' }}>
              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a1106' }}>Hey —</p>
              <p style={{ marginTop: '12px' }}>
                In Colombia we call it <em style={{ color: '#1a1106', fontWeight: 700 }}>polla</em>. Brazilians say <em style={{ color: '#1a1106', fontWeight: 700 }}>bolão</em>. Germans call it <em style={{ color: '#1a1106', fontWeight: 700 }}>tippspiel</em>. Every football country has its own word for the same ritual: friends, family, co-workers all filling out a bracket before the World Cup.
              </p>
              <p style={{ marginTop: '12px' }}>
                For decades this has lived in spreadsheets, WhatsApp groups, and paper printouts. Someone has to tally scores by hand. Someone has to chase everyone for the entry fee. And the winner usually gets paid in trust.
              </p>
              <p style={{ marginTop: '12px' }}>
                Sabi is the version that just works — with live scoring, real prize pools, and one-tap payouts in USDC.
              </p>
              <p style={{ marginTop: '16px', fontWeight: 800, color: '#1a1106' }}>
                — Daniel, from Bogotá 🇨🇴
              </p>
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="faq" className="px-4 py-12 max-w-[680px] mx-auto">
          <div className="text-center mb-8">
            <Chunky size="clamp(1.6rem, 4.5vw, 2.4rem)">Questions & answers 💬</Chunky>
          </div>

          <div
            style={{
              background: 'linear-gradient(160deg, rgba(123,44,255,0.12), rgba(11,7,20,0.6))',
              borderRadius: '28px',
              padding: '8px',
              border: '1px solid rgba(255,201,60,0.12)',
            }}
          >
            {FAQS.map((item, i) => {
              const isOpen = openFaq === i
              return (
                <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? '1px solid rgba(255,245,220,0.06)' : 'none' }}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    style={{
                      color: isOpen ? '#FFC93C' : '#FFF5DC',
                      fontWeight: 800,
                      fontSize: '0.98rem',
                    }}
                  >
                    <span>{item.q}</span>
                    <span
                      style={{
                        fontSize: '1.4rem',
                        color: isOpen ? '#FFC93C' : 'rgba(255,245,220,0.4)',
                        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition: 'transform 0.35s ease, color 0.2s ease',
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                  </button>
                  <div
                    style={{
                      maxHeight: isOpen ? '400px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 0.35s ease',
                    }}
                  >
                    <p style={{ padding: '0 20px 18px', color: 'rgba(255,245,220,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                      {item.a}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section className="px-4 py-20 text-center relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at center, rgba(255,201,60,0.15), transparent 60%)' }}
          />
          <div className="relative">
            <img
              src="/sabi_applogo.png"
              alt=""
              style={{
                width: '140px',
                height: 'auto',
                margin: '0 auto',
                borderRadius: '24px',
                filter: 'drop-shadow(0 12px 40px rgba(255,201,60,0.4))',
                animation: 'float 3s ease-in-out infinite',
              }}
            />
            <div className="mt-8">
              <Chunky size="clamp(1.8rem, 5vw, 2.6rem)">
                The World Cup starts June 11.
              </Chunky>
            </div>
            <p className="mt-4 max-w-[460px] mx-auto" style={{ color: 'rgba(255,245,220,0.55)' }}>
              48 teams. 104 matches. One champion. Don\u2019t just watch — predict it.
            </p>
            <Link
              href="/app"
              className="inline-block mt-8 transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #7B2CFF, #FF3D6E)',
                color: '#fff',
                fontWeight: 800,
                padding: '18px 42px',
                borderRadius: '16px',
                fontSize: '1.05rem',
                boxShadow: '0 12px 48px rgba(123,44,255,0.6)',
              }}
            >
              Start predicting — free
            </Link>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="px-4 py-10 text-center" style={{ borderTop: '1px solid rgba(255,245,220,0.06)' }}>
          <div className="mb-3">
            <span style={{ fontWeight: 900, fontSize: '1rem' }}>
              <span style={{ color: '#FFC93C' }}>sabi</span>
              <span style={{ color: 'rgba(255,245,220,0.35)' }}>.gg</span>
            </span>
          </div>
          <p style={{ color: 'rgba(255,245,220,0.45)', fontSize: '0.85rem' }}>
            Predict football. Bet on matches. Compete with friends.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4" style={{ fontSize: '0.8rem', color: 'rgba(255,245,220,0.35)' }}>
            <a href="#">Terms</a>
            <span>·</span>
            <a href="#">Privacy</a>
            <span>·</span>
            <a href="https://x.com/sabi_gg">@sabi_gg</a>
          </div>
          <p style={{ color: 'rgba(255,245,220,0.25)', fontSize: '0.72rem', marginTop: '14px' }}>
            © 2026 Sabi. Not affiliated with FIFA.
          </p>
        </footer>
      </div>
    </div>
  )
}
