import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'
import { supabaseParlay } from '@/lib/jobs/supabase'

type Scope = 'today' | 'week' | 'tournament'

function scopeSince(scope: Scope): string | null {
  const now = new Date()
  if (scope === 'today') {
    const d = new Date(now)
    d.setUTCHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (scope === 'week') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d.toISOString()
  }
  return null // tournament: unbounded
}

/**
 * GET /api/parlay/leaderboard?scope=today|week|tournament
 *
 * Aggregates parlay_leaderboard_scoped within the requested window to
 * produce a ranked top-100 list. Tiebreaker: total stake (spec).
 *
 * Also returns the caller's own rank (if logged in and they have at
 * least one settled ticket in the window), powering the "You're #12 of
 * 347" link on the settlement screen.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const scope = (searchParams.get('scope') || 'today') as Scope
  if (!['today','week','tournament'].includes(scope)) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
  }

  const since = scopeSince(scope)

  let query = supabaseParlay
    .from('parlay_leaderboard_scoped')
    .select('user_id, username, avatar_emoji, score, stake_usdc, payout_usdc, settled_at')
  if (since) query = query.gte('settled_at', since)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate in-memory — per-market row view with one row per ticket.
  // Top 100 cap keeps memory bounded.
  const byUser = new Map<string, {
    user_id: string
    username: string
    avatar_emoji: string
    total_score: number
    total_stake: number
    total_winnings: number
    ticket_count: number
  }>()

  for (const r of data ?? []) {
    const agg = byUser.get(r.user_id) ?? {
      user_id: r.user_id,
      username: r.username ?? 'Player',
      avatar_emoji: r.avatar_emoji ?? '🎯',
      total_score: 0,
      total_stake: 0,
      total_winnings: 0,
      ticket_count: 0,
    }
    agg.total_score += Number(r.score ?? 0)
    agg.total_stake += Number(r.stake_usdc ?? 0)
    agg.total_winnings += Number(r.payout_usdc ?? 0)
    agg.ticket_count += 1
    byUser.set(r.user_id, agg)
  }

  const ranked = Array.from(byUser.values()).sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score
    return b.total_stake - a.total_stake
  })

  const totalPlayers = ranked.length
  const top = ranked.slice(0, 100).map((r, i) => ({ rank: i + 1, ...r }))

  // Caller rank
  const route = createRouteClient()
  const { data: { user } } = await route.auth.getUser()
  let me: { rank: number; total_score: number; total_players: number } | null = null
  if (user) {
    const idx = ranked.findIndex(r => r.user_id === user.id)
    if (idx >= 0) {
      me = { rank: idx + 1, total_score: ranked[idx].total_score, total_players: totalPlayers }
    }
  }

  return NextResponse.json({ scope, entries: top, total_players: totalPlayers, me })
}
