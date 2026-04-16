'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Card from '../components/Card'
import Label from '../components/Label'
import TierBadge from '../components/TierBadge'
import { useRouter } from 'next/navigation'
import PredictModal from '../components/PredictModal'
import CreatePollaModal from '../components/CreatePollaModal'
import SubmitHoldButton from '../components/SubmitHoldButton'
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

interface DayMatch {
  id: string
  match_number: number
  team_a_name: string
  team_a_code: string
  team_a_flag: string
  team_b_name: string
  team_b_code: string
  team_b_flag: string
  group_letter: string | null
  stage: string
  kickoff: string
  venue: string
  city: string
  status: string
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
}

// ---------------------------------------------------------------------------
// Predict the World Cup CTA card — state-aware
// ---------------------------------------------------------------------------

function PredictCtaCard({
  predictionCount,
  predictionProgress,
  bracketSubmittedAt,
  onOpen,
  onSubmit,
}: {
  predictionCount: number
  predictionProgress: number
  bracketSubmittedAt: string | null
  onOpen: () => void
  onSubmit: () => Promise<void>
}) {
  const isComplete = predictionCount >= TOTAL_MATCHES
  const isSubmitted = !!bracketSubmittedAt

  // State 1: submitted — locked in, view only
  if (isComplete && isSubmitted) {
    const submittedDate = new Date(bracketSubmittedAt)
    const formatted = submittedDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return (
      <Card glow className="text-center">
        <div className="text-3xl mb-2">🔒</div>
        <p className="text-lg font-bold mb-1">Bracket Locked In</p>
        <p className="text-text-40 text-xs mb-4">
          Submitted on {formatted}. No more edits — good luck.
        </p>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-polla-success"
            style={{ width: '100%' }}
          />
        </div>
        <button
          onClick={onOpen}
          className="w-full py-3 rounded-xl border border-card-border bg-card text-sm font-bold text-text-70 active:opacity-70"
        >
          View Bracket
        </button>
      </Card>
    )
  }

  // State 2: complete but not submitted — celebrate + tiebreaker + allow edit + Submit
  if (isComplete && !isSubmitted) {
    return (
      <BracketCompleteCard onOpen={onOpen} onSubmit={onSubmit} />
    )
  }

  // State 3: in-progress (existing behavior)
  return (
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
        onClick={onOpen}
        className="mt-4 w-full py-3 rounded-xl bg-btn-primary text-sm font-bold active:scale-[0.97] transition-transform"
      >
        {predictionCount === 0 ? 'Start Predicting' : 'Continue Predicting'}
      </button>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Join Pool Modal
// ---------------------------------------------------------------------------

function JoinPoolModal({
  isOpen,
  onClose,
  onJoined,
}: {
  isOpen: boolean
  onClose: () => void
  onJoined: (groupId: string) => void
}) {
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  async function handleJoin() {
    if (!code.trim()) return
    setJoining(true)
    setError('')
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.trim(), tx_hash: 'pending' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to join')
        return
      }
      onJoined(data.group_id)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="w-[calc(100%-2rem)] max-w-md rounded-2xl bg-polla-bg border border-card-border p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Join a Pool</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-text-40 text-sm"
          >
            &times;
          </button>
        </div>

        <p className="text-text-40 text-xs mb-4">
          Paste the 6-character invite code shared by the pool creator.
        </p>

        <input
          type="text"
          value={code}
          onChange={e => {
            setCode(e.target.value.toUpperCase())
            setError('')
          }}
          placeholder="INVITE CODE"
          maxLength={6}
          className="w-full h-12 bg-white/[0.03] border border-card-border rounded-xl px-4 text-center text-lg text-white font-bold tracking-[0.3em] placeholder:text-text-25 placeholder:tracking-[0.2em] placeholder:text-sm placeholder:font-normal outline-none focus:border-polla-accent/40 transition-colors uppercase num"
        />

        {error && (
          <p className="text-polla-accent text-xs mt-2">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={joining || code.trim().length < 4}
          className="mt-4 w-full h-12 rounded-xl bg-gradient-to-r from-polla-accent to-polla-accent-dark text-sm font-bold text-white active:opacity-80 disabled:opacity-40 transition-opacity"
        >
          {joining ? 'Joining...' : 'Join Pool'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bracket Complete Card
// ---------------------------------------------------------------------------

function BracketCompleteCard({
  onOpen,
  onSubmit,
}: {
  onOpen: () => void
  onSubmit: () => Promise<void>
}) {
  return (
    <Card glow className="text-center">
      <div className="text-3xl mb-2">🏆</div>
      <p className="text-lg font-bold mb-1">Bracket Complete!</p>
      <p className="text-text-40 text-xs mb-4 leading-snug">
        You&apos;ve predicted all <span className="num text-white font-bold">104</span> matches.
        Edit any prediction before the first match, or lock it in now.
      </p>
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark"
          style={{ width: '100%' }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onOpen}
          className="w-full py-3 rounded-xl border border-card-border bg-card text-sm font-bold text-text-70 active:opacity-70"
        >
          Edit Predictions
        </button>
        <SubmitHoldButton
          onSubmit={onSubmit}
          idleLabel="Hold to Submit"
          holdingLabel="Keep holding..."
          submittingLabel="Locking in..."
        />
        <p className="text-text-25 text-[9px] mt-1">
          Press and hold for 2.5 seconds to lock your bracket in.
        </p>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Upcoming Matches (grouped by day)
// ---------------------------------------------------------------------------

function UpcomingMatches({ matches }: { matches: DayMatch[] }) {
  // Group matches by calendar date in ET (UTC-4 in June)
  // This ensures matches at e.g. 01:00 UTC on June 13 (= 9pm ET June 12)
  // group under June 12, matching the schedule intent.
  const ET_OFFSET = 4 * 60 * 60 * 1000
  const byDay: [string, DayMatch[]][] = []
  const dayMap = new Map<string, DayMatch[]>()

  for (const match of matches) {
    const utc = new Date(match.kickoff).getTime()
    const et = new Date(utc - ET_OFFSET)
    const key = et.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC', // we already shifted to ET
    })
    if (!dayMap.has(key)) {
      dayMap.set(key, [])
      byDay.push([key, dayMap.get(key)!])
    }
    dayMap.get(key)!.push(match)
  }

  return (
    <div className="space-y-5">
      {byDay.map(([dayLabel, dayMatches]) => (
        <div key={dayLabel}>
          <Label>{dayLabel}</Label>
          <div className="space-y-2.5 mt-3">
            {dayMatches.map((match) => {
              const kickoff = new Date(match.kickoff)
              const time = kickoff.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short',
              })
              return (
                <Card key={match.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{match.team_a_flag}</span>
                        <span className="text-sm font-semibold">{match.team_a_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base">{match.team_b_flag}</span>
                        <span className="text-sm font-semibold">{match.team_b_name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-text-70 text-xs font-semibold">{time}</p>
                      <p className="text-text-40 text-[10px] mt-0.5">
                        {match.group_letter ? `Group ${match.group_letter}` : match.stage}
                      </p>
                      <p className="text-text-25 text-[10px] mt-0.5 max-w-[120px] truncate">
                        {match.venue}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOTAL_MATCHES = 104

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
  const router = useRouter()
  const [predictOpen, setPredictOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [unclaimed, setUnclaimed] = useState<{ total: number; count: number } | null>(null)
  const { user, profile, refreshProfile } = useAuth()

  // Data states
  const [groups, setGroups] = useState<GroupWithMembership[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry | null>(null)
  const [predictionCount, setPredictionCount] = useState(0)
  const [globalPool, setGlobalPool] = useState(0)
  const [dayMatches, setDayMatches] = useState<DayMatch[]>([])
  const [loading, setLoading] = useState(true)

  // Hide bottom nav when modals are open
  useEffect(() => {
    if (createOpen || joinOpen) {
      document.documentElement.setAttribute('data-hide-nav', 'true')
    } else {
      document.documentElement.removeAttribute('data-hide-nav')
    }
    return () => document.documentElement.removeAttribute('data-hide-nav')
  }, [createOpen, joinOpen])

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
          poolTotalRes,
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

          // 4. Global pool from running total
          supabase
            .from('global_pool_totals')
            .select('total_amount')
            .eq('id', true)
            .single(),
        ])

        // 5. Upcoming matches: find next match date, then fetch 2 days from it
        const { data: firstMatch } = await supabase
          .from('matches')
          .select('kickoff')
          .gte('kickoff', new Date().toISOString())
          .order('kickoff', { ascending: true })
          .limit(1)
          .single()

        if (firstMatch) {
          // Schedule times are ET (UTC-4 in June). Compute the ET calendar
          // day of the first match, then span 2 full ET days.
          // ET midnight = UTC 04:00, so shift by 4h before taking the date.
          const ET_OFFSET_MS = 4 * 60 * 60 * 1000
          const matchUtc = new Date(firstMatch.kickoff).getTime()
          const matchEt = new Date(matchUtc - ET_OFFSET_MS)
          // Midnight ET of that day = midnight UTC of the shifted date + offset back
          const dayStartUtc = new Date(
            Date.UTC(matchEt.getUTCFullYear(), matchEt.getUTCMonth(), matchEt.getUTCDate()) + ET_OFFSET_MS
          )
          const twoDaysLater = new Date(dayStartUtc.getTime() + 2 * 86400000)

          const { data: upcomingMatches } = await supabase
            .from('matches')
            .select('id, match_number, team_a_name, team_a_code, team_a_flag, team_b_name, team_b_code, team_b_flag, group_letter, stage, kickoff, venue, city, status')
            .gte('kickoff', dayStartUtc.toISOString())
            .lt('kickoff', twoDaysLater.toISOString())
            .order('kickoff', { ascending: true })

          if (upcomingMatches) {
            setDayMatches(upcomingMatches as DayMatch[])
          }
        }

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

        // Process global pool from running total
        if (poolTotalRes.data) {
          setGlobalPool(Number(poolTotalRes.data.total_amount) || 0)
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
        <PredictCtaCard
          predictionCount={predictionCount}
          predictionProgress={predictionProgress}
          bracketSubmittedAt={profile?.bracket_submitted_at ?? null}
          onOpen={() => setPredictOpen(true)}
          onSubmit={async () => {
            if (!user) return
            const supabase = createClient()
            const { error } = await supabase
              .from('users')
              .update({ bracket_submitted_at: new Date().toISOString() })
              .eq('id', user.id)
            if (!error) await refreshProfile()
          }}
        />
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

      {/* -- Create / Join Pool -- */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setCreateOpen(true)}
          className="h-[72px] rounded-xl bg-gradient-to-r from-polla-accent to-polla-accent-dark flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform"
        >
          <span className="text-xl">🐔</span>
          <span className="text-sm font-bold text-white">Create Pool</span>
        </button>
        <button
          onClick={() => setJoinOpen(true)}
          className="h-[72px] rounded-xl border border-card-border bg-card flex flex-col items-center justify-center gap-1 active:scale-[0.97] transition-transform"
        >
          <span className="text-xl">🔗</span>
          <span className="text-sm font-bold text-text-70">Join Pool</span>
        </button>
      </div>

      {/* -- Upcoming Matches (grouped by day) -- */}
      {!loading && dayMatches.length > 0 && (
        <UpcomingMatches matches={dayMatches} />
      )}

      {/* -- Modals -- */}
      <PredictModal isOpen={predictOpen} onClose={() => setPredictOpen(false)} />
      <CreatePollaModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(group) => {
          setCreateOpen(false)
          router.push(`/app/pollas/${group.id}`)
        }}
      />
      <JoinPoolModal
        isOpen={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(groupId) => {
          setJoinOpen(false)
          router.push(`/app/pollas/${groupId}`)
        }}
      />
    </div>
  )
}
