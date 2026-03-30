import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

export async function POST(request: Request) {
  const supabase = createRouteClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { match_id, market_type, market_id, outcome, amount, tx_hash } = body

  if (!match_id || !market_type || !market_id || outcome === undefined || !amount) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Insert bet record
  const { data: bet, error } = await supabase
    .from('bets')
    .insert({
      user_id: user.id,
      match_id,
      market_type,
      market_id,
      outcome,
      amount,
      tx_hash: tx_hash || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Award XP for placing a bet (2 XP)
  await supabase.rpc('increment_xp', { p_user_id: user.id, p_amount: 2 })

  // Record XP event
  await supabase.from('xp_events').insert({
    user_id: user.id,
    event_type: 'bet_placed',
    xp_amount: 2,
    reference_id: match_id,
  })

  return NextResponse.json({ bet })
}
