/**
 * Settlement job: every locked parlay market whose match has finished
 * gets graded, reconciled against tiers, and paid out in a single
 * SabiParlayPools.settleAndPayout call.
 *
 * Per-market flow:
 *   1. Fetch football-data /v4/matches/{id}. If missing > 4h past
 *      kickoff → manual_review.
 *   2. Grade all 5 questions. Any 'void' → mark market 'voided',
 *      flag every ticket refund_pending, return early. (On-chain
 *      refund is deferred to a later session per Session 17
 *      decisions — DB flag only for now.)
 *   3. Otherwise build a 5-bit resolution mask (A=1, B=0).
 *   4. Load all tickets for the market, compute tier (popcount of
 *      matches), and bin into 5/4/3 winners + losers.
 *   5. If any tier > 500 winners → manual_review (batching for
 *      >500 is a later-session feature — `settleAdditionalWinners`).
 *   6. Gas pre-flight: latest gas snapshot must not be 'block'.
 *   7. Call settleAndPayout. Parse PayoutDelivered + OrphanPoolSwept
 *      events. Write back score + payout_usdc + tx_hash_payout per
 *      ticket; flip market to settled.
 *   8. On exception: bump settlement_attempts, record error, respect
 *      exponential backoff. After 5 attempts → manual_review.
 *
 * Idempotent: a settled market is filtered out by status='locked'.
 * Re-running on a market that partially succeeded (tx landed but DB
 * writeback failed) converges — the contract rejects double-settle,
 * so step 7 throws and the reconcile job picks up the slack.
 */

import { supabaseParlay } from './supabase'
import { fetchMatch } from '@/lib/footballdata/client'
import { gradeQuestion } from '@/lib/parlay/questionTypes'
import type { FdMatch, QuestionType, Resolution } from '@/lib/parlay/types'
import {
  settleAndPayout,
  parseSettleReceipt,
} from '@/lib/contracts/parlayOperator'
import { getLatestGasLevel } from '@/lib/jobs/monitorOperatorGas'
import { sendAlert } from '@/lib/alerts'

const MAX_SETTLEMENT_ATTEMPTS = 5
const TIER_WINNER_CEILING = 500
const MANUAL_REVIEW_GRACE_MS = 4 * 60 * 60 * 1000 // 4h

interface QuestionRow {
  id: string
  slot: number
  question_type: QuestionType
}

interface TicketRow {
  id: string
  user_id: string
  stake_usdc: string | number
  onchain_ticket_id: number | string | null
  pick_q1: 'A' | 'B'
  pick_q2: 'A' | 'B'
  pick_q3: 'A' | 'B'
  pick_q4: 'A' | 'B'
  pick_q5: 'A' | 'B'
}

interface MarketRow {
  id: string
  football_data_match_id: number
  onchain_market_id: number | string | null
  locks_at: string
  settlement_attempts: number
  last_attempt_at: string | null
}

export interface SettleJobResult {
  considered: number
  settled: string[]
  voided: string[]
  skipped: Array<{ marketId: string; reason: string }>
  manual_review: Array<{ marketId: string; reason: string }>
  failures: Array<{ marketId: string; error: string }>
}

// ─── helpers ─────────────────────────────────────────────────

function popcount5(x: number): number {
  let c = 0
  for (let i = 0; i < 5; i++) if ((x >> i) & 1) c++
  return c
}

/** 5-bit mask where bit i = 1 if the i-th pick ('A'/'B') is A. */
function picksMask(t: TicketRow): number {
  const bits = [t.pick_q1, t.pick_q2, t.pick_q3, t.pick_q4, t.pick_q5]
  let m = 0
  for (let i = 0; i < 5; i++) if (bits[i] === 'A') m |= 1 << i
  return m
}

/** Exponential backoff: 2^attempts * 5 minutes, capped at 2h. */
function backoffMs(attempts: number): number {
  const base = 5 * 60 * 1000
  return Math.min(2 * 60 * 60 * 1000, base * Math.pow(2, attempts))
}

function shouldAttempt(market: MarketRow, now: number): boolean {
  if (market.settlement_attempts === 0) return true
  if (!market.last_attempt_at) return true
  const since = now - new Date(market.last_attempt_at).getTime()
  return since >= backoffMs(market.settlement_attempts)
}

async function flipManualReview(
  marketId: string,
  reason: string,
): Promise<void> {
  await supabaseParlay
    .from('parlay_markets')
    .update({
      status: 'manual_review',
      last_settlement_error: reason,
      last_attempt_at: new Date().toISOString(),
    })
    .eq('id', marketId)
  await sendAlert({
    level: 'error',
    title: 'Parlay market flagged for manual review',
    details: { marketId, reason },
  })
}

