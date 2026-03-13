import { NextResponse } from 'next/server'

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

    // Deterministic credentials for this phone number
    const phoneEmail = `${cleaned.replace('+', '')}@phone.polla.football`
    const phonePassword = `polla_phone_${cleaned}`

    let userId: string
    let isNewUser = false

    // Try to create auth user — if already exists, look up by phone
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: phoneEmail,
        password: phonePassword,
        email_confirm: true,
        user_metadata: { phone: cleaned },
      })

    if (!createError && newUser.user) {
      userId = newUser.user.id
      isNewUser = true
    } else {
      // User already exists — look up in our public.users table
      const { data: existingProfile } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', cleaned)
        .single()

      if (existingProfile) {
        userId = existingProfile.id
      } else {
        // Edge case: auth user exists but no public.users row
        // This shouldn't happen, but handle it gracefully
        console.error('createUser error and no public.users row:', createError)
        return NextResponse.json({ error: 'Account issue. Contact support.' }, { status: 500 })
      }
    }

    // Ensure public.users + balances rows exist (idempotent)
    await supabaseAdmin
      .from('users')
      .upsert(
        { id: userId, phone: cleaned },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    if (isNewUser) {
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
