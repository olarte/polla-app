import { NextResponse } from 'next/server'
import { supabaseParlay } from '@/lib/jobs/supabase'

/**
 * GET /api/parlay/[marketId]/estimates
 *
 * Returns current tier multipliers for the market, pulled from the
 * parlay_live_estimates view (migration 021). Frontend polls every 30s
 * while the tab is visible. Stale values are OK — this reinforces the
 * pari-mutuel reality that payout depends on who else is in.
 */
export async function GET(
  _request: Request,
  { params }: { params: { marketId: string } },
) {
  const { data, error } = await supabaseParlay
    .from('parlay_live_estimates')
    .select('*')
    .eq('market_id', params.marketId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({
      market_id: params.marketId,
      gross_pool_usdc: 0,
      net_pool_usdc: 0,
      tier5_multiplier: 0,
      tier4_multiplier: 0,
      tier3_multiplier: 0,
    })
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
