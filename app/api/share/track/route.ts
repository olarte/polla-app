import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// POST /api/share/track — Record that a share happened (analytics only)
export async function POST(req: NextRequest) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // No XP awarded — just acknowledge the share
  return NextResponse.json({ xp_awarded: 0 })
}
