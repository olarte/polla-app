'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '../../components/Card'
import Label from '../../components/Label'
import TierBadge from '../../components/TierBadge'

type Tier = 'mythic' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'

interface GlobalData {
  globalPool: number
  totalPlayers: number
  grandPrize: number
  userRank: number | null
  userTier: Tier
  userPoints: number
  userPrize: number
  spotsToClimb: number
  tierDistribution: Record<Tier, number>
  matchesPredicted: number
  exactScores: number
}

const PRIZE_TIERS = [
  { icon: '🏆', label: 'Champion', position: '1st', players: 1, pct: 15 },
  { icon: '💎', label: 'Top 5', position: '2nd–5th', players: 4, pct: 20 },
  { icon: '⭐', label: 'Top 20', position: '6th–20th', players: 15, pct: 25 },
  { icon: '🥇', label: 'Top 100', position: '21st–100th', players: 80, pct: 25 },
  { icon: '🥈', label: 'Top 500', position: '101st–500th', players: 400, pct: 15 },
] as const

const TIER_META: { key: Tier; icon: string; label: string; percentile: string }[] = [
  { key: 'mythic', icon: '🏆', label: 'Mythic', percentile: 'Top 0.1%' },
  { key: 'diamond', icon: '💎', label: 'Diamond', percentile: 'Top 1%' },
  { key: 'platinum', icon: '⭐', label: 'Platinum', percentile: 'Top 5%' },
  { key: 'gold', icon: '🥇', label: 'Gold', percentile: 'Top 15%' },
  { key: 'silver', icon: '🥈', label: 'Silver', percentile: 'Top 40%' },
  { key: 'bronze', icon: '🥉', label: 'Bronze', percentile: 'Everyone else' },
]

const STAGE_BONUSES = [
  { stage: 'Group', multiplier: '1.0x', icon: '⚽' },
  { stage: 'Round of 32', multiplier: '1.5x', icon: '🎯' },
  { stage: 'Round of 16', multiplier: '2.0x', icon: '🔥' },
  { stage: 'Quarter-final', multiplier: '2.5x', icon: '💥' },
  { stage: 'Semi-final', multiplier: '3.0x', icon: '⭐' },
  { stage: 'Final', multiplier: '4.0x', icon: '🏆' },
]

const TIER_COLORS: Record<Tier, string> = {
  mythic: 'bg-polla-gold',
  diamond: 'bg-rarity-epic',
  platinum: 'bg-rarity-rare',
  gold: 'bg-polla-warning',
  silver: 'bg-polla-silver',
  bronze: 'bg-polla-bronze',
}

function getUserPrizeTier(rank: number | null): number {
  if (rank === null) return -1
  if (rank === 1) return 0
  if (rank <= 5) return 1
  if (rank <= 20) return 2
  if (rank <= 100) return 3
  if (rank <= 500) return 4
  return -1
}

