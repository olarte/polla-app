'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Card from '../../components/Card'
import Label from '../../components/Label'
import TierBadge from '../../components/TierBadge'
import FaqItem from '../../components/FaqItem'
import Collapsible from '../../components/Collapsible'
import PredictModal from '../../components/PredictModal'
import ConnectWalletPrompt from '../../components/ConnectWalletPrompt'
import MyBets from '../../components/MyBets'
import { useAuth } from '../../contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'

const FAQ_ITEMS = [
  { q: 'What is Polla?', a: 'Polla is a skill-based prediction contest for the FIFA World Cup 2026. Predict match scores, compete in groups, and win prizes based on your accuracy.' },
  { q: 'Is it free to play?', a: 'Yes! Free groups give you the full experience — predictions, XP, cards, and leaderboards. No wallet or deposit needed.' },
  { q: 'How does scoring work?', a: 'Exact score = 5 pts, correct result + goal difference = 3 pts, correct result only = 2 pts. Stage multipliers increase points in knockout rounds (1.5x for Round of 32 up to 4x for the Final).' },
  { q: 'What are paid pollas?', a: 'Paid groups have a fixed entry fee paid via MiniPay. A 5% service fee is deducted, and 10-30% goes to the global prize pool. The remainder is the group prize pool.' },
  { q: 'How do payouts work?', a: 'Three models are available: Winner Takes All (100% to 1st), Podium Split (60/25/15 to top 3), or Proportional (pro-rata by points). The model is locked once the first prediction is made.' },
  { q: 'What is XP?', a: 'XP is earned through daily mini-predictions, polla predictions, login streaks, and sharing. XP unlocks booster packs that contain collectible cards.' },
  { q: 'What are booster packs?', a: 'Packs are unlocked at XP milestones (100, 250, 500, 750, 1000, 1500, 2000, 3000 XP). Each pack contains collectible cards of varying rarity. Higher milestones guarantee rarer cards.' },
  { q: 'What are cards?', a: 'There are 85 collectible cards: 48 Common (national jerseys), 20 Rare (football moments), 12 Epic (cultural costumes), and 5 Legendary. Collect them all in your Panini-style album.' },
  { q: 'How do I pay for paid pollas?', a: 'Connect your MiniPay wallet (available in Opera Mini). Payments are made in USDC on the Celo network.' },
  { q: 'What is La Gran Polla?', a: 'The global prize pool where all paid polla players compete. Prizes are distributed by ranking: Champion (15%), Top 5 (20%), Top 20 (25%), Top 100 (25%), Top 500 (15%). 10% is reserved for stage bonuses.' },
  { q: 'How do tiebreakers work?', a: 'If players are tied on points, the tiebreaker is "total goals scored in the tournament" — the player whose prediction is closest to the actual total wins.' },
]

