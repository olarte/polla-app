'use client'

import { useState } from 'react'
import Link from 'next/link'
import Card from '../../components/Card'
import Label from '../../components/Label'
import TierBadge from '../../components/TierBadge'
import FaqItem from '../../components/FaqItem'
import Collapsible from '../../components/Collapsible'

// Mock data
const MOCK_USER = {
  avatar_emoji: '🦁',
  display_name: 'Daniel',
  country_code: 'CO',
  country_flag: '🇨🇴',
  tier: 'silver' as const,
  tier_percentile: 32,
  active_pollas: 2,
  balance_available: 42.50,
  balance_locked: 10.00,
  prizes_available: 0,
  total_xp: 385,
  prediction_progress: 23,
}

const MOCK_WALLETS = [
  { chain: 'Celo', token: 'USDC', color: '#FCFF52', address: '0x7a3b...f92e' },
  { chain: 'Base', token: 'USDC', color: '#0052FF', address: '0x4c1d...a83b' },
  { chain: 'Polygon', token: 'USDC', color: '#8247E5', address: '0x9e2f...c71d' },
  { chain: 'Tron', token: 'USDT', color: '#FF0013', address: 'TXk7j...Qp3R' },
  { chain: 'Ethereum', token: 'USDC', color: '#627EEA', address: '0x1b5a...e04f' },
]

const MOCK_ACTIVITY = [
  { type: 'deposit', desc: 'Deposit (Celo)', amount: '+$25.00', date: 'Mar 10' },
  { type: 'entry', desc: 'Joined Office Polla', amount: '-$10.00', date: 'Mar 10' },
  { type: 'deposit', desc: 'Deposit (Base)', amount: '+$27.50', date: 'Mar 8' },
]

const MOCK_PREDICTIONS = [
  { group: 'Office Polla', completed: 47, total: 104 },
  { group: 'Family Cup', completed: 70, total: 104 },
]

const FAQ_ITEMS = [
  { q: 'What is Polla?', a: 'Polla is a skill-based prediction contest for the FIFA World Cup 2026. Predict match scores, compete in groups, and win prizes based on your accuracy.' },
  { q: 'Is it free to play?', a: 'Yes! Free groups give you the full experience — predictions, XP, cards, and leaderboards. No wallet or deposit needed.' },
  { q: 'How does scoring work?', a: 'Exact score = 5 pts, correct result + goal difference = 3 pts, correct result only = 2 pts. Stage multipliers increase points in knockout rounds (1.5x for Round of 32 up to 4x for the Final).' },
  { q: 'What are paid pollas?', a: 'Paid groups have a fixed entry fee in USDC/USDT (5–500 cUSD). A 5% service fee is deducted, and 10–30% goes to the global prize pool. The remainder is the group prize pool.' },
  { q: 'How do payouts work?', a: 'Three models are available: Winner Takes All (100% to 1st), Podium Split (60/25/15 to top 3), or Proportional (pro-rata by points). The model is locked once the first prediction is made.' },
  { q: 'What is XP?', a: 'XP is earned through daily mini-predictions, polla predictions, login streaks, and sharing. XP unlocks booster packs that contain collectible cards.' },
  { q: 'What are booster packs?', a: 'Packs are unlocked at XP milestones (100, 250, 500, 750, 1000, 1500, 2000, 3000 XP). Each pack contains collectible cards of varying rarity. Higher milestones guarantee rarer cards.' },
  { q: 'What are cards?', a: 'There are 85 collectible cards: 48 Common (national jerseys), 20 Rare (football moments), 12 Epic (cultural costumes), and 5 Legendary. Collect them all in your Panini-style album.' },
  { q: 'What chains are supported?', a: 'Celo (USDC), Base (USDC), Polygon (USDC), Ethereum (USDC), and Tron (USDT). Deposits are auto-detected and swept to your balance.' },
  { q: 'What is La Gran Polla?', a: 'The global prize pool where all paid polla players compete. Prizes are distributed by ranking: Champion (15%), Top 5 (20%), Top 20 (25%), Top 100 (25%), Top 500 (15%). 10% is reserved for stage bonuses.' },
  { q: 'How do tiebreakers work?', a: 'If players are tied on points, the tiebreaker is "total goals scored in the tournament" — the player whose prediction is closest to the actual total wins.' },
]

