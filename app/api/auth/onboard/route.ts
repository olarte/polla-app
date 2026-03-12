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

    // Update profile via admin (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        display_name: display_name.trim(),
        avatar_emoji: avatar_emoji || '⚽',
        country_code: country_code || 'CO',
        onboarding_completed: true,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('onboard update error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Create Blockradar wallets in background
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('is_minipay_user, wallet_celo')
      .eq('id', userId)
      .single()

    if (!user?.is_minipay_user && !user?.wallet_celo) {
      // Fire and forget — don't block onboarding
      fetch(`${request.headers.get('origin') || ''}/api/auth/create-wallet`, {
        method: 'POST',
        headers: { cookie: request.headers.get('cookie') || '' },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('onboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
