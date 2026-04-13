import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Public routes — no auth required
  const publicPaths = ['/', '/landing', '/login', '/api/auth', '/api/groups/preview', '/api/cron', '/api/bets', '/api/seed-matches']
  const isPublic = publicPaths.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p)))

  // Allow invite/join preview without auth
  const isInvitePreview = pathname.startsWith('/invite/') || pathname.startsWith('/join/')

  if (isPublic || isInvitePreview) {
    // If authenticated and visiting root landing page, redirect to /app
    if (pathname === '/' && session && req.nextUrl.searchParams.get('stay') !== '1') {
      const appUrl = req.nextUrl.clone()
      appUrl.pathname = '/app'
      return NextResponse.redirect(appUrl)
    }
    return res
  }

  // Redirect unauthenticated users to login
  if (!session) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)',
  ],
}
