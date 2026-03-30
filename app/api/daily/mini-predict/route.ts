import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// POST /api/daily/mini-predict — Submit mini-predictions for a match
export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { match_id, first_to_score, total_goals, both_score, early_goal, motm } = body

  if (!match_id) {
    return NextResponse.json({ error: 'match_id required' }, { status: 400 })
  }

  // Count filled predictions — need at least 4
  const filled = [first_to_score, total_goals, both_score, early_goal, motm].filter(Boolean).length
  if (filled < 4) {
    return NextResponse.json({ error: 'At least 4 predictions required' }, { status: 400 })
  }

  // Check match exists and hasn't started (lock 60 min before kickoff)
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, kickoff, status')
    .eq('id', match_id)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  const lockTime = new Date(match.kickoff)
  lockTime.setMinutes(lockTime.getMinutes() - 60)

  if (new Date() >= lockTime) {
    return NextResponse.json({ error: 'Predictions locked (60 min before kickoff)' }, { status: 403 })
  }

  if (match.status !== 'scheduled') {
    return NextResponse.json({ error: 'Match already started or completed' }, { status: 403 })
  }

  // Upsert mini prediction
  const { data, error } = await supabase
    .from('mini_predictions')
    .upsert({
      user_id: session.user.id,
      match_id,
      first_to_score: first_to_score || null,
      total_goals: total_goals || null,
      both_score: both_score || null,
      early_goal: early_goal || null,
      motm: motm || null,
    }, { onConflict: 'user_id,match_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ prediction: data })
}

// GET /api/daily/mini-predict?match_id=xxx — Get user's mini prediction for a match
export async function GET(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const matchId = req.nextUrl.searchParams.get('match_id')

  if (matchId) {
    const { data } = await supabase
      .from('mini_predictions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('match_id', matchId)
      .single()

    return NextResponse.json({ prediction: data })
  }

  // Return all today's mini predictions
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const { data } = await supabase
    .from('mini_predictions')
    .select('*, matches!inner(kickoff)')
    .eq('user_id', session.user.id)
    .gte('matches.kickoff', startOfDay)
    .lt('matches.kickoff', endOfDay)

  return NextResponse.json({ predictions: data })
}
