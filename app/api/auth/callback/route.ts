import { createRouteClient } from '@/lib/supabase-route'
import { NextResponse } from 'next/server'

// OAuth callback handler for Google / Apple sign-in
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/'

  if (code) {
    const supabase = createRouteClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const { supabaseAdmin } = await import('@/lib/supabase-admin')
        const { data: profile } = await supabaseAdmin
          .from('users')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single()

        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
