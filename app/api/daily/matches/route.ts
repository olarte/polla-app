import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// GET /api/daily/matches — Get today's matches with user's mini predictions
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  // Get today's matches
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .gte('kickoff', startOfDay)
    .lt('kickoff', endOfDay)
    .order('kickoff', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get user's mini predictions for today's matches
  const matchIds = (matches || []).map(m => m.id)
  let predictions: Record<string, unknown> = {}

  if (matchIds.length > 0) {
    const { data: preds } = await supabase
      .from('mini_predictions')
      .select('*')
      .eq('user_id', session.user.id)
      .in('match_id', matchIds)

    if (preds) {
      predictions = Object.fromEntries(preds.map(p => [p.match_id, p]))
    }
  }

  // Get user XP stats
  const { data: profile } = await supabase
    .from('users')
    .select('total_xp, streak_days, cards_collected, packs_earned')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json({
    matches: matches || [],
    predictions,
    xp: profile,
  })
}
