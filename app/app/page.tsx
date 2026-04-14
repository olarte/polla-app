'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Card from '../components/Card'
import Label from '../components/Label'
import TierBadge from '../components/TierBadge'
import WhatsAppBtn from '../components/WhatsAppBtn'
import PredictModal from '../components/PredictModal'
import { useAuth } from '../contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GroupWithMembership {
  id: string
  name: string
  emoji: string
  is_paid: boolean
  entry_fee: number
  member_count: number
  pool_amount: number
}

interface LeaderboardEntry {
  total_points: number
  rank: number | null
  tier: string
}

interface NextMatch {
  id: string
  team_a_name: string
  team_a_flag: string
  team_b_name: string
  team_b_flag: string
  group_letter: string | null
  stage: string
  kickoff: string
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOTAL_MATCHES = 104

function formatCountdown(target: Date): string | null {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins} min`
}

function formatCurrency(amount: number): string {
  if (Number.isInteger(amount)) {
    return '$' + amount.toLocaleString('en-US')
  }
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [predictOpen, setPredictOpen] = useState(false)
  const [unclaimed, setUnclaimed] = useState<{ total: number; count: number } | null>(null)
  const { user, profile } = useAuth()

  // Data states
  const [groups, setGroups] = useState<GroupWithMembership[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry | null>(null)
  const [predictionCount, setPredictionCount] = useState(0)
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null)
  const [globalPool, setGlobalPool] = useState(0)
  const [loading, setLoading] = useState(true)

  // Derived
  const predictionProgress = useMemo(
    () => (TOTAL_MATCHES > 0 ? Math.round((predictionCount / TOTAL_MATCHES) * 100) : 0),
    [predictionCount]
  )

  const grandPrize = useMemo(() => Math.round(globalPool * 0.15), [globalPool])

  // ---------- Data fetching ----------

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const supabase = createClient()

    async function fetchHomeData() {
      try {
        const [
          groupsRes,
          leaderboardRes,
          predictionsRes,
          nextMatchRes,
          globalPoolRes,
        ] = await Promise.all([
          // 1. User's groups via group_members join
          supabase
            .from('group_members')
            .select('group_id, groups:group_id(id, name, emoji, is_paid, entry_fee, member_count, pool_amount)')
            .eq('user_id', user!.id),

          // 2. Global leaderboard entry
          supabase
            .from('global_leaderboard')
            .select('total_points, rank, tier')
            .eq('user_id', user!.id)
            .single(),

          // 3. Prediction count
          supabase
            .from('predictions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user!.id),

          // 4. Next scheduled match
          supabase
            .from('matches')
            .select('id, team_a_name, team_a_flag, team_b_name, team_b_flag, group_letter, stage, kickoff')
            .eq('status', 'scheduled')
            .order('kickoff', { ascending: true })
            .limit(1)
            .single(),

          // 5. Global pool sum (all paid groups)
          supabase
            .from('groups')
            .select('pool_amount')
            .eq('is_paid', true),
        ])

        // Process groups
        if (groupsRes.data) {
          const parsed: GroupWithMembership[] = groupsRes.data
            .map((row: any) => row.groups)
            .filter(Boolean)
          setGroups(parsed)
        }

        // Process leaderboard
        if (leaderboardRes.data) {
          setLeaderboard(leaderboardRes.data)
        }

        // Process prediction count
        if (predictionsRes.count !== null && predictionsRes.count !== undefined) {
          setPredictionCount(predictionsRes.count)
        }

        // Process next match
        if (nextMatchRes.data) {
          setNextMatch(nextMatchRes.data)
        }

        // Process global pool
        if (globalPoolRes.data) {
          const total = globalPoolRes.data.reduce(
            (sum: number, g: { pool_amount: number }) => sum + (g.pool_amount || 0),
            0
          )
          setGlobalPool(total)
        }
      } catch (err) {
        console.error('Home fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [user])

  // Fetch unclaimed winnings (existing API)
  useEffect(() => {
    fetch('/api/bets/unclaimed')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.total > 0) setUnclaimed({ total: data.total, count: data.count })
      })
      .catch(() => {})
  }, [])

  // Refresh countdown every minute
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!nextMatch) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [nextMatch])

  // Recompute countdown on tick
  const liveCountdown = useMemo(() => {
    if (!nextMatch) return null
    return formatCountdown(new Date(nextMatch.kickoff))
  }, [nextMatch, /* eslint-disable-next-line react-hooks/exhaustive-deps */ setTick])

  // ---------- Tier helpers ----------
  const tierName = leaderboard?.tier || 'bronze'
  const validTier = (['mythic', 'diamond', 'platinum', 'gold', 'silver', 'bronze'].includes(tierName)
    ? tierName
    : 'bronze') as 'mythic' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'

  // ---------- Render ----------

  return (
    <div className="px-4 pt-4 space-y-5 pb-4 animate-fade-in">
      {/* -- Header -- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/?stay=1" prefetch={false} className="text-lg font-black tracking-tight active:scale-95 transition-transform">
            <span style={{ color: '#FFC93C' }}>sabi</span>
            <span className="text-text-35">.gg</span>
          </Link>
        </div>
        <Link href="/app/profile" className="flex items-center gap-2 active:scale-[0.98] transition-transform">
          {profile?.wallet_connected && (
            <div className="w-2 h-2 rounded-full bg-polla-success" />
          )}
          <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-polla-accent to-polla-accent-dark flex items-center justify-center text-lg">
            {profile?.avatar_emoji || '⚽'}
          </div>
        </Link>
      </div>

      {/* -- Unclaimed Winnings Banner -- */}
      {unclaimed && unclaimed.total > 0 && (
        <Link href="/app/profile" className="active:scale-[0.98] transition-transform block">
          <Card glow className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-sm font-bold text-polla-success">
                  {formatCurrency(unclaimed.total)} in unclaimed winnings
                </p>
                <p className="text-text-40 text-[10px]">
                  {unclaimed.count} winning {unclaimed.count === 1 ? 'bet' : 'bets'} — Claim now
                </p>
              </div>
            </div>
            <span className="text-polla-accent text-xs font-semibold">→</span>
          </Card>
        </Link>
      )}

      {/* -- Predict the World Cup CTA -- */}
      {loading ? (
        <Skeleton className="h-[180px]" />
      ) : (
        <Card glow className="text-center active:scale-[0.98] transition-transform">
          <p className="text-lg font-bold mb-1">Predict the World Cup</p>
          <p className="text-text-40 text-sm mb-3">
            104 matches. Predict every score. Climb the leaderboard.
          </p>
          <div className="flex items-center justify-between mb-2">
            <Label>Progress</Label>
            <span className="text-text-70 text-xs num">
              {predictionCount}/{TOTAL_MATCHES} ({predictionProgress}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all"
              style={{ width: `${predictionProgress}%` }}
            />
          </div>
          <button
            onClick={() => setPredictOpen(true)}
            className="mt-4 w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
          >
            {predictionCount === 0 ? 'Start Predicting' : predictionCount >= TOTAL_MATCHES ? '✓ Complete' : 'Continue Predicting'}
          </button>
        </Card>
      )}

      {/* -- Global Pool Card -- */}
      {loading ? (
        <Skeleton className="h-[130px]" />
      ) : (
        <Link href="/app/global" className="block active:scale-[0.98] transition-transform">
          <Card glow>
            <Label>Grand Pool — Global Prize Pool</Label>
            <p className="num text-3xl text-polla-gold mt-1">
              {globalPool > 0 ? formatCurrency(globalPool) : '$0'}
            </p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <TierBadge tier={validTier} size="sm" />
                <span className="text-text-40 text-xs">
                  {validTier.charAt(0).toUpperCase() + validTier.slice(1)}
                  {leaderboard?.rank ? ` · Rank #${leaderboard.rank.toLocaleString('en-US')}` : ''}
                </span>
              </div>
              {leaderboard?.total_points !== undefined && (
                <div className="text-right">
                  <span className="text-text-40 text-xs">Points </span>
                  <span className="num text-sm">{leaderboard.total_points.toLocaleString('en-US')}</span>
                </div>
              )}
            </div>
            {grandPrize > 0 && (
              <div className="mt-2 text-text-40 text-xs">
                Grand Prize: <span className="text-polla-gold num">{formatCurrency(grandPrize)}</span>
              </div>
            )}
          </Card>
        </Link>
      )}

      {/* -- Next Match Countdown -- */}
      {loading ? (
        <Skeleton className="h-[80px]" />
      ) : nextMatch && liveCountdown ? (
        <Card className="active:scale-[0.98] transition-transform">
          <Label>Next Match</Label>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-semibold">
              {nextMatch.team_a_flag} {nextMatch.team_a_name} vs {nextMatch.team_b_name} {nextMatch.team_b_flag}
            </span>
            <span className="text-text-40 text-xs">
              {nextMatch.group_letter ? `Group ${nextMatch.group_letter}` : nextMatch.stage}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-text-40 text-xs">Starts in</span>
            <span className="num text-lg font-bold">{liveCountdown}</span>
          </div>
        </Card>
      ) : null}

      {/* -- My Pools -- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>My Pools</Label>
          <div className="flex items-center gap-3">
            <Link href="/app/pollas" className="text-text-40 text-xs underline underline-offset-2">
              Join with code
            </Link>
            <Link href="/app/pollas" className="text-polla-accent text-xs font-semibold">
              + Create
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-[64px]" />
            <Skeleton className="h-[64px]" />
            <Skeleton className="h-[64px]" />
          </div>
        ) : groups.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-text-40 text-sm">No pools yet</p>
            <p className="text-text-25 text-xs mt-1">Create or join a pool to compete</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/app/pollas/${group.id}`}
                className="block active:scale-[0.98] transition-transform"
              >
                <Card className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{group.emoji || '⚽'}</span>
                    <div>
                      <p className="text-sm font-semibold">{group.name}</p>
                      <p className="text-text-40 text-xs mt-0.5">
                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'} ·{' '}
                        {group.is_paid ? formatCurrency(group.entry_fee) + ' entry' : 'Free'}
                      </p>
                    </div>
                  </div>
                  <span className="text-text-25 text-sm">→</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* -- Share -- */}
      <div className="flex justify-center">
        <WhatsAppBtn
          text="Invite Friends"
          message="Join me on Sabi! Predict the World Cup 2026 ⚽🏆 https://sabi.gg"
        />
      </div>

      {/* -- Predict Modal -- */}
      <PredictModal isOpen={predictOpen} onClose={() => setPredictOpen(false)} />
    </div>
  )
}
