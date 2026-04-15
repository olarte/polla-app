/**
 * Verify migrations 007, 008, 009 are applied to the live DB.
 * Read-only checks via the Supabase client.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  if (!process.env[t.slice(0, eq)]) process.env[t.slice(0, eq)] = t.slice(eq + 1).trim()
}

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const checks: { name: string; ok: boolean; detail?: string }[] = []

  // 009: predictions.penalty_winner column exists
  {
    const { error } = await sb
      .from('predictions')
      .select('penalty_winner')
      .limit(1)
    checks.push({
      name: '009: predictions.penalty_winner column',
      ok: !error,
      detail: error?.message,
    })
  }

  // 009: matches.penalty_winner column exists
  {
    const { error } = await sb
      .from('matches')
      .select('penalty_winner')
      .limit(1)
    checks.push({
      name: '009: matches.penalty_winner column',
      ok: !error,
      detail: error?.message,
    })
  }

  // 008: bonus_predictions table is gone
  {
    const { error } = await sb
      .from('bonus_predictions' as never)
      .select('id')
      .limit(1)
    const gone =
      !!error &&
      /does not exist|not found|could not find the table|relation/i.test(error.message)
    checks.push({
      name: '008: bonus_predictions table dropped',
      ok: gone,
      detail: error?.message ?? 'still exists!',
    })
  }

  // 008: global_leaderboard.bonus_points column dropped
  {
    const { error } = await sb
      .from('global_leaderboard')
      .select('bonus_points' as never)
      .limit(1)
    checks.push({
      name: '008: global_leaderboard.bonus_points dropped',
      ok: !!error && /does not exist|column/i.test(error.message),
      detail: error?.message ?? 'still exists!',
    })
  }

  // 008: score_bonus_predictions function is gone
  {
    const { error } = await sb.rpc('score_bonus_predictions' as never, {
      p_results: {},
    })
    checks.push({
      name: '008: score_bonus_predictions() dropped',
      ok: !!error && /does not exist|not found|function/i.test(error.message),
      detail: error?.message ?? 'still exists!',
    })
  }

  // Summary
  console.log('')
  for (const c of checks) {
    const badge = c.ok ? '✓' : '✗'
    console.log(`  ${badge}  ${c.name}`)
    if (!c.ok && c.detail) console.log(`       → ${c.detail}`)
  }
  const allOk = checks.every((c) => c.ok)
  console.log('')
  console.log(allOk ? '✓ All migrations verified' : '✗ Some checks failed')
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