async function voidMarket(
  marketId: string,
  reason: string,
): Promise<void> {
  // Mark market voided and flag every ticket for refund. Refund
  // execution is deferred to a later session (DB-only per Session 17
  // decisions).
  const { error: marketErr } = await supabaseParlay
    .from('parlay_markets')
    .update({
      status: 'voided',
      voided_reason: reason,
      settled_at: new Date().toISOString(),
    })
    .eq('id', marketId)
  if (marketErr) throw new Error(`void market: ${marketErr.message}`)

  const { error: ticketsErr } = await supabaseParlay
    .from('parlay_tickets')
    .update({ refund_pending: true })
    .eq('parlay_market_id', marketId)
  if (ticketsErr) throw new Error(`void tickets: ${ticketsErr.message}`)

  await sendAlert({
    level: 'warn',
    title: 'Parlay market voided — tickets flagged for refund',
    details: { marketId, reason },
  })
}

// ─── per-market settlement ───────────────────────────────────

async function settleOne(
  market: MarketRow,
  summary: SettleJobResult,
): Promise<void> {
  // Fetch FD match detail.
  let match: FdMatch | null = null
  try {
    match = (await fetchMatch(market.football_data_match_id)) as FdMatch | null
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    summary.skipped.push({ marketId: market.id, reason: `fetch: ${msg}` })
    return
  }

  const kickoff = new Date(market.locks_at).getTime() + 5 * 60 * 1000
  const now = Date.now()

  if (!match) {
    if (now - kickoff > MANUAL_REVIEW_GRACE_MS) {
      await flipManualReview(
        market.id,
        'football-data detail unavailable >4h past kickoff',
      )
      summary.manual_review.push({
        marketId: market.id,
        reason: 'fd unavailable',
      })
    } else {
      summary.skipped.push({
        marketId: market.id,
        reason: 'fd detail unavailable (within grace)',
      })
    }
    return
  }

  if (match.status !== 'FINISHED') {
    summary.skipped.push({
      marketId: market.id,
      reason: `fd status=${match.status}`,
    })
    return
  }

  if (market.onchain_market_id === null || market.onchain_market_id === undefined) {
    await flipManualReview(
      market.id,
      'onchain_market_id missing at settlement time',
    )
    summary.manual_review.push({
      marketId: market.id,
      reason: 'no onchain id',
    })
    return
  }

  // Load questions + grade.
  const { data: questions, error: qErr } = await supabaseParlay
    .from('parlay_questions')
    .select('id, slot, question_type')
    .eq('parlay_market_id', market.id)
    .order('slot', { ascending: true })

  if (qErr || !questions || questions.length !== 5) {
    summary.failures.push({
      marketId: market.id,
      error: `questions load: ${qErr?.message ?? 'count != 5'}`,
    })
    return
  }

  const typedQs = questions as QuestionRow[]
  const resolutions: Resolution[] = typedQs.map((q) =>
    gradeQuestion(q.question_type, match as FdMatch),
  )

  if (resolutions.some((r) => r === 'void')) {
    await voidMarket(market.id, `question voided: ${resolutions.join(',')}`)
    summary.voided.push(market.id)
    return
  }

  // Persist per-question resolution for UI + audit trail.
  for (let i = 0; i < 5; i++) {
    await supabaseParlay
      .from('parlay_questions')
      .update({
        resolution: resolutions[i],
        resolved_at: new Date().toISOString(),
        oracle_source: 'football-data.org',
      })
      .eq('id', typedQs[i].id)
  }

  // Build resolution mask — bit i = 1 if slot i+1 resolved to 'A'.
  let resolutionMask = 0
  for (let i = 0; i < 5; i++) {
    if (resolutions[i] === 'A') resolutionMask |= 1 << i
  }
  const invResolution = (~resolutionMask) & 0x1f

  // Load all tickets.
  const { data: tickets, error: tErr } = await supabaseParlay
    .from('parlay_tickets')
    .select(
      'id, user_id, stake_usdc, onchain_ticket_id, pick_q1, pick_q2, pick_q3, pick_q4, pick_q5',
    )
    .eq('parlay_market_id', market.id)

  if (tErr) {
    summary.failures.push({
      marketId: market.id,
      error: `tickets load: ${tErr.message}`,
    })
    return
  }

  const typedTickets = (tickets ?? []) as TicketRow[]
  const winners5: bigint[] = []
  const winners4: bigint[] = []
  const winners3: bigint[] = []
  const ticketScores = new Map<string, number>() // db ticket id → score

  for (const t of typedTickets) {
    // Score = number of picks matching resolution.
    // picks XOR resolution gives bits where they differ; invert to
    // get match bits. Align with contract's _matchCount.
    const matchBits = (picksMask(t) ^ invResolution) & 0x1f
    const score = popcount5(matchBits)
    ticketScores.set(t.id, score)

    if (t.onchain_ticket_id === null || t.onchain_ticket_id === undefined) {
      // Skipped on-chain bucketing — they'll still get DB score;
      // payout_usdc stays null because the contract never knew them.
      continue
    }
    const oid = BigInt(t.onchain_ticket_id as number | string)
    if (score === 5) winners5.push(oid)
    else if (score === 4) winners4.push(oid)
    else if (score === 3) winners3.push(oid)
  }

  if (
    winners5.length > TIER_WINNER_CEILING ||
    winners4.length > TIER_WINNER_CEILING ||
    winners3.length > TIER_WINNER_CEILING
  ) {
    // TODO: add settleAdditionalWinners chunking in a later session
    // if volume actually hits this ceiling. 500+ winners at a single
    // tier implies ~2500+ tickets; above current projections.
    await flipManualReview(
      market.id,
      `tier exceeds ${TIER_WINNER_CEILING}: 5=${winners5.length} 4=${winners4.length} 3=${winners3.length}`,
    )
    summary.manual_review.push({
      marketId: market.id,
      reason: 'tier size exceeds 500',
    })
    return
  }

  // Gas pre-flight — use the latest monitored snapshot.
  const gas = await getLatestGasLevel()
  if (gas === 'block') {
    await sendAlert({
      level: 'error',
      title: 'Parlay settle skipped — operator gas below block threshold',
      details: { marketId: market.id },
    })
    summary.skipped.push({
      marketId: market.id,
      reason: 'operator gas blocked',
    })
    return
  }

  // Mark attempt before the write so we respect backoff even on crash.
  await supabaseParlay
    .from('parlay_markets')
    .update({
      status: 'settling',
      last_attempt_at: new Date().toISOString(),
      settlement_attempts: market.settlement_attempts + 1,
    })
    .eq('id', market.id)

  const onchainId = BigInt(market.onchain_market_id as number | string)

  try {
    const { hash, receipt } = await settleAndPayout(
      onchainId,
      resolutionMask,
      winners5,
      winners4,
      winners3,
    )
    const parsed = parseSettleReceipt(receipt, onchainId)

    // Map payouts by onchain ticket id back to DB rows.
    const payoutByOid = new Map<string, bigint>()
    for (const p of parsed.payouts) {
      payoutByOid.set(p.ticketId.toString(), p.amount)
    }

    for (const t of typedTickets) {
      const score = ticketScores.get(t.id) ?? 0
      const patch: Record<string, unknown> = { score }
      if (
        t.onchain_ticket_id !== null &&
        t.onchain_ticket_id !== undefined
      ) {
        const oid = BigInt(t.onchain_ticket_id as number | string).toString()
        const paid = payoutByOid.get(oid)
        if (paid !== undefined) {
          // USDC is 6 decimals.
          patch.payout_usdc = (Number(paid) / 1_000_000).toFixed(6)
          patch.tx_hash_payout = hash
        } else {
          patch.payout_usdc = '0'
        }
      }
      await supabaseParlay
        .from('parlay_tickets')
        .update(patch)
        .eq('id', t.id)
    }

    await supabaseParlay
      .from('parlay_markets')
      .update({
        status: 'settled',
        settled_at: new Date().toISOString(),
        tx_hash_settle: hash,
        last_settlement_error: null,
      })
      .eq('id', market.id)

    summary.settled.push(market.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const nextAttempts = market.settlement_attempts + 1

    const updates: Record<string, unknown> = {
      status: 'locked',
      last_settlement_error: msg,
    }

    if (nextAttempts >= MAX_SETTLEMENT_ATTEMPTS) {
      updates.status = 'manual_review'
      await sendAlert({
        level: 'error',
        title: 'Parlay settle exhausted retries',
        details: { marketId: market.id, error: msg },
      })
      summary.manual_review.push({ marketId: market.id, reason: msg })
    } else {
      summary.failures.push({ marketId: market.id, error: msg })
    }

    await supabaseParlay
      .from('parlay_markets')
      .update(updates)
      .eq('id', market.id)
  }
}

// ─── entrypoint ───────────────────────────────────────────────

export async function runSettleParlayMarkets(): Promise<SettleJobResult> {
  const summary: SettleJobResult = {
    considered: 0,
    settled: [],
    voided: [],
    skipped: [],
    manual_review: [],
    failures: [],
  }

  const { data: markets, error } = await supabaseParlay
    .from('parlay_markets')
    .select(
      'id, football_data_match_id, onchain_market_id, locks_at, settlement_attempts, last_attempt_at',
    )
    .eq('status', 'locked')

  if (error) {
    throw new Error(`settleParlayMarkets: ${error.message}`)
  }

  const now = Date.now()
  const typed = (markets ?? []) as MarketRow[]
  summary.considered = typed.length

  for (const market of typed) {
    if (!shouldAttempt(market, now)) {
      summary.skipped.push({
        marketId: market.id,
        reason: `backoff: ${market.settlement_attempts} attempts`,
      })
      continue
    }
    try {
      await settleOne(market, summary)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      summary.failures.push({ marketId: market.id, error: msg })
      console.error(`settleOne ${market.id}:`, msg)
    }
  }

  return summary
}
