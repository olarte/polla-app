import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/global/tiebreaker — save tiebreaker_goals for the authenticated user
export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const goals = body.goals

  if (goals === null || goals === undefined) {
    return NextResponse.json({ error: 'goals is required' }, { status: 400 })
  }

  const parsed = Number(goals)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
    return NextResponse.json({ error: 'goals must be an integer between 0 and 999' }, { status: 400 })
  }

  // Upsert into global_leaderboard — the row may not exist yet if
  // the user has no scored predictions, so use upsert.
  const { error } = await supabaseAdmin
    .from('global_leaderboard')
    .upsert(
      { user_id: session.user.id, tiebreaker_goals: parsed },
      { onConflict: 'user_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tiebreaker_goals: parsed })
}

// GET /api/global/tiebreaker — read the user's current tiebreaker value
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabase
    .from('global_leaderboard')
    .select('tiebreaker_goals')
    .eq('user_id', session.user.id)
    .single()

  return NextResponse.json({ tiebreaker_goals: data?.tiebreaker_goals ?? null })
}
