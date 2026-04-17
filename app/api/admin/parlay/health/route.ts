/**
 * GET /api/admin/parlay/health
 *
 * Summary of the parlay settlement pipeline:
 *   - last-run + success per cron job
 *   - current operator gas balance & classification
 *   - count of markets needing manual review
 */

import { NextResponse } from 'next/server'
import { supabaseParlay } from '@/lib/jobs/supabase'
import {
  classifyBalance,
  getOperatorBalance,
} from '@/lib/contracts/parlayOperator'

export const dynamic = 'force-dynamic'

const JOB_NAMES = [
  'parlay.create',
  'parlay.lock',
  'parlay.settle',
  'parlay.reconcile',
  'parlay.monitor-gas',
] as const

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Last-run per job (one query per job is simpler than a distinct-on).
  const jobs: Record<
    string,
    {
      started_at: string | null
      finished_at: string | null
      success: boolean | null
    }
  > = {}
  for (const name of JOB_NAMES) {
    const { data } = await supabaseParlay
      .from('cron_runs')
      .select('started_at, finished_at, success')
      .eq('job_name', name)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    jobs[name] = {
      started_at: (data?.started_at as string) ?? null,
      finished_at: (data?.finished_at as string) ?? null,
      success:
        data?.success === undefined ? null : (data.success as boolean | null),
    }
  }

  // Operator gas — live read, not the cached metric, so the dashboard
  // never shows stale numbers.
  let gas: { balance_wei: string; alert_level: string } | { error: string }
  try {
    const bal = await getOperatorBalance()
    gas = {
      balance_wei: bal.toString(),
      alert_level: classifyBalance(bal),
    }
  } catch (err) {
    gas = { error: err instanceof Error ? err.message : String(err) }
  }

  const { count: manualReviewCount } = await supabaseParlay
    .from('parlay_markets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'manual_review')

  const { count: voidedCount } = await supabaseParlay
    .from('parlay_markets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'voided')

  return NextResponse.json({
    jobs,
    operator_gas: gas,
    markets: {
      manual_review: manualReviewCount ?? 0,
      voided: voidedCount ?? 0,
    },
  })
}
