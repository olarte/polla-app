/**
 * Reconcile on-chain settlement state against DB.
 *
 * The happy-path settle job writes ticket payouts inline from the tx
 * receipt it submits. Two failure modes leave the DB stale:
 *
 *   a) settleAndPayout landed but the post-tx DB writeback blew up
 *      (network hiccup between write and commit).
 *   b) An earlier cron invocation timed out while waiting for the
 *      receipt, Vercel killed the function, but the tx eventually
 *      mined.
 *
 * For any market with status in ('settling','settled') we check the
 * contract. If the contract says settled=true, we refetch the tx
 * (via tx_hash_settle) and replay PayoutDelivered events against
 * parlay_tickets rows that are missing payout_usdc.
 *
 * Idempotent: the writeback only touches tickets where payout_usdc
 * is null, so replaying produces no diff after convergence.
 */

import { supabaseParlay } from './supabase'
import {
  getMarketOnchain,
  parseSettleReceipt,
  publicClient,
} from '@/lib/contracts/parlayOperator'
import { sendAlert } from '@/lib/alerts'
import type { Hex } from 'viem'

interface MarketRow {
  id: string
  status: 'settling' | 'settled'
  onchain_market_id: number | string | null
  tx_hash_settle: string | null
}

export interface ReconcileResult {
  checked: number
  reconciled: string[]
  discrepancies: Array<{ marketId: string; reason: string }>
}

async function reconcileOne(
  market: MarketRow,
  result: ReconcileResult,
): Promise<void> {
  if (
    market.onchain_market_id === null ||
    market.onchain_market_id === undefined
  ) {
    result.discrepancies.push({
      marketId: market.id,
      reason: 'missing onchain_market_id',
    })
    return
  }

  const onchainId = BigInt(market.onchain_market_id as number | string)
  const onchain = await getMarketOnchain(onchainId)

  if (!onchain.settled) {
    if (market.status === 'settled') {
      result.discrepancies.push({
        marketId: market.id,
        reason: 'DB says settled, chain says open',
      })
      await sendAlert({
        level: 'error',
        title: 'Reconcile: DB-chain drift (db settled, chain open)',
        details: { marketId: market.id },
      })
    }
    return
  }

  // Chain is settled. Do we have a tx hash + all ticket payouts?
  if (!market.tx_hash_settle) {
    result.discrepancies.push({
      marketId: market.id,
      reason: 'chain settled but tx_hash_settle missing',
    })
    await sendAlert({
      level: 'warn',
      title: 'Reconcile: chain settled but no tx hash in DB',
      details: { marketId: market.id, onchainMarketId: onchainId.toString() },
    })
    return
  }

  const { data: unpaid } = await supabaseParlay
    .from('parlay_tickets')
    .select('id, onchain_ticket_id')
    .eq('parlay_market_id', market.id)
    .is('payout_usdc', null)

  if (!unpaid || unpaid.length === 0) {
    return
  }

  // Replay the receipt.
  const receipt = await publicClient.getTransactionReceipt({
    hash: market.tx_hash_settle as Hex,
  })
  const parsed = parseSettleReceipt(receipt, onchainId)
  const payoutByOid = new Map<string, bigint>()
  for (const p of parsed.payouts) {
    payoutByOid.set(p.ticketId.toString(), p.amount)
  }

  let backfilled = 0
  for (const t of unpaid) {
    if (t.onchain_ticket_id === null || t.onchain_ticket_id === undefined) {
      continue
    }
    const oid = BigInt(t.onchain_ticket_id as number | string).toString()
    const amount = payoutByOid.get(oid)
    const patch: Record<string, unknown> =
      amount !== undefined
        ? {
            payout_usdc: (Number(amount) / 1_000_000).toFixed(6),
            tx_hash_payout: market.tx_hash_settle,
          }
        : { payout_usdc: '0' }
    const { error } = await supabaseParlay
      .from('parlay_tickets')
      .update(patch)
      .eq('id', t.id as string)
    if (!error) backfilled++
  }

  if (market.status !== 'settled') {
    await supabaseParlay
      .from('parlay_markets')
      .update({ status: 'settled', settled_at: new Date().toISOString() })
      .eq('id', market.id)
  }

  if (backfilled > 0) {
    result.reconciled.push(market.id)
    await sendAlert({
      level: 'info',
      title: 'Reconcile backfilled payouts',
      details: { marketId: market.id, backfilled },
    })
  }
}

export async function runReconcileParlayEvents(): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    checked: 0,
    reconciled: [],
    discrepancies: [],
  }

  const { data: markets, error } = await supabaseParlay
    .from('parlay_markets')
    .select('id, status, onchain_market_id, tx_hash_settle')
    .in('status', ['settling', 'settled'])

  if (error) throw new Error(`reconcile: ${error.message}`)

  const typed = (markets ?? []) as MarketRow[]
  result.checked = typed.length

  for (const m of typed) {
    try {
      await reconcileOne(m, result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.discrepancies.push({ marketId: m.id, reason: msg })
      console.error(`reconcileOne ${m.id}:`, msg)
    }
  }

  return result
}
