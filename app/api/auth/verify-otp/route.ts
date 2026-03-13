import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code required' }, { status: 400 })
    }

    const cleaned = phone.replace(/[^\d+]/g, '')
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Verify OTP from our store
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('code, expires_at')
      .eq('phone', cleaned)
      .single()

    if (otpError || !otpRecord) {
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

    // Use a deterministic email to create/sign in the user
    const phoneEmail = `${cleaned.replace('+', '')}@phone.polla.football`
    const phonePassword = `polla_phone_${cleaned}`

    // Try to sign in first (existing user)
    const supabase = createRouteClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: phoneEmail,
      password: phonePassword,
    })

    let userId: string

    if (!signInError) {
      // Existing auth user — get ID
      const { data: { session } } = await supabase.auth.getSession()
      userId = session!.user.id
    } else {
      // User doesn't exist — create via admin
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: phoneEmail,
          password: phonePassword,
          email_confirm: true,
          user_metadata: { phone: cleaned },
        })

      if (createError || !newUser.user) {
        console.error('createUser error:', createError)
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
      }

      userId = newUser.user.id

      // Sign in the newly created user
      const { error: newSignInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: phonePassword,
      })

      if (newSignInError) {
        console.error('signIn error:', newSignInError)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
      }
    }

    // Always ensure public.users + balances rows exist (idempotent)
    await supabaseAdmin
      .from('users')
      .upsert(
        { id: userId, phone: cleaned },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    const { data: existingBalance } = await supabaseAdmin
      .from('balances')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!existingBalance) {
      await supabaseAdmin.from('balances').insert({ user_id: userId })
    }

    // Check onboarding status
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
