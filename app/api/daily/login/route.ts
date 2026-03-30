import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// POST /api/daily/login — Record daily login, update streak, award XP
export async function POST() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase.rpc('record_daily_login', {
    p_user_id: session.user.id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Check XP milestones after awarding XP
  const { data: milestones } = await supabase.rpc('check_xp_milestones', {
    p_user_id: session.user.id,
  })

  return NextResponse.json({ login: data, milestones })
}