export default function ProfilePage() {
  const [emoji, setEmoji] = useState(MOCK_USER.avatar_emoji)
  const [walletsOpen, setWalletsOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const user = MOCK_USER

  const handleEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val) {
      // Take the last emoji entered
      const emojis = [...val]
      setEmoji(emojis[emojis.length - 1])
    }
  }

  const copyAddress = (chain: string, address: string) => {
    navigator.clipboard.writeText(address)
    setCopied(chain)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="px-4 pt-4 space-y-5 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-text-40 text-sm">← Back</Link>
        <h1 className="text-sm font-bold">Profile</h1>
        <div className="w-10" />
      </div>

      {/* ── Avatar + Info ── */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <label className="cursor-pointer">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-polla-accent to-polla-accent-dark flex items-center justify-center text-2xl">
              {emoji}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-polla-bg border border-card-border flex items-center justify-center text-[10px]">
              ✏️
            </div>
            <input
              type="text"
              className="sr-only"
              value=""
              onChange={handleEmojiChange}
              aria-label="Choose avatar emoji"
            />
          </label>
        </div>
        <p className="text-lg font-bold mt-3">{user.display_name}</p>
        <div className="flex items-center gap-2 mt-1">
          <TierBadge tier={user.tier} size="sm" showLabel />
          <span className="text-text-40 text-xs">· Top {user.tier_percentile}%</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm">{user.country_flag}</span>
          <span className="text-text-40 text-xs">{user.active_pollas} active pollas</span>
        </div>
      </div>

      {/* ── Balance Card ── */}
      <Card glow>
        <div className="flex items-center justify-between">
          <div>
            <Label>Available</Label>
            <p className="num text-2xl mt-1">${user.balance_available.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <Label>Locked</Label>
            <p className="num text-lg text-text-40 mt-1">${user.balance_locked.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="flex-1 py-2.5 rounded-xl bg-polla-success/20 border border-polla-success/30 text-polla-success text-xs font-bold active:scale-[0.97] transition-transform">
            Add Funds
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-card border border-card-border text-text-40 text-xs font-bold active:scale-[0.97] transition-transform">
            Withdraw
          </button>
        </div>
      </Card>

      {/* ── Deposit Addresses ── */}
      <div className="border-t border-card-border">
        <button
          onClick={() => setWalletsOpen(!walletsOpen)}
          className="w-full flex items-center justify-between py-3 px-1"
        >
          <span className="label">Deposit Addresses</span>
          <span className={`text-text-40 text-xs transition-transform duration-200 ${walletsOpen ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${walletsOpen ? 'max-h-[500px] pb-3' : 'max-h-0'}`}>
          <div className="space-y-2">
            {MOCK_WALLETS.map((w) => (
              <div key={w.chain} className="glass-card px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }} />
                  <div>
                    <p className="text-xs font-semibold">{w.chain}</p>
                    <p className="text-text-40 text-[10px] font-mono">{w.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-25 text-[10px]">{w.token}</span>
                  <button
                    onClick={() => copyAddress(w.chain, w.address)}
                    className="text-text-40 text-xs px-2 py-1 rounded-lg bg-white/[0.04] active:bg-white/[0.08] transition-colors"
                  >
                    {copied === w.chain ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Prizes Card ── */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Label>Prizes Available</Label>
            <p className="num text-xl mt-1">${user.prizes_available.toFixed(2)}</p>
          </div>
          <button
            disabled={user.prizes_available === 0}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-transform ${
              user.prizes_available > 0
                ? 'bg-polla-gold/20 border border-polla-gold/30 text-polla-gold active:scale-[0.97]'
                : 'bg-white/[0.03] border border-card-border text-text-25 cursor-not-allowed'
            }`}
          >
            Claim
          </button>
        </div>
      </Card>

      {/* ── Predict CTA ── */}
      <Card glow className="text-center">
        <p className="text-sm font-bold mb-1">Predict the World Cup</p>
        <p className="text-text-40 text-xs mb-3">
          104 matches · {user.prediction_progress}% complete
        </p>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all"
            style={{ width: `${user.prediction_progress}%` }}
          />
        </div>
        <button className="w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform">
          Continue Predicting
        </button>
      </Card>

      {/* ── Recent Activity ── */}
      <Collapsible title="Recent Activity">
        <div className="space-y-0">
          {MOCK_ACTIVITY.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-card-border last:border-0">
              <div>
                <p className="text-sm">{item.desc}</p>
                <p className="text-text-25 text-[10px] mt-0.5">{item.date}</p>
              </div>
              <span className={`num text-sm ${item.amount.startsWith('+') ? 'text-polla-success' : 'text-text-40'}`}>
                {item.amount}
              </span>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* ── My Predictions Summary ── */}
      <Collapsible title="My Predictions Summary">
        <div className="space-y-2.5">
          {MOCK_PREDICTIONS.map((p, i) => (
            <div key={i} className="glass-card px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">{p.group}</span>
                <span className="num text-xs text-text-40">{p.completed}/{p.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark"
                  style={{ width: `${Math.round((p.completed / p.total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* ── FAQ ── */}
      <Collapsible title="❓ How Polla Works" defaultOpen>
        <div>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </Collapsible>
    </div>
  )
}
