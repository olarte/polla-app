import { NextResponse } from 'next/server'
import { runCreateParlayMarkets } from '@/lib/jobs/createParlayMarkets'
import { recordCronRun } from '@/lib/jobs/cronRun'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const summary = await recordCronRun(
      'parlay.create',
      runCreateParlayMarkets,
    )
    return NextResponse.json(summary)
  } catch (err) {
    console.error('parlay.create cron:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
