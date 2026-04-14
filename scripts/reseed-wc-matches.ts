/**
 * Polla — Re-seed World Cup 2026 matches.
 *
 * Clears the 104 WC matches (match_number 1–104) and everything that
 * references them, then re-inserts the authoritative schedule from
 * lib/world-cup-data.ts. Safe to re-run.
 *
 * Usage: npm run reseed-wc
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { generateAllMatches } from '../lib/world-cup-data'

// ── Load .env.local ──
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function reseed() {
  console.log('')
  console.log('====================================')
  console.log('  Polla: Re-seed WC 2026 matches')
  console.log('====================================')
  console.log('')

  // 1. Find current WC matches
  const { data: wcMatches, error: findErr } = await sb
    .from('matches')
    .select('id')
    .gte('match_number', 1)
    .lte('match_number', 104)

  if (findErr) throw findErr
  const wcMatchIds = (wcMatches || []).map((m) => m.id)
  console.log(`  Found ${wcMatchIds.length} existing WC matches`)

  // 2. Delete dependent rows (FK-safe order)
  if (wcMatchIds.length > 0) {
    console.log('  Clearing dependent rows...')

    const tables = ['bets', 'bet_markets', 'predictions', 'mini_predictions']
    for (const table of tables) {
      const { error } = await sb.from(table).delete().in('match_id', wcMatchIds)
      if (error && !error.message.includes('does not exist')) {
        console.warn(`    ! ${table}: ${error.message}`)
      } else {
        console.log(`    ✓ ${table}`)
      }
    }

    // 3. Delete matches
    const { error: delErr } = await sb
      .from('matches')
      .delete()
      .gte('match_number', 1)
      .lte('match_number', 104)
    if (delErr) throw delErr
    console.log(`  ✓ Deleted ${wcMatchIds.length} matches`)
  }

  // 4. Insert fresh matches
  console.log('  Inserting fresh schedule...')
  const fresh = generateAllMatches()
  const rows = fresh.map((m) => ({
    match_number: m.match_number,
    stage: m.stage,
    group_letter: m.group_letter,
    team_a_name: m.team_a.name,
    team_a_code: m.team_a.code,
    team_a_flag: m.team_a.flag,
    team_b_name: m.team_b.name,
    team_b_code: m.team_b.code,
    team_b_flag: m.team_b.flag,
    kickoff: m.kickoff,
    venue: m.venue,
    city: m.city,
    multiplier: m.multiplier,
    status: 'scheduled',
  }))

  const batchSize = 50
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await sb.from('matches').insert(batch)
    if (error) {
      console.error(`  ! Batch ${i} failed: ${error.message}`)
      process.exit(1)
    }
    inserted += batch.length
  }

  // 5. Summary
  const breakdown = {
    group: fresh.filter((m) => m.stage === 'group').length,
    r32: fresh.filter((m) => m.stage === 'r32').length,
    r16: fresh.filter((m) => m.stage === 'r16').length,
    qf: fresh.filter((m) => m.stage === 'qf').length,
    sf: fresh.filter((m) => m.stage === 'sf').length,
    third: fresh.filter((m) => m.stage === 'third').length,
    final: fresh.filter((m) => m.stage === 'final').length,
  }

  console.log('')
  console.log('====================================')
  console.log('  Re-seed complete')
  console.log('====================================')
  console.log(`  Inserted:  ${inserted}`)
  console.log(`  Group:     ${breakdown.group}`)
  console.log(`  R32:       ${breakdown.r32}`)
  console.log(`  R16:       ${breakdown.r16}`)
  console.log(`  QF:        ${breakdown.qf}`)
  console.log(`  SF:        ${breakdown.sf}`)
  console.log(`  3rd:       ${breakdown.third}`)
  console.log(`  Final:     ${breakdown.final}`)
  console.log('')
}

reseed().catch((err) => {
  console.error('Re-seed failed:', err)
  process.exit(1)
})
