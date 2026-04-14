/**
 * One-off cleanup: drop stray dev-seed matches (match_number >= 201)
 * and anything that references them. Safe to re-run — it's idempotent.
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

  const { data: strays } = await sb
    .from('matches')
    .select('id, match_number')
    .gte('match_number', 201)

  const ids = (strays ?? []).map((m) => m.id)
  console.log(`Found ${ids.length} dev-seed matches to remove`)

  if (ids.length === 0) return

  for (const table of ['bets', 'bet_markets', 'predictions', 'mini_predictions']) {
    const { error } = await sb.from(table).delete().in('match_id', ids)
    if (error && !error.message.includes('does not exist')) {
      console.warn(`  ! ${table}: ${error.message}`)
    } else {
      console.log(`  ✓ cleared ${table}`)
    }
  }

  const { error: delErr } = await sb.from('matches').delete().gte('match_number', 201)
  if (delErr) {
    console.error(`  ! matches: ${delErr.message}`)
    process.exit(1)
  }
  console.log(`  ✓ deleted ${ids.length} stray matches`)

  const { data: counts } = await sb
    .from('matches')
    .select('group_letter')
    .eq('stage', 'group')
  const by: Record<string, number> = {}
  for (const r of counts ?? []) by[r.group_letter ?? 'null'] = (by[r.group_letter ?? 'null'] ?? 0) + 1
  console.log('\nGroup counts after cleanup:', by)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
