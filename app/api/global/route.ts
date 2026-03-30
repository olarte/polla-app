import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// GET /api/global — Get global leaderboard stats + user position + tier distribution
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  // Fetch user's leaderboard entry + total player count + tier distribution in parallel
  const [userEntryRes, totalRes, tierCountsRes, poolRes] = await Promise.all([
    supabase
      .from('global_leaderboard')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('global_leaderboard')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('global_leaderboard')
      .select('tier'),
    supabase
      .from('groups')
      .select('pool_amount, global_allocation')
      .eq('is_paid', true),
  ])

  const totalPlayers = totalRes.count ?? 0

  // Calculate tier distribution from all entries
  const tiers = tierCountsRes.data ?? []
  const tierDistribution: Record<string, number> = {
    mythic: 0,
    diamond: 0,
    platinum: 0,
    gold: 0,
    silver: 0,
    bronze: 0,
  }
  for (const entry of tiers) {
    if (entry.tier in tierDistribution) {
      tierDistribution[entry.tier]++
    }
  }

  // Calculate global pool from group contributions
  const groups = poolRes.data ?? []
  const globalPool = groups.reduce((sum, g) => {
    return sum + (Number(g.pool_amount) * (Number(g.global_allocation) / 100))
  }, 0)

  const userEntry = userEntryRes.data
  const userRank = userEntry?.rank ?? null
  const userTier = userEntry?.tier ?? 'bronze'
  const userPoints = userEntry?.total_points ?? 0

  // Calculate prize at current position
  let userPrize = 0
  if (userRank !== null && totalPlayers > 0 && globalPool > 0) {
    if (userRank === 1) userPrize = globalPool * 0.15
    else if (userRank <= 5) userPrize = (globalPool * 0.20) / 4
    else if (userRank <= 20) userPrize = (globalPool * 0.25) / 15
    else if (userRank <= 100) userPrize = (globalPool * 0.25) / 80
    else if (userRank <= 500) userPrize = (globalPool * 0.15) / 400
  }

  // Calculate spots to climb for outside-top-500 users
  let spotsToClimb = 0
  if (userRank !== null && userRank > 500) {
    spotsToClimb = userRank - 500
  }

  return NextResponse.json({
    globalPool: Math.round(globalPool * 100) / 100,
    totalPlayers,
    grandPrize: Math.round(globalPool * 0.15 * 100) / 100,
    userRank,
    userTier,
    userPoints,
    userPrize: Math.round(userPrize * 100) / 100,
    spotsToClimb,
    tierDistribution,
    matchesPredicted: userEntry?.matches_predicted ?? 0,
    exactScores: userEntry?.exact_scores ?? 0,
  })
}
