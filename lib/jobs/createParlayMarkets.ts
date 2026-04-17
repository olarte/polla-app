/**
 * Create parlay markets for any match kicking off in the next 48h.
 *
 * Flow:
 *   1. football-data.org /v4/matches for today → today+2, filtered
 *      by PARLAY_COMPETITION_CODES (default ['WC']).
 *   2. For each match not already in parlay_markets AND present in
 *      our local matches table, deterministically pick 5 question
 *      types via selectQuestions(matchId, history).
 *   3. Insert parlay_markets + 5 parlay_questions rows. If a row
 *      already exists from a previous partial run but onchain_market_id
 *      is null, pick it up and retry the contract call.
 *   4. Call SabiParlayPools.createMarket(onchainId, locksAt).
 *      On success, write tx_hash + onchain_market_id back to the row.
 *      On failure, leave onchain_market_id null; next run retries.
 *
 * API cost per run: one list call.
 */

import { supabaseParlay } from './supabase'
import { fetchMatchesInWindow, type FdMatchListItem } from '@/lib/footballdata/client'
import { mapTeamCode } from '@/lib/football-api'
import {
  QUESTION_TEMPLATES,
} from '@/lib/parlay/questionTypes'
import { selectQuestions } from '@/lib/parlay/questionSelector'
import type { QuestionType } from '@/lib/parlay/types'
import { createParlayMarket } from '@/lib/contracts/parlayOperator'
import { sendAlert } from '@/lib/alerts'

interface CreateJobSummary {
  fetched: number
  inserted: string[]
  onchain_created: string[]
  onchain_failed: Array<{ marketId: string; error: string }>
  skipped: Array<{ fdId: number; reason: string }>
}

function yyyyMmDd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getCompetitionCodes(): string[] {
  const raw = process.env.PARLAY_COMPETITION_CODES
  if (!raw) return ['WC']
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

async function fetchQuestionHistory(limit = 10): Promise<QuestionType[][]> {
  const { data: markets, error } = await supabaseParlay
    .from('parlay_markets')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !markets || markets.length === 0) return []

  const ids = markets.map((m) => m.id as string)
  const { data: questions } = await supabaseParlay
    .from('parlay_questions')
    .select('parlay_market_id, question_type, slot')
    .in('parlay_market_id', ids)

  return markets.map((m) =>
    (questions ?? [])
      .filter((q) => q.parlay_market_id === m.id)
      .sort((a, b) => (a.slot as number) - (b.slot as number))
      .map((q) => q.question_type as QuestionType),
  )
}

async function resolveLocalMatchId(fd: FdMatchListItem): Promise<string | null> {
  const homeCode = mapTeamCode(fd.homeTeam.tla)
  const awayCode = mapTeamCode(fd.awayTeam.tla)
  const kickoffDate = fd.utcDate.slice(0, 10)
  const dayStart = `${kickoffDate}T00:00:00Z`
  const dayEnd = `${kickoffDate}T23:59:59Z`

  const { data, error } = await supabaseParlay
    .from('matches')
    .select('id')
    .eq('team_a_code', homeCode)
    .eq('team_b_code', awayCode)
    .gte('kickoff', dayStart)
    .lte('kickoff', dayEnd)
    .maybeSingle()

  if (error || !data) return null
  return data.id as string
}

async function nextOnchainId(): Promise<bigint> {
  const { data, error } = await supabaseParlay.rpc('next_parlay_onchain_id')
  if (error || data === null || data === undefined) {
    throw new Error(`next_parlay_onchain_id: ${error?.message ?? 'no id'}`)
  }
  return BigInt(data as number | string)
}

/**
 * Insert a market + 5 questions if not already present.
 * Returns { marketId, isNew, onchainId } — isNew=false means the row
 * was there from a prior run (we'll still retry the on-chain call if
 * onchain_market_id is null).
 */
