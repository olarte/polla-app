import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

/**
 * GET /api/bets/unclaimed
 *
 * Returns total unclaimed winnings for the current user.
 */
export async function GET() {
  const supabase = createRouteClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Sum unclaimed won bets
  const { data: wonBets } = await supabase
    .from('bets')
    .select('payout')
    .eq('user_id', user.id)
    .eq('status', 'won')
    .eq('claimed', false)

  // Count unclaimed refunds
  const { data: refundBets } = await supabase
    .from('bets')
    .select('amount')
    .eq('user_id', user.id)
    .eq('status', 'refund')
    .eq('claimed', false)

  const unclaimedWinnings = (wonBets || []).reduce((sum, b) => sum + (b.payout || 0), 0)
  const unclaimedRefunds = (refundBets || []).reduce((sum, b) => sum + b.amount, 0)
  const total = unclaimedWinnings + unclaimedRefunds
  const count = (wonBets?.length || 0) + (refundBets?.length || 0)

  return NextResponse.json({
    unclaimed_winnings: unclaimedWinnings,
    unclaimed_refunds: unclaimedRefunds,
    total,
    count,
  })
}
