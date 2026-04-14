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
  { q: 'What is Sabi?', a: 'Sabi is a skill-based prediction contest for the FIFA World Cup 2026. Predict match scores, compete in pools, and win real money based on your accuracy.' },
  { q: 'Is it free to play?', a: 'Yes! Free pools give you the full experience — predictions and leaderboards. No wallet or deposit needed. Betting on matches requires a connected wallet.' },
  { q: 'How does scoring work?', a: 'Exact score = 10 pts. Winner + goal difference = 5 pts. Winner + one team\u2019s goals right = 3 pts. Winner only = 2 pts. Wrong winner = 0 pts. Every match is worth the same — no stage multipliers.' },
  { q: 'How do bets work?', a: 'Bet USDC on match outcomes — either the result (home/draw/away) or total goals (over/under 2.5). Odds are pari-mutuel: your payout depends on the total pool and how many people picked the same outcome. The fewer people on your side, the higher the payout. A 5% fee is deducted from winnings.' },
  { q: 'How do I claim my winnings?', a: 'After a match finishes and markets are resolved, winning bets show a "Claim" button. Tap it to send your winnings to your wallet. Unclaimed winnings are shown as a banner on the Home and Daily screens. You can also claim from your bet history in Profile.' },
  { q: 'What happens if a match is cancelled?', a: 'If a match is cancelled or postponed, all bets on that match are refunded. You\'ll see a "Refund" button on your bet — tap to claim your original amount back.' },
  { q: 'What are paid pools?', a: 'Paid pools have a fixed entry fee paid via MiniPay. A 5% service fee is deducted, and 10-30% goes to the global prize pool. The remainder is the pool prize.' },
  { q: 'How do pool payouts work?', a: 'Three models are available: Winner Takes All (100% to 1st), Podium Split (60/25/15 to top 3), or Proportional (pro-rata by points). The model is locked once the first prediction is made.' },
  { q: 'What are tiers?', a: 'Tiers are based on your global points ranking. From top to bottom: Mythic (top 0.1%), Diamond (top 1%), Platinum (top 5%), Gold (top 15%), Silver (top 40%), and Bronze (everyone else). Your tier updates as you earn more points.' },
  { q: 'What is the Grand Pool?', a: 'The global prize pool where all paid pool players compete. Prizes are distributed by ranking: Champion (15%), Top 5 (20%), Top 20 (25%), Top 100 (25%), Top 500 (15%). 10% is reserved for stage bonuses.' },
  { q: 'How do I connect my wallet?', a: 'Tap "Connect Wallet" in your Profile. Sabi uses MiniPay (available in Opera Mini) for payments on the Celo network. You need a connected wallet to join paid pools and place bets.' },
  { q: 'How do tiebreakers work?', a: 'If players are tied on points, the tiebreaker is "total goals scored in the tournament" — the player whose prediction is closest to the actual total wins.' },
]

interface BetStats {
  totalBets: number
  wins: number
  losses: number
  pending: number
  totalWagered: number
  totalWon: number
}

