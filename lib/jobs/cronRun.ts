/**
 * Cron-run bookkeeping. Writes to public.cron_runs so the
 * /api/admin/parlay/health endpoint can show last-run + success
 * timestamps without each job having to know about the table.
 */

import { supabaseParlay } from './supabase'

export async function recordCronRun<T>(
  jobName: string,
  work: () => Promise<T>,
): Promise<T> {
  const startedAt = new Date().toISOString()
  const { data: inserted, error: insertErr } = await supabaseParlay
    .from('cron_runs')
    .insert({ job_name: jobName, started_at: startedAt })
    .select('id')
    .single()

  const runId = insertErr ? null : ((inserted as { id: number } | null)?.id ?? null)

  try {
    const result = await work()
    if (runId !== null) {
      await supabaseParlay
        .from('cron_runs')
        .update({
          finished_at: new Date().toISOString(),
          success: true,
          details: (result ?? null) as Record<string, unknown> | null,
        })
        .eq('id', runId)
    }
    return result
  } catch (err) {
    if (runId !== null) {
      await supabaseParlay
        .from('cron_runs')
        .update({
          finished_at: new Date().toISOString(),
          success: false,
          details: {
            error: err instanceof Error ? err.message : String(err),
          },
        })
        .eq('id', runId)
    }
    throw err
  }
}
