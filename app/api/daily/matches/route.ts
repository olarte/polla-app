import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// GET /api/daily/matches — All World Cup matches ordered by kickoff.
// The Daily page groups client-side by ET calendar date.
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    matches: matches || [],
  })
}
