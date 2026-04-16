'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Card from '../../components/Card'
import Label from '../../components/Label'
import TierBadge from '../../components/TierBadge'

type Tier = 'mythic' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'

interface PrizeTier {
  label: string
  position: string
  players: number
  pct: number
  totalAmount: number
  perPlayer: number
}

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
  tiebreaker: number | null
  actualGoals: number | null
  prizeLadder: PrizeTier[]
}

const PRIZE_ICONS = ['🏆', '💎', '⭐', '🥇', '🥈'] as const

// Ordered Bronze → Mythic (left to right) for the distribution bar
const TIER_META: { key: Tier; icon: string; label: string; percentile: string }[] = [
  { key: 'bronze', icon: '🥉', label: 'Bronze', percentile: 'Everyone else' },
  { key: 'silver', icon: '🥈', label: 'Silver', percentile: 'Top 40%' },
  { key: 'gold', icon: '🥇', label: 'Gold', percentile: 'Top 15%' },
  { key: 'platinum', icon: '⭐', label: 'Platinum', percentile: 'Top 5%' },
  { key: 'diamond', icon: '💎', label: 'Diamond', percentile: 'Top 1%' },
  { key: 'mythic', icon: '🏆', label: 'Mythic', percentile: 'Top 0.1%' },
]

const TIER_COLORS: Record<Tier, string> = {
  bronze: 'bg-polla-bronze',
  silver: 'bg-polla-silver',
  gold: 'bg-polla-warning',
  platinum: 'bg-rarity-rare',
  diamond: 'bg-rarity-epic',
  mythic: 'bg-polla-gold',
}

const POLL_INTERVAL = 60_000

// ── Helpers ──

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
  const idx = TIER_META.findIndex(t => t.key === tier)
  if (idx < 0 || idx >= TIER_META.length - 1) return null
  const next = TIER_META[idx + 1]
  return { label: next.label, key: next.key }
}

function fmtNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  return `${Math.floor(diff / 60)}m ago`
}

// ── Animated number hook ──

function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)

  useEffect(() => {
    const from = prev.current
    if (from === target) return
    prev.current = target

    const start = performance.now()
    let raf: number

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return display
}

// ── Pull-to-refresh hook ──

function usePullToRefresh(onRefresh: () => Promise<void>, containerRef: React.RefObject<HTMLDivElement | null>) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const THRESHOLD = 80

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop <= 0) {
        startY.current = e.touches[0].clientY
        setPulling(true)
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!startY.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0) {
        setPullDistance(Math.min(dy * 0.5, 120))
      }
    }

    async function onTouchEnd() {
      if (pullDistance >= THRESHOLD && !refreshing) {
        setRefreshing(true)
        await onRefresh()
        setRefreshing(false)
      }
      setPulling(false)
      setPullDistance(0)
      startY.current = 0
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, pullDistance, refreshing])

  return { pulling, pullDistance, refreshing, threshold: THRESHOLD }
}

// ── Main component ──

