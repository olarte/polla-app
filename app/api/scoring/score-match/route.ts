import { NextResponse } from 'next/server'
import { runScoringPipeline } from '@/lib/scoring'

/**
 * POST /api/scoring/score-match
 *
 * Manually trigger scoring for a specific match.
 * Body: { match_id: string }
 *
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { match_id } = await request.json()
    if (!match_id) {
      return NextResponse.json({ error: 'match_id required' }, { status: 400 })
    }

    const result = await runScoringPipeline(match_id)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('Score match error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
