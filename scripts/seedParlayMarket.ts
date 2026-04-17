/**
 * Sabi — Seed a parlay market from a football-data.org fixture.
 *
 * Usage:
 *   tsx scripts/seedParlayMarket.ts <football-data-match-id>
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FOOTBALL_DATA_API_TOKEN (or FOOTBALL_DATA_API_KEY — existing codebase name)
 *
 * Behavior:
 *   1. Fetches /v4/matches/{id} from football-data.org
 *   2. Resolves the corresponding row in public.matches by team tla
 *      codes + kickoff date
 *   3. Pulls the last 6 markets' question types (history) from the DB
 *   4. Calls selectQuestions() to pick a deterministic 5-leg slate
 *   5. Inserts one parlay_markets row (status='open',
 *      locks_at = kickoff - 5 min) and 5 parlay_questions rows
 *
 * Does NOT call any smart contract. On-chain creation is Session 17.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { mapTeamCode } from '../lib/football-api'
import { QUESTION_TEMPLATES } from '../lib/parlay/questionTypes'
import { selectQuestions } from '../lib/parlay/questionSelector'
import type { QuestionType } from '../lib/parlay/types'

// ── env loader (mirrors scripts/seed.ts) ──────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq)
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FD_TOKEN =
  process.env.FOOTBALL_DATA_API_TOKEN ?? process.env.FOOTBALL_DATA_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!FD_TOKEN) {
  console.error('Missing FOOTBALL_DATA_API_TOKEN')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── FD fetch ─────────────────────────────────────────────────
interface FdMatchLite {
  id: number
  utcDate: string
  homeTeam: { id: number; tla: string; name: string }
  awayTeam: { id: number; tla: string; name: string }
}

async function fetchFdMatch(id: number): Promise<FdMatchLite> {
  const res = await fetch(`https://api.football-data.org/v4/matches/${id}`, {
    headers: { 'X-Auth-Token': FD_TOKEN! },
  })
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${await res.text()}`)
  }
  return res.json() as Promise<FdMatchLite>
}

// ─── history lookup ───────────────────────────────────────────
async function fetchHistory(limit = 6): Promise<QuestionType[][]> {
  const { data: markets, error: mErr } = await sb
    .from('parlay_markets')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (mErr) throw mErr
  if (!markets || markets.length === 0) return []

  const marketIds = markets.map((m) => m.id as string)
  const { data: questions, error: qErr } = await sb
    .from('parlay_questions')
    .select('parlay_market_id, question_type')
    .in('parlay_market_id', marketIds)

  if (qErr) throw qErr

  return markets.map((m) =>
    (questions ?? [])
      .filter((q) => q.parlay_market_id === m.id)
      .map((q) => q.question_type as QuestionType),
  )
}

// ─── local match resolution ───────────────────────────────────
async function resolveLocalMatch(fd: FdMatchLite): Promise<string> {
  const homeCode = mapTeamCode(fd.homeTeam.tla)
  const awayCode = mapTeamCode(fd.awayTeam.tla)
  const kickoffDate = fd.utcDate.slice(0, 10) // YYYY-MM-DD

  const dayStart = `${kickoffDate}T00:00:00Z`
  const dayEnd = `${kickoffDate}T23:59:59Z`

  const { data, error } = await sb
    .from('matches')
    .select('id')
    .eq('team_a_code', homeCode)
    .eq('team_b_code', awayCode)
    .gte('kickoff', dayStart)
    .lte('kickoff', dayEnd)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error(
      `No local match found for FD fixture ${fd.id} ` +
        `(${homeCode} vs ${awayCode} on ${kickoffDate}). ` +
        `Seed matches first or add a code mapping.`,
    )
  }
  return data.id as string
}

// ─── main ─────────────────────────────────────────────────────
async function main() {
  const raw = process.argv[2]
  if (!raw) {
    console.error('Usage: tsx scripts/seedParlayMarket.ts <football-data-match-id>')
    process.exit(1)
  }
  const fdId = Number.parseInt(raw, 10)
  if (!Number.isInteger(fdId) || fdId <= 0) {
    console.error(`Invalid match id: ${raw}`)
    process.exit(1)
  }

  console.log(`→ Fetching FD match ${fdId}…`)
  const fd = await fetchFdMatch(fdId)
  console.log(
    `  ${fd.homeTeam.tla} vs ${fd.awayTeam.tla} @ ${fd.utcDate}`,
  )

  console.log('→ Resolving local match row…')
  const matchId = await resolveLocalMatch(fd)
  console.log(`  matches.id = ${matchId}`)

  console.log('→ Checking for existing market…')
  const { data: existing } = await sb
    .from('parlay_markets')
    .select('id')
    .eq('football_data_match_id', fdId)
    .maybeSingle()
  if (existing) {
    console.error(`Market already exists for FD match ${fdId}: ${existing.id}`)
    process.exit(1)
  }

  const kickoff = new Date(fd.utcDate)
  const locksAt = new Date(kickoff.getTime() - 5 * 60 * 1000)
  const nowIso = new Date().toISOString()

  console.log('→ Inserting parlay_markets row…')
  const { data: market, error: mErr } = await sb
    .from('parlay_markets')
    .insert({
      match_id: matchId,
      football_data_match_id: fdId,
      status: 'open',
      opens_at: nowIso,
      locks_at: locksAt.toISOString(),
    })
    .select('id')
    .single()
  if (mErr) throw mErr
  const marketId = market!.id as string
  console.log(`  parlay_markets.id = ${marketId}`)

  console.log('→ Selecting questions with history…')
  const history = await fetchHistory(6)
  const slots = selectQuestions(matchId, history)
  console.log(`  ${slots.join(', ')}`)

  const rows = slots.map((type, i) => {
    const tpl = QUESTION_TEMPLATES[type]
    return {
      parlay_market_id: marketId,
      slot: i + 1,
      question_type: type,
      prompt: tpl.prompt,
      option_a_label: tpl.optionA,
      option_b_label: tpl.optionB,
    }
  })

  console.log('→ Inserting 5 parlay_questions rows…')
  const { error: qErr } = await sb.from('parlay_questions').insert(rows)
  if (qErr) {
    console.error('Question insert failed; rolling back market.')
    await sb.from('parlay_markets').delete().eq('id', marketId)
    throw qErr
  }

  console.log('✓ Done.')
  console.log(JSON.stringify({ marketId, matchId, slots }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
