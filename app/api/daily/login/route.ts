import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// POST /api/daily/login — Record daily login
export async function POST() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Update last_login_date (no streak/XP logic)
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('users')
    .update({ last_login_date: today })
    .eq('id', session.user.id)

  return NextResponse.json({ ok: true })
}