function getNextTier(tier: Tier): { label: string; key: Tier } | null {
  const order: Tier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'mythic']
  const idx = order.indexOf(tier)
  if (idx >= order.length - 1) return null
  const next = order[idx + 1]
  const meta = TIER_META.find(t => t.key === next)
  return meta ? { label: meta.label, key: next } : null
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function GlobalPage() {
  const [data, setData] = useState<GlobalData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/global')
      if (res.ok) {
        setData(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-4">
        <div className="text-center py-20 text-text-35 text-sm">Loading...</div>
      </div>
    )
  }

  const pool = data?.globalPool ?? 0
  const totalPlayers = data?.totalPlayers ?? 0
  const grandPrize = data?.grandPrize ?? 0
  const userRank = data?.userRank ?? null
  const userTier = (data?.userTier ?? 'bronze') as Tier
  const userPrize = data?.userPrize ?? 0
  const spotsToClimb = data?.spotsToClimb ?? 0
  const tierDist = data?.tierDistribution ?? { mythic: 0, diamond: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }

  const userPrizeTierIdx = getUserPrizeTier(userRank)
  const nextTier = getNextTier(userTier)
  const tierTotal = Object.values(tierDist).reduce((a, b) => a + b, 0)

  return (
    <div className="px-4 pt-4 space-y-5 pb-4">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold">La Gran Polla</h1>
        <p className="text-text-40 text-xs mt-0.5">Global Rankings</p>
      </div>

      {/* ── Pool Stats Card (glow) ── */}
      <Card glow>
        <Label>Global Prize Pool</Label>
        <p className="num text-3xl text-polla-gold mt-1">
          ${pool > 0 ? fmtNum(pool) : '—'}
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <Label>Players</Label>
            <p className="num text-sm mt-0.5">{totalPlayers.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <Label>Grand Prize</Label>
            <p className="num text-sm mt-0.5 text-polla-gold">
              ${grandPrize > 0 ? fmtNum(grandPrize) : '—'}
            </p>
          </div>
          <div className="text-right">
            <Label>Your Rank</Label>
            <p className="num text-sm mt-0.5">
              {userRank !== null ? `#${userRank.toLocaleString()}` : '—'}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Prize Ladder ── */}
      <div>
        <Label>Prize Ladder</Label>
        <Card className="mt-2 !p-0 overflow-hidden">
          {PRIZE_TIERS.map((tier, i) => {
            const isUserTier = i === userPrizeTierIdx
            const isAboveUser = userPrizeTierIdx === -1 ? true : i <= userPrizeTierIdx
            const prizeAmount = pool > 0 ? (pool * tier.pct / 100) / tier.players : 0

            return (
              <div
                key={tier.label}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < PRIZE_TIERS.length - 1 ? 'border-b border-card-border' : ''
                } ${isUserTier ? 'bg-polla-accent/10 border-l-2 border-l-polla-accent' : ''} ${
                  !isAboveUser && !isUserTier ? 'opacity-40' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{tier.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${isUserTier ? 'text-polla-accent' : ''}`}>
                      {tier.label}
                    </p>
                    <p className="text-text-40 text-[10px]">
                      {tier.position} · {tier.players} player{tier.players > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="num text-sm text-polla-gold">
                    ${prizeAmount > 0 ? fmtNum(prizeAmount) : '—'}
                  </p>
                  <p className="text-text-25 text-[10px]">{tier.pct}% of pool</p>
                </div>
              </div>
            )
          })}
        </Card>

        {/* User position callout */}
        {userRank !== null && userRank <= 500 && (
          <Card glow className="mt-2 text-center py-3">
            <p className="text-sm">
              You&apos;re <span className="num font-bold text-polla-accent">#{userRank}</span>
              {' '}&mdash; earning{' '}
              <span className="num font-bold text-polla-gold">${fmtNum(userPrize)}</span>
              {' '}if tournament ended now
            </p>
          </Card>
        )}

        {/* Outside top 500 warning */}
        {spotsToClimb > 0 && (
          <Card className="mt-2">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-polla-warning">Outside Top 500</p>
                <p className="text-text-40 text-xs">
                  Climb <span className="num font-bold">{spotsToClimb.toLocaleString()}</span> spot{spotsToClimb > 1 ? 's' : ''} to enter the prize zone
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ── Stage Bonuses ── */}
      <div>
        <Label>Stage Bonuses</Label>
        <p className="text-text-25 text-[10px] mt-1 mb-2">10% of pool reserved for stage bonuses</p>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
          {STAGE_BONUSES.map((stage, i) => {
            const isActive = i === 0
            return (
              <div
                key={stage.stage}
                className={`flex-shrink-0 w-[100px] rounded-xl p-3 text-center ${
                  isActive
                    ? 'bg-gradient-to-b from-polla-secondary to-polla-secondary-deep border border-polla-accent/30'
                    : 'bg-card border border-card-border opacity-50'
                }`}
              >
                <span className="text-xl block mb-1">{stage.icon}</span>
                <p className="text-[10px] text-text-70 font-semibold leading-tight">{stage.stage}</p>
                <p className={`num text-sm mt-1 ${isActive ? 'text-polla-gold' : 'text-text-40'}`}>
                  {stage.multiplier}
                </p>
                {!isActive && (
                  <p className="text-text-25 text-[8px] mt-0.5">🔒</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Player Distribution ── */}
      <div>
        <Label>Player Distribution</Label>

        {/* Stacked bar */}
        {tierTotal > 0 ? (
          <div className="mt-2 w-full h-4 rounded-full overflow-hidden flex">
            {TIER_META.map((tier) => {
              const count = tierDist[tier.key] ?? 0
              const pct = tierTotal > 0 ? (count / tierTotal) * 100 : 0
              if (pct === 0) return null
              return (
                <div
                  key={tier.key}
                  className={`${TIER_COLORS[tier.key]} h-full`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              )
            })}
          </div>
        ) : (
          <div className="mt-2 w-full h-4 rounded-full bg-white/[0.06]" />
        )}

        {/* Breakdown rows */}
        <Card className="mt-3 !p-0 overflow-hidden">
          {TIER_META.map((tier, i) => {
            const count = tierDist[tier.key] ?? 0
            const pct = tierTotal > 0 ? ((count / tierTotal) * 100).toFixed(1) : '0.0'
            const isUser = tier.key === userTier

            return (
              <div
                key={tier.key}
                className={`flex items-center justify-between px-4 py-2.5 ${
                  i < TIER_META.length - 1 ? 'border-b border-card-border' : ''
                } ${isUser ? 'bg-polla-accent/10' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <TierBadge tier={tier.key} size="sm" />
                  <span className={`text-xs font-semibold ${isUser ? 'text-polla-accent' : 'text-text-70'}`}>
                    {tier.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-text-40 text-xs num">{count.toLocaleString()}</span>
                  <span className="text-text-25 text-[10px] num w-12 text-right">{pct}%</span>
                  {isUser && (
                    <span className="text-polla-accent text-[10px] font-semibold">&larr; You</span>
                  )}
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      {/* ── Your Tier Card ── */}
      <Card glow className="text-center">
        <TierBadge tier={userTier} size="lg" />
        <p className="text-lg font-bold mt-2">
          {TIER_META.find(t => t.key === userTier)?.label}
        </p>
        <p className="text-text-40 text-xs mt-0.5">
          {TIER_META.find(t => t.key === userTier)?.percentile}
        </p>
        {nextTier && (
          <div className="mt-4 pt-3 border-t border-card-border">
            <p className="text-text-40 text-xs">
              Next tier: <TierBadge tier={nextTier.key} size="sm" />{' '}
              <span className="font-semibold text-text-70">{nextTier.label}</span>
            </p>
            {userRank !== null && totalPlayers > 0 && (
              <p className="text-text-25 text-[10px] mt-1">
                Keep predicting to climb the ranks
              </p>
            )}
          </div>
        )}
        {!nextTier && (
          <p className="text-polla-gold text-xs mt-3 font-semibold">
            You&apos;re at the highest tier!
          </p>
        )}
      </Card>
    </div>
  )
}
