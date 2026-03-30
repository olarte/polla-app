import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveMatchMarkets, cancelMatchMarkets } from '@/lib/resolve-markets'

/**
 * POST /api/bets/resolve
 *
 * Manually resolve or cancel markets for a match.
 * Protected by CRON_SECRET (admin only).
 *
 * Body: { match_id: string, action?: 'resolve' | 'cancel' }
 * Default action is 'resolve' — reads scores from matches table.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { match_id, action = 'resolve' } = await request.json()

    if (!match_id) {
      return NextResponse.json({ error: 'match_id required' }, { status: 400 })
    }

    if (action === 'cancel') {
      const result = await cancelMatchMarkets(match_id)
      return NextResponse.json(result)
    }

    // Read match scores
    const { data: match, error } = await supabaseAdmin
      .from('matches')
      .select('id, score_a, score_b, status')
      .eq('id', match_id)
      .single()

    if (error || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.score_a === null || match.score_b === null) {
      return NextResponse.json({ error: 'Match has no scores yet' }, { status: 400 })
    }

    const result = await resolveMatchMarkets(match_id, match.score_a, match.score_b)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Resolve error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
