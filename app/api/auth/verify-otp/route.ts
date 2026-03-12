import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })
    }

    const cleaned = phone.replace(/[^\d+]/g, '')

    // Verify OTP from our store
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    const { data: otpRecord } = await supabaseAdmin
      .from('otp_codes')
      .select('code, expires_at')
      .eq('phone', cleaned)
      .single()

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'No verification code found. Request a new one.' },
        { status: 400 }
      )
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabaseAdmin.from('otp_codes').delete().eq('phone', cleaned)
      return NextResponse.json({ error: 'Code expired. Request a new one.' }, { status: 400 })
    }

    if (otpRecord.code !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // OTP valid — clean up
    await supabaseAdmin.from('otp_codes').delete().eq('phone', cleaned)

    // Check if user exists with this phone
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.phone === cleaned)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create new auth user
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          phone: cleaned,
          phone_confirm: true,
        })

      if (createError || !newUser.user) {
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
      }

      userId = newUser.user.id
    }

    // Generate a session — set a password and sign in via route client
    const tempPassword = `polla_${cleaned}_${Date.now()}`

    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    })

    const supabase = createRouteClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      phone: cleaned,
      password: tempPassword,
    })

    if (signInError) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }

    // Check if user needs onboarding
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('onboarding_completed')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      success: true,
      needsOnboarding: !profile?.onboarding_completed,
      user: { id: userId, phone: cleaned },
    })
  } catch (error) {
    console.error('verify-otp error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
