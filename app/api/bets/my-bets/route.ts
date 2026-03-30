import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

export async function GET(request: Request) {
  const supabase = createRouteClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: bets, error } = await supabase
    .from('bets')
    .select(`
      id,
      match_id,
      market_type,
      market_id,
      outcome,
      amount,
      status,
      payout,
      claimed,
      created_at,
      matches (
        team_a_name,
        team_a_flag,
        team_b_name,
        team_b_flag,
        kickoff
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formatted = (bets || []).map((bet: any) => ({
    id: bet.id,
    match_id: bet.match_id,
    market_type: bet.market_type,
    market_id: bet.market_id,
    outcome: bet.outcome,
    amount: bet.amount,
    status: bet.status,
    payout: bet.payout,
    claimed: bet.claimed,
    team_a_name: bet.matches?.team_a_name || '',
    team_a_flag: bet.matches?.team_a_flag || '',
    team_b_name: bet.matches?.team_b_name || '',
    team_b_flag: bet.matches?.team_b_flag || '',
    kickoff: bet.matches?.kickoff || '',
  }))

  return NextResponse.json({ bets: formatted })
}
