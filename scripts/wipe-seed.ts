/**
 * Sabi — Wipe Seed Data
 *
 * Removes all seed data without touching real user data.
 * Deletes in correct order respecting foreign keys.
 *
 * Identification strategy:
 *   - Auth users with email *@demo.sabi.gg
 *   - Groups with invite_code LIKE 'SEED%'
 *   - Matches with match_number >= 201
 *
 * Usage: npm run wipe
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

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
const DEMO_AUTH_ID = process.env.DEMO_USER_AUTH_ID || ''
const SEED_EMAIL_DOMAIN = '@demo.sabi.gg'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function wipe() {
  console.log('')
  console.log('====================================')
  console.log('  Sabi Wipe Seed Data')
  console.log('====================================')
  console.log('')

  // 1. Find seed auth users
  console.log('  Finding seed users...')
  const { data: authData } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const seedUsers = (authData?.users || []).filter((u) =>
    u.email?.endsWith(SEED_EMAIL_DOMAIN)
  )
  const seedUserIds = seedUsers.map((u) => u.id)
  console.log(`    Found ${seedUserIds.length} seed auth users`)

  // 2. Find seed groups
  const { data: seedGroups } = await sb
    .from('groups')
    .select('id')
    .like('invite_code', 'SEED%')
  const seedGroupIds = (seedGroups || []).map((g) => g.id)
  console.log(`    Found ${seedGroupIds.length} seed groups`)

  // 3. Find seed matches
  const { data: seedMatches } = await sb
    .from('matches')
    .select('id')
    .gte('match_number', 201)
  const seedMatchIds = (seedMatches || []).map((m) => m.id)
  console.log(`    Found ${seedMatchIds.length} seed matches`)

  const noopIds = ['00000000-0000-0000-0000-000000000000']

  // 4. Delete in FK-safe order
  console.log('  Deleting seed data...')

  // Bets referencing seed matches or seed users
  if (seedMatchIds.length > 0) {
    await sb.from('bets').delete().in('match_id', seedMatchIds)
  }
  if (seedUserIds.length > 0) {
    await sb.from('bets').delete().in('user_id', seedUserIds)
  }

  // Bet markets for seed matches
  if (seedMatchIds.length > 0) {
    await sb.from('bet_markets').delete().in('match_id', seedMatchIds)
  }

  // Predictions for seed matches or seed users
  if (seedMatchIds.length > 0) {
    await sb.from('predictions').delete().in('match_id', seedMatchIds)
  }
  if (seedUserIds.length > 0) {
    await sb.from('predictions').delete().in('user_id', seedUserIds)
  }

  // Mini predictions
  if (seedMatchIds.length > 0) {
    await sb.from('mini_predictions').delete().in('match_id', seedMatchIds)
  }
  if (seedUserIds.length > 0) {
    await sb.from('mini_predictions').delete().in('user_id', seedUserIds)
  }

  // Global leaderboard for seed users (and demo user)
  if (seedUserIds.length > 0) {
    await sb.from('global_leaderboard').delete().in('user_id', seedUserIds)
  }
  if (DEMO_AUTH_ID) {
    await sb.from('global_leaderboard').delete().eq('user_id', DEMO_AUTH_ID)
    // Remove demo user bets on seed matches
    if (seedMatchIds.length > 0) {
      await sb.from('bets').delete().eq('user_id', DEMO_AUTH_ID).in('match_id', seedMatchIds)
      await sb.from('predictions').delete().eq('user_id', DEMO_AUTH_ID).in('match_id', seedMatchIds)
    }
  }

  // Balance transactions, deposits, payouts for seed users
  if (seedUserIds.length > 0) {
    await sb.from('balance_transactions').delete().in('user_id', seedUserIds)
    await sb.from('deposits').delete().in('user_id', seedUserIds)
    await sb.from('payouts').delete().in('user_id', seedUserIds)
    await sb.from('push_subscriptions').delete().in('user_id', seedUserIds)
    await sb.from('bonus_predictions').delete().in('user_id', seedUserIds)
    await sb.from('balances').delete().in('user_id', seedUserIds)
  }

  // Group members for seed groups (removes demo user membership too)
  if (seedGroupIds.length > 0) {
    await sb.from('group_members').delete().in('group_id', seedGroupIds)
  }

  // Seed groups
  if (seedGroupIds.length > 0) {
    await sb.from('groups').delete().in('id', seedGroupIds)
  }

  // Seed matches
  if (seedMatchIds.length > 0) {
    await sb.from('matches').delete().gte('match_number', 201)
  }

  // Seed users (delete from users table — auth deletion comes next)
  if (seedUserIds.length > 0) {
    await sb.from('users').delete().in('id', seedUserIds)
  }

  // Delete seed auth users
  let authDeleted = 0
  for (const user of seedUsers) {
    const { error } = await sb.auth.admin.deleteUser(user.id)
    if (!error) authDeleted++
  }
  console.log(`    Deleted ${authDeleted} auth users`)

  console.log('')
  console.log('====================================')
  console.log('  Wipe Complete!')
  console.log('====================================')
  console.log(`  Auth users:  ${authDeleted}`)
  console.log(`  Groups:      ${seedGroupIds.length}`)
  console.log(`  Matches:     ${seedMatchIds.length}`)
  console.log('')
}

wipe().catch((err) => {
  console.error('Wipe failed:', err)
  process.exit(1)
})
