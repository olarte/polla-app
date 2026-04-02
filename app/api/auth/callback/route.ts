import { createRouteClient } from '@/lib/supabase-route'
import { NextResponse } from 'next/server'

// OAuth callback handler for Google / Apple sign-in
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/app'

  if (code) {
    const supabase = createRouteClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      return NextResponse.redirect(`${origin}${redirect}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
