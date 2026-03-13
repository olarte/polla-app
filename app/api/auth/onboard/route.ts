import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

export async function POST(request: Request) {
  try {
    const { display_name, avatar_emoji, country_code } = await request.json()

    if (!display_name?.trim()) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const supabase = createRouteClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = session.user.id
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Upsert profile via admin (bypasses RLS, handles missing rows)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        display_name: display_name.trim(),
        avatar_emoji: avatar_emoji || '⚽',
        country_code: country_code || 'CO',
        onboarding_completed: true,
      }, { onConflict: 'id' })

    if (updateError) {
      console.error('onboard update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('onboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
