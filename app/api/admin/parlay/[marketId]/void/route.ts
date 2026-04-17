/**
 * POST /api/admin/parlay/:marketId/void
 *
 * Flips a parlay market to 'voided' and marks every ticket
 * refund_pending. No on-chain refund executed (deferred to a later
 * session — the contract has no voidMarket helper yet).
 *
 * Auth: Bearer CRON_SECRET (Sabi has no admin-user middleware yet;
 * reuses the cron pattern until one is built).
 */

import { NextResponse } from 'next/server'
import { supabaseParlay } from '@/lib/jobs/supabase'
import { sendAlert } from '@/lib/alerts'

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
  const body = (await request.json().catch(() => ({}))) as { reason?: string }
  const reason = body.reason ?? 'manual admin void'

  const { data: market, error: fetchErr } = await supabaseParlay
    .from('parlay_markets')
    .select('id, status')
    .eq('id', marketId)
    .maybeSingle()
  if (fetchErr || !market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }
  if (market.status === 'settled') {
    return NextResponse.json(
      { error: 'Cannot void a settled market' },
      { status: 409 },
    )
  }

  const { error: marketErr } = await supabaseParlay
    .from('parlay_markets')
    .update({
      status: 'voided',
      voided_reason: reason,
      settled_at: new Date().toISOString(),
    })
    .eq('id', marketId)
  if (marketErr) {
    return NextResponse.json({ error: marketErr.message }, { status: 500 })
  }

  const { error: ticketsErr } = await supabaseParlay
    .from('parlay_tickets')
    .update({ refund_pending: true })
    .eq('parlay_market_id', marketId)
  if (ticketsErr) {
    return NextResponse.json({ error: ticketsErr.message }, { status: 500 })
  }

  await sendAlert({
    level: 'warn',
    title: 'Admin voided parlay market',
    details: { marketId, reason },
  })

  return NextResponse.json({ marketId, status: 'voided', reason })
}
