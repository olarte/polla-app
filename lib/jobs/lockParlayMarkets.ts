/**
 * Flip parlay_markets from 'open' to 'locked' once locks_at is in the
 * past. Pure DB transition — the contract enforces lock via its
 * on-chain locksAt timestamp, so the only purpose here is UI state.
 *
 * Idempotent: the WHERE clause on status='open' means a second run
 * finds nothing to flip.
 */

import { supabaseParlay } from './supabase'

export interface LockJobResult {
  locked: number
  locked_ids: string[]
}

export async function runLockParlayMarkets(): Promise<LockJobResult> {
  const now = new Date().toISOString()

  const { data, error } = await supabaseParlay
    .from('parlay_markets')
    .update({ status: 'locked' })
    .eq('status', 'open')
    .lte('locks_at', now)
    .select('id')

  if (error) {
    throw new Error(`lockParlayMarkets: ${error.message}`)
  }

  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id)
  return { locked: ids.length, locked_ids: ids }
}
