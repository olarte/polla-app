import { NextResponse } from 'next/server'
import { runMonitorOperatorGas } from '@/lib/jobs/monitorOperatorGas'
import { recordCronRun } from '@/lib/jobs/cronRun'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const summary = await recordCronRun(
      'parlay.monitor-gas',
      runMonitorOperatorGas,
    )
    return NextResponse.json(summary)
  } catch (err) {
    console.error('parlay.monitor-gas cron:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