export default function GlobalPage() {
  const [data, setData] = useState<GlobalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now())
  const [timeAgoStr, setTimeAgoStr] = useState('just now')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const userTierRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async (isPolling = false) => {
    try {
      if (!isPolling) setError(null)
      const res = await fetch('/api/global')
      if (res.status === 401) {
        setError('auth')
        return
      }
      if (!res.ok) {
        setError('Failed to load global data')
        return
      }
      setData(await res.json())
      setLastUpdated(Date.now())
      setError(null)
    } catch {
      if (!isPolling) setError('Unable to connect. Check your network and try again.')
    } finally {
      if (!isPolling) setLoading(false)
    }
  }, [])

  // Polling
  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(() => fetchData(true), POLL_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

  // Update "X ago" display every 10s
  useEffect(() => {
    const id = setInterval(() => setTimeAgoStr(timeAgo(lastUpdated)), 10_000)
    setTimeAgoStr(timeAgo(lastUpdated))
    return () => clearInterval(id)
  }, [lastUpdated])

  // Pull to refresh
  const { pullDistance, refreshing, threshold } = usePullToRefresh(
    async () => { await fetchData() },
    containerRef
  )

  // Auto-scroll to user's prize tier after first load
  useEffect(() => {
    if (data && userTierRef.current) {
      const timer = setTimeout(() => {
        userTierRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 400)
      return () => clearTimeout(timer)
    }
  // Only on first data load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data])

  // Animated values
  const animPool = useAnimatedNumber(data?.globalPool ?? 0)
  const animGrandPrize = useAnimatedNumber(data?.grandPrize ?? 0)
  const animPoints = useAnimatedNumber(data?.userPoints ?? 0)
  const animPrize = useAnimatedNumber(data?.userPrize ?? 0)

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-5 pb-4">
        <div className="animate-pulse space-y-2">
          <div className="h-6 w-36 rounded bg-white/[0.06]" />
          <div className="h-3 w-24 rounded bg-white/[0.06]" />
        </div>
        <Card>
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-28 rounded bg-white/[0.06]" />
            <div className="h-9 w-40 rounded bg-white/[0.06]" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-10 rounded bg-white/[0.06]" />
              <div className="h-10 rounded bg-white/[0.06]" />
              <div className="h-10 rounded bg-white/[0.06]" />
            </div>
          </div>
        </Card>
        <div className="space-y-1.5 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.02]">
              <div className="w-7 h-6 rounded bg-white/[0.06]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-24 rounded bg-white/[0.06]" />
                <div className="h-3 w-32 rounded bg-white/[0.06]" />
              </div>
              <div className="h-4 w-16 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Auth error ──
  if (error === 'auth') {
    return (
      <div className="px-4 pt-4 pb-4 animate-fade-in">
        <h1 className="text-xl font-bold">Grand Pool</h1>
        <Card className="mt-6 text-center py-8">
          <span className="text-3xl">🔒</span>
          <p className="text-sm font-semibold mt-3">Sign in to view the Grand Pool</p>
          <p className="text-text-40 text-xs mt-1">Connect your MiniPay wallet to see global rankings and prizes.</p>
        </Card>
      </div>
    )
  }

  // ── Generic error ──
  if (error) {
    return (
      <div className="px-4 pt-4 pb-4 animate-fade-in">
        <h1 className="text-xl font-bold">Grand Pool</h1>
        <Card className="mt-6 text-center py-8">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm font-semibold mt-3">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData() }}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-polla-accent/20 text-polla-accent"
          >
            Try Again
          </button>
        </Card>
      </div>
    )
  }

  const pool = data?.globalPool ?? 0
  const totalPlayers = data?.totalPlayers ?? 0
  const userRank = data?.userRank ?? null
  const userTier = (data?.userTier ?? 'bronze') as Tier
  const userPrize = data?.userPrize ?? 0
  const spotsToClimb = data?.spotsToClimb ?? 0
  const matchesPredicted = data?.matchesPredicted ?? 0
  const exactScores = data?.exactScores ?? 0
  const tiebreaker = data?.tiebreaker ?? null
  const actualGoals = data?.actualGoals ?? null
  const prizeLadder = data?.prizeLadder ?? []
  const tierDist = data?.tierDistribution ?? { mythic: 0, diamond: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }

  const userPrizeTierIdx = getUserPrizeTier(userRank)
  const nextTier = getNextTier(userTier)
  const tierTotal = Object.values(tierDist).reduce((a, b) => a + b, 0)

  // ── Empty / pre-tournament state ──
  if (totalPlayers === 0) {
    return (
      <div className="px-4 pt-4 pb-4 space-y-5 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold">Grand Pool</h1>
          <p className="text-text-40 text-xs mt-0.5">Global Rankings</p>
        </div>

        <Card glow className="text-center py-8">
          <span className="text-4xl">🌍</span>
          <p className="text-lg font-bold mt-3">The Grand Pool is building</p>
          <p className="text-text-40 text-xs mt-1 max-w-[260px] mx-auto">
            15% of every pool entry flows here. Join or create a pool to compete for the global prize.
          </p>
        </Card>

        <div>
          <Label>Prize Ladder</Label>
          <Card className="mt-2 !p-0 overflow-hidden">
            {PRIZE_ICONS.map((icon, i) => {
              const tier = prizeLadder[i]
              if (!tier) return null
              return (
                <div
                  key={tier.label}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < PRIZE_ICONS.length - 1 ? 'border-b border-card-border' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{tier.label}</p>
                      <p className="text-text-40 text-[10px]">
                        {tier.position} · {tier.players} player{tier.players > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-text-25 text-[10px]">{tier.pct}% of pool</p>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="px-4 pt-4 space-y-5 pb-4 animate-fade-in relative">
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="absolute left-0 right-0 flex justify-center transition-transform"
          style={{ top: -40 + pullDistance * 0.3, transform: `translateY(${pullDistance > 0 ? pullDistance * 0.3 : 0}px)` }}
        >
          <div className={`w-6 h-6 rounded-full border-2 border-polla-accent border-t-transparent ${
            refreshing || pullDistance >= threshold ? 'animate-spin' : ''
          }`} />
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-bold">Grand Pool</h1>
          <p className="text-text-40 text-xs mt-0.5">Global Rankings</p>
        </div>
        <p className="text-text-25 text-[10px]">Updated {timeAgoStr}</p>
      </div>

      {/* ── Pool Stats Card (glow) ── */}
      <Card glow>
        <Label>Global Prize Pool</Label>
        <p className="num text-3xl text-polla-gold mt-1">
          ${pool > 0 ? fmtNum(animPool) : '—'}
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <Label>Players</Label>
            <p className="num text-sm mt-0.5">{totalPlayers.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <Label>Grand Prize</Label>
            <p className="num text-sm mt-0.5 text-polla-gold">
              ${pool > 0 ? fmtNum(animGrandPrize) : '—'}
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

      {/* ── Your Stats ── */}
      <Card>
        <Label>Your Stats</Label>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div>
            <p className="num text-lg font-bold">{fmtNum(animPoints)}</p>
            <p className="text-text-40 text-[10px]">Points</p>
          </div>
          <div className="text-center">
            <p className="num text-lg font-bold">{matchesPredicted}</p>
            <p className="text-text-40 text-[10px]">Predicted</p>
          </div>
          <div className="text-right">
            <p className="num text-lg font-bold">{exactScores}</p>
            <p className="text-text-40 text-[10px]">Exact Scores</p>
          </div>
        </div>
      </Card>

      {/* ── Prize Ladder ── */}
      <div>
        <Label>Prize Ladder</Label>
        <Card className="mt-2 !p-0 overflow-hidden">
          {prizeLadder.map((tier, i) => {
            const isUserTier = i === userPrizeTierIdx
            const isAboveUser = userPrizeTierIdx === -1 ? true : i <= userPrizeTierIdx
            const icon = PRIZE_ICONS[i] ?? '🏅'

            return (
              <div
                key={tier.label}
                ref={isUserTier ? userTierRef : undefined}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < prizeLadder.length - 1 ? 'border-b border-card-border' : ''
                } ${isUserTier ? 'bg-polla-accent/10 border-l-2 border-l-polla-accent' : ''} ${
                  !isAboveUser && !isUserTier ? 'opacity-40' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${isUserTier ? 'text-polla-accent' : ''}`}>
                      {tier.label}
                      {isUserTier && (
                        <span className="ml-2 text-[10px] font-bold text-polla-accent bg-polla-accent/20 px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-text-40 text-[10px]">
                      {tier.position} · {tier.players} player{tier.players > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="num text-sm text-polla-gold">
                    ${tier.perPlayer > 0 ? fmtNum(tier.perPlayer) : '—'}
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
              <span className="num font-bold text-polla-gold">${userPrize > 0 ? fmtNum(animPrize) : '—'}</span>
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

      {/* ── Player Distribution ── */}
      <div>
        <Label>Player Distribution</Label>

        {/* Stacked bar — Bronze (left) → Mythic (right) */}
        {tierTotal > 0 ? (
          <div className="mt-2 w-full h-4 rounded-full overflow-hidden flex">
            {TIER_META.map(tier => {
              const count = tierDist[tier.key] ?? 0
              const pct = (count / tierTotal) * 100
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

        {/* Breakdown rows — Bronze → Mythic */}
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
