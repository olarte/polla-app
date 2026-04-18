import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'
import { supabaseParlay } from '@/lib/jobs/supabase'

interface ParlaySummary {
  status: string
  locks_at: string
  gross_pool_usdc: number
  tier5_multiplier: number
  tier4_multiplier: number
  tier3_multiplier: number
}

/**
 * GET /api/daily/matches
 *
 * All World Cup matches ordered by kickoff, each decorated with its
 * parlay market summary (pool size, lock time, tier multipliers) if
 * one exists. Daily renders each row as a prediction-market-style card.
 *
 * Match data is typed via database.types.ts; parlay data goes through
 * the untyped `supabaseParlay` client because the parlay_* tables
 * postdate the generated types.
 */
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const matchIds = (matches ?? []).map(m => m.id)
  const parlayByMatchId = new Map<string, ParlaySummary>()

  if (matchIds.length > 0) {
    const { data: markets } = await supabaseParlay
      .from('parlay_markets')
      .select('id, match_id, status, locks_at, gross_pool_usdc')
      .in('match_id', matchIds)

    if (markets && markets.length > 0) {
      const marketIds = markets.map((m: { id: string }) => m.id)
      const { data: estimates } = await supabaseParlay
        .from('parlay_live_estimates')
        .select('market_id, tier5_multiplier, tier4_multiplier, tier3_multiplier')
        .in('market_id', marketIds)

      const estMap = new Map<string, { tier5: number; tier4: number; tier3: number }>()
      for (const e of estimates ?? []) {
        estMap.set(e.market_id, {
          tier5: Number(e.tier5_multiplier ?? 0),
          tier4: Number(e.tier4_multiplier ?? 0),
          tier3: Number(e.tier3_multiplier ?? 0),
        })
      }

      for (const m of markets) {
        const est = estMap.get(m.id)
        parlayByMatchId.set(m.match_id, {
          status: m.status,
          locks_at: m.locks_at,
          gross_pool_usdc: Number(m.gross_pool_usdc ?? 0),
          tier5_multiplier: est?.tier5 ?? 0,
          tier4_multiplier: est?.tier4 ?? 0,
          tier3_multiplier: est?.tier3 ?? 0,
        })
      }
    }
  }

  const decorated = (matches ?? []).map(m => ({
    ...m,
    parlay: parlayByMatchId.get(m.id) ?? null,
  }))

  return NextResponse.json({ matches: decorated })
}