function formatUsd(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ProfilePage() {
  const { user: authUser, profile, signOut } = useAuth()
  const [emoji, setEmoji] = useState('⚽')
  const [predictOpen, setPredictOpen] = useState(false)
  const [walletPromptOpen, setWalletPromptOpen] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkEmailMsg, setLinkEmailMsg] = useState('')
  const [linkingEmail, setLinkingEmail] = useState(false)

  // Data
  const [poolSummaries, setPoolSummaries] = useState<{ group: string; completed: number; total: number }[]>([])
  const [betStats, setBetStats] = useState<BetStats>({ totalBets: 0, wins: 0, losses: 0, pending: 0, totalWagered: 0, totalWon: 0 })
  const [leaderboard, setLeaderboard] = useState<{ rank: number | null; tier: string; total_points: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authUser) return
    const supabase = createClient()

    async function loadProfile() {
      const [groupsRes, betsRes, leaderboardRes] = await Promise.all([
        supabase
          .from('group_members')
          .select('group_id, total_points, groups(name)')
          .eq('user_id', authUser!.id),
        fetch('/api/bets/my-bets').then(r => r.ok ? r.json() : { bets: [] }),
        supabase
          .from('global_leaderboard')
          .select('rank, tier, total_points')
          .eq('user_id', authUser!.id)
          .single(),
      ])

      if (groupsRes.data) {
        setPoolSummaries(groupsRes.data.map((gm: any) => ({
          group: gm.groups?.name || 'Pool',
          completed: 0,
          total: 104,
        })))
      }

      // Compute bet stats
      const bets: any[] = betsRes.bets || []
      const wins = bets.filter((b: any) => b.status === 'won')
      const losses = bets.filter((b: any) => b.status === 'lost')
      const pending = bets.filter((b: any) => b.status === 'pending')
      setBetStats({
        totalBets: bets.length,
        wins: wins.length,
        losses: losses.length,
        pending: pending.length,
        totalWagered: bets.reduce((s: number, b: any) => s + Number(b.amount || 0), 0),
        totalWon: wins.reduce((s: number, b: any) => s + Number(b.payout || 0), 0),
      })

      if (leaderboardRes.data) {
        setLeaderboard(leaderboardRes.data)
      }

      setLoading(false)
    }

    loadProfile()
  }, [authUser])

  useEffect(() => {
    if (profile?.avatar_emoji) setEmoji(profile.avatar_emoji)
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
      if (error) setLinkEmailMsg(error.message)
      else { setLinkEmailMsg('Check your email to confirm'); setLinkEmail('') }
    } catch { setLinkEmailMsg('Failed to link email') }
    finally { setLinkingEmail(false) }
  }

  const displayName = profile?.display_name || 'Player'
  const tierName = leaderboard?.tier || 'bronze'
  const validTier = (['mythic', 'diamond', 'platinum', 'gold', 'silver', 'bronze'].includes(tierName)
    ? tierName : 'bronze') as 'mythic' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'
  const netPnl = betStats.totalWon - betStats.totalWagered
  const winRate = betStats.totalBets > 0 ? Math.round((betStats.wins / (betStats.wins + betStats.losses || 1)) * 100) : 0

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-5 pb-8">
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-4 w-12 rounded bg-white/[0.06] animate-pulse" />
          <div className="w-10" />
        </div>
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-14 h-14 rounded-full bg-white/[0.06]" />
          <div className="h-5 w-32 rounded bg-white/[0.06] mt-3" />
          <div className="h-4 w-20 rounded bg-white/[0.06] mt-2" />
        </div>
        <Card><div className="animate-pulse space-y-3"><div className="h-3 w-16 rounded bg-white/[0.06]" /><div className="h-8 w-full rounded bg-white/[0.06]" /></div></Card>
        <Card><div className="animate-pulse grid grid-cols-3 gap-3"><div className="h-12 rounded bg-white/[0.06]" /><div className="h-12 rounded bg-white/[0.06]" /><div className="h-12 rounded bg-white/[0.06]" /></div></Card>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 space-y-5 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/app" className="text-text-40 text-sm">← Home</Link>
        <h1 className="text-sm font-bold">Profile</h1>
        <div className="w-10" />
      </div>

      {/* Avatar + Info */}
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
          <TierBadge tier={validTier} size="sm" showLabel />
          {leaderboard?.rank && (
            <span className="text-text-40 text-xs">· Rank #{leaderboard.rank}</span>
          )}
        </div>
        <span className="text-text-40 text-xs mt-1">{poolSummaries.length} active pools</span>
      </div>

      {/* Wallet */}
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
              Connect your MiniPay wallet to join paid pools and place bets.
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

      {/* My Stats */}
      <Card>
        <Label>My Stats</Label>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="text-center">
            <p className="num text-lg">{betStats.totalBets}</p>
            <p className="text-text-35 text-[10px]">Bets</p>
          </div>
          <div className="text-center">
            <p className="num text-lg">{winRate}%</p>
            <p className="text-text-35 text-[10px]">Win Rate</p>
          </div>
          <div className="text-center">
            <p className={`num text-lg ${netPnl >= 0 ? 'text-polla-success' : 'text-polla-accent'}`}>
              {netPnl >= 0 ? '+' : ''}{formatUsd(netPnl)}
            </p>
            <p className="text-text-35 text-[10px]">Net P&L</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-card-border">
          <div>
            <p className="text-text-35 text-[10px]">Total Wagered</p>
            <p className="num text-sm mt-0.5">{formatUsd(betStats.totalWagered)}</p>
          </div>
          <div className="text-right">
            <p className="text-text-35 text-[10px]">Total Won</p>
            <p className="num text-sm mt-0.5 text-polla-success">{formatUsd(betStats.totalWon)}</p>
          </div>
        </div>
      </Card>

      {/* My Bets */}
      <MyBets />

      {/* Predict CTA */}
      <Card glow className="text-center">
        <p className="text-sm font-bold mb-1">Predict the World Cup</p>
        <p className="text-text-40 text-xs mb-3">104 matches · Score predictions</p>
        <button
          onClick={() => setPredictOpen(true)}
          className="w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
        >
          Continue Predicting
        </button>
      </Card>

      {/* Predictions Summary */}
      {poolSummaries.length > 0 && (
        <Collapsible title="My Predictions Summary">
          <div className="space-y-2.5">
            {poolSummaries.map((p, i) => (
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

      {/* Link Email */}
      <Collapsible title="Account Recovery">
        <p className="text-text-40 text-[10px] mb-3">
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
      </Collapsible>

      {/* FAQ */}
      <Collapsible title="How Sabi Works">
        <div>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} question={item.q} answer={item.a} />
          ))}
        </div>
      </Collapsible>

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="w-full py-3 text-text-40 text-sm hover:text-text-70 transition-colors"
      >
        Sign Out
      </button>

      <PredictModal isOpen={predictOpen} onClose={() => setPredictOpen(false)} />

      {walletPromptOpen && (
        <ConnectWalletPrompt
          onClose={() => setWalletPromptOpen(false)}
          onConnected={() => setWalletPromptOpen(false)}
        />
      )}
    </div>
  )
}
