import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

const SHARE_XP = 10
const MAX_SHARES_PER_DAY = 3

export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { share_type } = await req.json()
  const userId = session.user.id
  const today = new Date().toISOString().split('T')[0]

  // Check daily share limit
  const { count } = await supabase
    .from('xp_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', 'whatsapp_share')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  if ((count || 0) >= MAX_SHARES_PER_DAY) {
    return NextResponse.json({ xp_awarded: 0, reason: 'Daily share limit reached' })
  }

  // Award XP
  const { error: xpError } = await supabase.from('xp_events').insert({
    user_id: userId,
    event_type: 'whatsapp_share',
    xp_amount: SHARE_XP,
    reference_id: share_type,
  })

  if (xpError) {
    return NextResponse.json({ error: 'Failed to track share' }, { status: 500 })
  }

  // Update user total XP
  await supabase
    .from('users')
    .update({ total_xp: undefined as unknown as number }) // handled via raw SQL below
    .eq('id', userId)

  // Use raw increment since Supabase JS doesn't support atomic increment directly
  // The xp_events insert is the source of truth; total_xp is refreshed by cron
  // For now, do a read-then-write
  const { data: user } = await supabase
    .from('users')
    .select('total_xp')
    .eq('id', userId)
    .single()

  if (user) {
    await supabase
      .from('users')
      .update({ total_xp: user.total_xp + SHARE_XP })
      .eq('id', userId)
  }

  return NextResponse.json({ xp_awarded: SHARE_XP })
}
