import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'
import { supabaseParlay } from '@/lib/jobs/supabase'

/**
 * POST /api/parlay/record
 *
 * Called by the frontend after placeTicket tx confirms. Inserts the
 * ticket row so the user's picks survive page reloads before the
 * settlement job sees it. The on-chain contract is the source of truth
 * for stakes and payouts; this DB row is a read-side mirror.
 *
 * Idempotent by (parlay_market_id, user_id) — one ticket per user per
 * market, matching the contract's enforcement. Subsequent calls update
 * tx_hash_bet + onchain_ticket_id if missing.
 */
export async function POST(request: Request) {
  const route = createRouteClient()
  const { data: { user } } = await route.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const {
    parlay_market_id,
    stake_usdc,
    pick_q1, pick_q2, pick_q3, pick_q4, pick_q5,
    tx_hash_bet,
    onchain_ticket_id,
  } = body

  if (!parlay_market_id || !stake_usdc ||
      !['A','B'].includes(pick_q1) ||
      !['A','B'].includes(pick_q2) ||
      !['A','B'].includes(pick_q3) ||
      !['A','B'].includes(pick_q4) ||
      !['A','B'].includes(pick_q5)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  // Upsert against (parlay_market_id, user_id) so retry / replay doesn't dupe
  const { data: existing } = await supabaseParlay
    .from('parlay_tickets')
    .select('id, tx_hash_bet, onchain_ticket_id')
    .eq('parlay_market_id', parlay_market_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const patch: Record<string, unknown> = {}
    if (tx_hash_bet && !existing.tx_hash_bet) patch.tx_hash_bet = tx_hash_bet
    if (onchain_ticket_id && !existing.onchain_ticket_id) patch.onchain_ticket_id = onchain_ticket_id
    if (Object.keys(patch).length) {
      await supabaseParlay.from('parlay_tickets').update(patch).eq('id', existing.id)
    }
    return NextResponse.json({ ticket_id: existing.id, reused: true })
  }

  const { data: ticket, error } = await supabaseParlay
    .from('parlay_tickets')
    .insert({
      parlay_market_id,
      user_id: user.id,
      stake_usdc,
      pick_q1, pick_q2, pick_q3, pick_q4, pick_q5,
      tx_hash_bet: tx_hash_bet || null,
      onchain_ticket_id: onchain_ticket_id || null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ticket_id: ticket.id, reused: false })
}