async function upsertMarketWithQuestions(
  fd: FdMatchListItem,
  localMatchId: string,
  history: QuestionType[][],
): Promise<{
  marketId: string
  isNew: boolean
  onchainId: bigint | null
  locksAt: Date
}> {
  const kickoff = new Date(fd.utcDate)
  const locksAt = new Date(kickoff.getTime() - 5 * 60 * 1000)

  const { data: existing } = await supabaseParlay
    .from('parlay_markets')
    .select('id, onchain_market_id, locks_at')
    .eq('football_data_match_id', fd.id)
    .maybeSingle()

  if (existing) {
    return {
      marketId: existing.id as string,
      isNew: false,
      onchainId:
        existing.onchain_market_id === null ||
        existing.onchain_market_id === undefined
          ? null
          : BigInt(existing.onchain_market_id as number | string),
      locksAt: new Date(existing.locks_at as string),
    }
  }

  const { data: market, error: insertErr } = await supabaseParlay
    .from('parlay_markets')
    .insert({
      match_id: localMatchId,
      football_data_match_id: fd.id,
      status: 'open',
      opens_at: new Date().toISOString(),
      locks_at: locksAt.toISOString(),
    })
    .select('id')
    .single()

  if (insertErr || !market) {
    throw new Error(`insert parlay_markets: ${insertErr?.message}`)
  }

  const slots = selectQuestions(localMatchId, history)
  const rows = slots.map((type, i) => {
    const tpl = QUESTION_TEMPLATES[type]
    return {
      parlay_market_id: market.id as string,
      slot: i + 1,
      question_type: type,
      prompt: tpl.prompt,
      option_a_label: tpl.optionA,
      option_b_label: tpl.optionB,
    }
  })

  const { error: qErr } = await supabaseParlay
    .from('parlay_questions')
    .insert(rows)

  if (qErr) {
    await supabaseParlay
      .from('parlay_markets')
      .delete()
      .eq('id', market.id as string)
    throw new Error(`insert parlay_questions: ${qErr.message}`)
  }

  return {
    marketId: market.id as string,
    isNew: true,
    onchainId: null,
    locksAt,
  }
}

export async function runCreateParlayMarkets(): Promise<CreateJobSummary> {
  const summary: CreateJobSummary = {
    fetched: 0,
    inserted: [],
    onchain_created: [],
    onchain_failed: [],
    skipped: [],
  }

  const now = new Date()
  const dateFrom = yyyyMmDd(now)
  const dateTo = yyyyMmDd(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000))

  const matches = await fetchMatchesInWindow(
    dateFrom,
    dateTo,
    getCompetitionCodes(),
  )
  summary.fetched = matches.length

  const history = await fetchQuestionHistory(10)

  for (const fd of matches) {
    const localMatchId = await resolveLocalMatchId(fd)
    if (!localMatchId) {
      summary.skipped.push({
        fdId: fd.id,
        reason: `no local match for ${fd.homeTeam.tla} vs ${fd.awayTeam.tla}`,
      })
      continue
    }

    let row: Awaited<ReturnType<typeof upsertMarketWithQuestions>>
    try {
      row = await upsertMarketWithQuestions(fd, localMatchId, history)
      if (row.isNew) summary.inserted.push(row.marketId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      summary.onchain_failed.push({ marketId: `fd:${fd.id}`, error: msg })
      await sendAlert({
        level: 'error',
        title: 'parlay create: DB insert failed',
        details: { fdId: fd.id, error: msg },
      })
      continue
    }

    // Skip on-chain call if already done.
    if (row.onchainId !== null) continue

    const onchainId = await nextOnchainId()
    const locksAtSec = Math.floor(row.locksAt.getTime() / 1000)

    try {
      const hash = await createParlayMarket(onchainId, locksAtSec)
      const { error: updateErr } = await supabaseParlay
        .from('parlay_markets')
        .update({
          onchain_market_id: onchainId.toString() as unknown as number,
          tx_hash_create: hash,
        })
        .eq('id', row.marketId)
      if (updateErr) {
        summary.onchain_failed.push({
          marketId: row.marketId,
          error: `post-tx update: ${updateErr.message}`,
        })
      } else {
        summary.onchain_created.push(row.marketId)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      summary.onchain_failed.push({ marketId: row.marketId, error: msg })
      console.error(
        `createParlayMarket failed for ${row.marketId}:`,
        msg,
      )
      // Leave onchain_market_id null; next run retries.
    }
  }

  return summary
}
