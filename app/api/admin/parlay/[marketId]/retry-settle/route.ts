/**
 * POST /api/admin/parlay/:marketId/retry-settle
 *
 * Reset a manual_review market back to 'locked' and clear the
 * attempt counter so the next settle cron pass picks it up.
 */

import { NextResponse } from 'next/server'
import { supabaseParlay } from '@/lib/jobs/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { marketId: string } },
) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const marketId = params.marketId

  const { data: market, error: fetchErr } = await supabaseParlay
    .from('parlay_markets')
    .select('id, status')
    .eq('id', marketId)
    .maybeSingle()
  if (fetchErr || !market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }
  if (market.status !== 'manual_review') {
    return NextResponse.json(
      { error: `Cannot retry market in status=${market.status}` },
      { status: 409 },
    )
  }

  const { error } = await supabaseParlay
    .from('parlay_markets')
    .update({
      status: 'locked',
      settlement_attempts: 0,
      last_attempt_at: null,
      last_settlement_error: null,
    })
    .eq('id', marketId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ marketId, status: 'locked' })
}
