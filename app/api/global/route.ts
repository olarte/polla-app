import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'
import { supabaseAdmin } from '@/lib/supabase-admin'

const PRIZE_LADDER = [
  { label: 'Champion', position: '1st', players: 1, pct: 15 },
  { label: 'Top 5', position: '2nd–5th', players: 4, pct: 20 },
  { label: 'Top 20', position: '6th–20th', players: 15, pct: 25 },
  { label: 'Top 100', position: '21st–100th', players: 80, pct: 25 },
  { label: 'Top 500', position: '101st–500th', players: 400, pct: 15 },
] as const

function calcUserPrize(rank: number, pool: number): number {
  if (rank === 1) return pool * 0.15
  if (rank <= 5) return (pool * 0.20) / 4
  if (rank <= 20) return (pool * 0.25) / 15
  if (rank <= 100) return (pool * 0.25) / 80
  if (rank <= 500) return (pool * 0.15) / 400
  return 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// GET /api/global — Global leaderboard stats, prize ladder, tiebreaker, tier distribution
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [userEntryRes, totalRes, tierCountsRes, poolTotalRes, actualGoalsRes] = await Promise.all([
    supabase
      .from('global_leaderboard')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('global_leaderboard')
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin.rpc('get_tier_distribution'),
    // Read from running total instead of summing all groups
    supabase
      .from('global_pool_totals')
      .select('total_amount')
      .eq('id', true)
      .single(),
    // Actual total goals for tiebreaker display
    supabaseAdmin.rpc('get_actual_total_goals'),
  ])

  const totalPlayers = totalRes.count ?? 0

  // Tier distribution
  const tierDistribution: Record<string, number> = {
    mythic: 0, diamond: 0, platinum: 0, gold: 0, silver: 0, bronze: 0,
  }
  if (tierCountsRes.data) {
    for (const row of tierCountsRes.data) {
      if (row.tier in tierDistribution) {
        tierDistribution[row.tier] = Number(row.count)
      }
    }
  }

  // Global pool from running total (fallback to 0)
  const globalPool = Number(poolTotalRes.data?.total_amount ?? 0)

  // Actual tournament goals so far
  const actualGoals = actualGoalsRes.data ?? null

  const userEntry = userEntryRes.data as Record<string, unknown> | null
  const userRank = (userEntry?.rank as number) ?? null
  const userTier = (userEntry?.tier as string) ?? 'bronze'
  const userPoints = (userEntry?.total_points as number) ?? 0
  const tiebreaker = userEntry?.tiebreaker_goals as number | null ?? null

  // Prize at current position
  const userPrize = userRank !== null && totalPlayers > 0 && globalPool > 0
    ? calcUserPrize(userRank, globalPool) : 0

  // Spots to climb for outside-top-500
  const spotsToClimb = userRank !== null && userRank > 500 ? userRank - 500 : 0

  // Full prize ladder with computed amounts
  const prizeLadder = PRIZE_LADDER.map(tier => ({
    ...tier,
    totalAmount: round2(globalPool > 0 ? (globalPool * tier.pct / 100) : 0),
    perPlayer: round2(globalPool > 0 ? (globalPool * tier.pct / 100) / tier.players : 0),
  }))

  return NextResponse.json({
    globalPool: round2(globalPool),
    totalPlayers,
    grandPrize: round2(globalPool * 0.15),
    userRank,
    userTier,
    userPoints,
    userPrize: round2(userPrize),
    spotsToClimb,
    tierDistribution,
    matchesPredicted: (userEntry?.matches_predicted as number) ?? 0,
    exactScores: (userEntry?.exact_scores as number) ?? 0,
    tiebreaker,
    actualGoals,
    prizeLadder,
  })
}
