import { NextResponse } from 'next/server'
import { scoreBonusPredictions } from '@/lib/scoring'

/**
 * POST /api/scoring/bonus
 *
 * Score bonus predictions at tournament end.
 * Body: { champion, runner_up, third_place, golden_boot, golden_ball, group_winner_A, ... }
 *
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await request.json()

    if (!results.champion) {
      return NextResponse.json(
        { error: 'At least champion must be provided' },
        { status: 400 }
      )
    }

    const data = await scoreBonusPredictions(results)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Bonus scoring error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