export default function ProfilePage() {
  const { user: authUser, profile, signOut } = useAuth()
  const [emoji, setEmoji] = useState('⚽')
  const [predictOpen, setPredictOpen] = useState(false)
  const [walletPromptOpen, setWalletPromptOpen] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkEmailMsg, setLinkEmailMsg] = useState('')
  const [linkingEmail, setLinkingEmail] = useState(false)

  // Real data state
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authUser) return
    const supabase = createClient()

    async function loadProfile() {
      const { data: groupsData } = await supabase
        .from('group_members')
        .select('group_id, total_points, groups(name)')
        .eq('user_id', authUser!.id)

      if (groupsData) {
        setPredictions(groupsData.map((gm: any) => ({
          group: gm.groups?.name || 'Polla',
          completed: 0,
          total: 104,
        })))
      }

      setLoading(false)
    }

    loadProfile()
  }, [authUser])

  useEffect(() => {
    if (profile?.avatar_emoji) {
      setEmoji(profile.avatar_emoji)
    }
  }, [profile])

  const handleEmojiChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val) {
      const emojis = [...val]
      const newEmoji = emojis[emojis.length - 1]
      setEmoji(newEmoji)
      if (authUser) {
        const supabase = createClient()
        await supabase.from('users').update({ avatar_emoji: newEmoji }).eq('id', authUser.id)
      }
    }
  }

  const handleLinkEmail = async () => {
    if (!linkEmail.trim() || !linkEmail.includes('@')) {
      setLinkEmailMsg('Enter a valid email')
      return
    }
    setLinkingEmail(true)
    setLinkEmailMsg('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email: linkEmail.trim() })
      if (error) {
        setLinkEmailMsg(error.message)
      } else {
        setLinkEmailMsg('Check your email to confirm')
        setLinkEmail('')
      }
    } catch {
      setLinkEmailMsg('Failed to link email')
    } finally {
      setLinkingEmail(false)
    }
  }

  const displayName = profile?.display_name || 'Player'
  const countryFlag = profile?.country_code === 'CO' ? '🇨🇴' : '🌎'
  const tier = 'silver' as const
  const tierPercentile = 50

  if (loading) {
    return (
      <div className="px-4 pt-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-text-40 text-sm">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 space-y-5 pb-8">
      {/* -- Header -- */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-text-40 text-sm">← Back</Link>
        <h1 className="text-sm font-bold">Profile</h1>
        <div className="w-10" />
      </div>

      {/* -- Avatar + Info -- */}
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
        <p className="text-lg font-bold mt-3">{displayName}</p>
        <div className="flex items-center gap-2 mt-1">
          <TierBadge tier={tier} size="sm" showLabel />
          <span className="text-text-40 text-xs">· Top {tierPercentile}%</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm">{countryFlag}</span>
          <span className="text-text-40 text-xs">{predictions.length} active pollas</span>
        </div>
      </div>

      {/* -- Wallet Section -- */}
      <Card>
        <Label>Wallet</Label>
        {profile?.wallet_connected && profile?.wallet_address ? (
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-sm font-mono text-text-70">
                {profile.wallet_address.slice(0, 6)}...{profile.wallet_address.slice(-4)}
              </p>
              <p className="text-[10px] text-text-40 mt-0.5">Celo Network</p>
            </div>
            <span className="text-xs text-polla-success font-semibold px-2.5 py-1 rounded-lg bg-polla-success/10 border border-polla-success/20">
              Connected ✓
            </span>
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-text-40 text-xs mb-3">
              Connect your MiniPay wallet to join paid pollas and claim prizes.
            </p>
            <button
              onClick={() => setWalletPromptOpen(true)}
              className="w-full py-2.5 rounded-xl bg-polla-success/20 border border-polla-success/30 text-polla-success text-xs font-bold active:scale-[0.97] transition-transform"
            >
              Connect Wallet
            </button>
          </div>
        )}
      </Card>

      {/* -- Link Email (account recovery) -- */}
      <Card>
        <Label>Account Recovery</Label>
        <p className="text-text-40 text-[10px] mt-1 mb-3">
          Link an email to recover your account on another device.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="your@email.com"
            value={linkEmail}
            onChange={e => setLinkEmail(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-card-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-polla-accent/50 transition-colors"
          />
          <button
            onClick={handleLinkEmail}
            disabled={linkingEmail || !linkEmail}
            className="px-5 py-2.5 rounded-xl bg-btn-primary text-xs font-bold disabled:opacity-40 active:scale-[0.97] transition-transform"
          >
            {linkingEmail ? '...' : 'Link'}
          </button>
        </div>
        {linkEmailMsg && (
          <p className={`text-xs mt-2 ${linkEmailMsg.includes('Check') ? 'text-polla-success' : 'text-polla-accent'}`}>
            {linkEmailMsg}
          </p>
        )}
      </Card>

      {/* -- XP Stats -- */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Label>Total XP</Label>
            <p className="num text-xl mt-0.5">{profile?.total_xp || 0}</p>
          </div>
          <div className="text-center">
            <Label>Packs</Label>
            <p className="num text-xl mt-0.5">{profile?.packs_earned || 0}</p>
          </div>
          <div className="text-right">
            <Label>Cards</Label>
            <p className="num text-xl mt-0.5">{profile?.cards_collected || 0}/85</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <Label>Streak</Label>
            <p className="num text-lg mt-0.5">{profile?.streak_days || 0} days</p>
          </div>
        </div>
      </Card>

      {/* -- Predict CTA -- */}
      <Card glow className="text-center">
        <p className="text-sm font-bold mb-1">Predict the World Cup</p>
        <p className="text-text-40 text-xs mb-3">
          104 matches · 0% complete
        </p>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all"
            style={{ width: '0%' }}
          />
        </div>
        <button
          onClick={() => setPredictOpen(true)}
          className="w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
        >
          Continue Predicting
        </button>
      </Card>

      {/* -- My Bets -- */}
      <MyBets />

      {/* -- My Predictions Summary -- */}
      {predictions.length > 0 && (
        <Collapsible title="My Predictions Summary">
          <div className="space-y-2.5">
            {predictions.map((p, i) => (
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
      )}

      {/* -- FAQ -- */}
      <Collapsible title="How Polla Works" defaultOpen>
        <div>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </Collapsible>

      {/* -- Sign Out -- */}
      <button
        onClick={signOut}
        className="w-full py-3 text-text-40 text-sm hover:text-text-70 transition-colors"
      >
        Sign Out
      </button>

      {/* -- Predict Modal -- */}
      <PredictModal isOpen={predictOpen} onClose={() => setPredictOpen(false)} />

      {/* -- Connect Wallet Prompt -- */}
      {walletPromptOpen && (
        <ConnectWalletPrompt
          onClose={() => setWalletPromptOpen(false)}
          onConnected={() => setWalletPromptOpen(false)}
        />
      )}
    </div>
  )
}
