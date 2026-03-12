'use client'

import { useState } from 'react'
import Card from '../../components/Card'
import Label from '../../components/Label'
import TierBadge from '../../components/TierBadge'
import FaqItem from '../../components/FaqItem'
import Collapsible from '../../components/Collapsible'
import WhatsAppBtn from '../../components/WhatsAppBtn'

const FAQ_ITEMS = [
  { q: 'What is Polla?', a: 'Polla is a skill-based prediction contest for the FIFA World Cup 2026. Predict match scores, compete in groups, and win prizes.' },
  { q: 'Is it free to play?', a: 'Yes! Free groups give you the full experience — predictions, XP, cards, and leaderboards. No wallet needed.' },
  { q: 'How does scoring work?', a: 'Exact score = 5 pts, correct result + goal difference = 3 pts, correct result = 2 pts. Stage multipliers increase points in knockout rounds.' },
  { q: 'What are paid pollas?', a: 'Paid groups have entry fees in USDC/USDT. 5% service fee, remainder goes to the prize pool distributed by the payout model.' },
  { q: 'How do payouts work?', a: 'Three models: Winner Takes All (100% to 1st), Podium Split (60/25/15), or Proportional (pro-rata by points).' },
  { q: 'What is XP?', a: 'XP is earned through daily mini-predictions, polla predictions, streaks, and shares. XP unlocks booster packs with collectible cards.' },
  { q: 'What chains are supported?', a: 'Celo (USDC), Base (USDC), Polygon (USDC), Ethereum (USDC), and Tron (USDT).' },
]

export default function ProfilePage() {
  const [emoji, setEmoji] = useState('⚽')

  return (
    <div className="px-4 pt-4 space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button className="text-text-40 text-sm">← Back</button>
        <h1 className="text-sm font-bold">Profile</h1>
        <div className="w-10" />
      </div>

      {/* Avatar + Balance */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-polla-accent to-polla-accent-dark flex items-center justify-center text-2xl">
            {emoji}
          </div>
          <button className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-polla-bg border border-card-border flex items-center justify-center text-[10px]">
            ✏️
          </button>
        </div>
        <p className="text-lg font-bold mt-3">Player</p>
        <div className="flex items-center gap-2 mt-1">
          <TierBadge tier="bronze" size="sm" showLabel />
        </div>
      </div>

      {/* Balance card */}
      <Card>
        <Label>Balance</Label>
        <p className="num text-2xl mt-1">$0.00</p>
        <div className="flex gap-2 mt-3">
          <button className="flex-1 py-2.5 rounded-xl bg-polla-success/20 border border-polla-success/30 text-polla-success text-xs font-bold active:scale-[0.97] transition-transform">
            Deposit
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-card border border-card-border text-text-40 text-xs font-bold active:scale-[0.97] transition-transform">
            Withdraw
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-polla-gold/20 border border-polla-gold/30 text-polla-gold text-xs font-bold active:scale-[0.97] transition-transform">
            Claim
          </button>
        </div>
      </Card>

      {/* Stats */}
      <Card>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Label>Points</Label>
            <p className="num text-lg mt-0.5">0</p>
          </div>
          <div>
            <Label>XP</Label>
            <p className="num text-lg mt-0.5">0</p>
          </div>
          <div>
            <Label>Cards</Label>
            <p className="num text-lg mt-0.5">0/85</p>
          </div>
        </div>
      </Card>

      {/* Predict CTA */}
      <button className="w-full py-3.5 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform">
        Predict the World Cup
      </button>

      {/* Share */}
      <div className="flex justify-center">
        <WhatsAppBtn
          text="Invite Friends"
          message="Join me on Polla Football! 🐔⚽ https://polla.football"
        />
      </div>

      {/* Activity */}
      <Collapsible title="Recent Activity">
        <Card className="text-center py-6">
          <p className="text-text-40 text-sm">No activity yet</p>
        </Card>
      </Collapsible>

      {/* FAQ */}
      <Collapsible title="FAQ" defaultOpen>
        <div>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </Collapsible>
    </div>
  )
}
