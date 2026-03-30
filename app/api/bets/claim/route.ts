import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

/**
 * POST /api/bets/claim
 *
 * Records a successful on-chain claim in the DB.
 * Called after the user's claim() transaction succeeds on-chain.
 *
 * Body: { market_id: string, tx_hash?: string }
 */
export async function POST(request: Request) {
  const supabase = createRouteClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { market_id, tx_hash } = await request.json()

  if (!market_id) {
    return NextResponse.json({ error: 'market_id required' }, { status: 400 })
  }

  // Mark all user's bets for this market as claimed
  const { data: bets, error } = await supabase
    .from('bets')
    .update({ claimed: true })
    .eq('user_id', user.id)
    .eq('market_id', market_id)
    .in('status', ['won', 'refund'])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ claimed: bets?.length ?? 0 })
}
