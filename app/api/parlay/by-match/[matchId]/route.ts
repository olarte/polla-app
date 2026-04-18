import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'
import { supabaseParlay } from '@/lib/jobs/supabase'

/**
 * GET /api/parlay/by-match/[matchId]
 *
 * Resolves a Sabi match id (uuid from public.matches.id) to its parlay
 * market bundle: the market row, 5 questions, and (if authenticated)
 * the caller's ticket for this market.
 *
 * The parlay_* tables aren't in database.types.ts yet (migrations 016/017
 * postdate the generated types), so we use the untyped admin client for
 * reads and the typed route client only for auth.getUser().
 */
export async function GET(
  _request: Request,
  { params }: { params: { matchId: string } },
) {
  const route = createRouteClient()
  const { data: { user } } = await route.auth.getUser()

  const { data: market, error } = await supabaseParlay
    .from('parlay_markets')
    .select('*')
    .eq('match_id', params.matchId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!market) {
    return NextResponse.json({ market: null })
  }

  const { data: questions } = await supabaseParlay
    .from('parlay_questions')
    .select('id, slot, question_type, prompt, option_a_label, option_b_label, resolution')
    .eq('parlay_market_id', market.id)
    .order('slot')

  let ticket = null
  if (user) {
    const { data: t } = await supabaseParlay
      .from('parlay_tickets')
      .select('*')
      .eq('parlay_market_id', market.id)
      .eq('user_id', user.id)
      .maybeSingle()
    ticket = t
  }

  return NextResponse.json({ market, questions: questions ?? [], ticket })
}
