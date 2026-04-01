import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// GET /api/daily/matches — Get today's matches
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  // Get today's matches
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .gte('kickoff', startOfDay)
    .lt('kickoff', endOfDay)
    .order('kickoff', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    matches: matches || [],
  })
}
