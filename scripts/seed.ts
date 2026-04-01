/**
 * Sabi — Comprehensive Seed Script
 *
 * Populates every screen with realistic demo data:
 *   40 users, 5 pools, 12 matches, predictions, leaderboards, bets
 *
 * Usage: npm run seed
 * Wipe:  npm run wipe
 *
 * Env:   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *        DEMO_USER_AUTH_ID (optional — maps your real account into seed data)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// ── Load .env.local ──────────────────────────────────────────
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SEED_EMAIL_DOMAIN = '@demo.sabi.gg'

const AVATARS = ['🧔', '👩', '👨', '👧', '🧑', '👦', '👩‍🦱', '🧔‍♂️', '👱‍♀️', '👩‍🦰']

const USER_DEFS: { name: string; country: string; wallet: boolean }[] = [
  // Nigerian (15)
  { name: 'Chidi', country: 'NG', wallet: true },
  { name: 'Amara', country: 'NG', wallet: true },
  { name: 'Kelechi', country: 'NG', wallet: true },
  { name: 'Ngozi', country: 'NG', wallet: false },
  { name: 'Emeka', country: 'NG', wallet: true },
  { name: 'Funke', country: 'NG', wallet: false },
  { name: 'Obinna', country: 'NG', wallet: true },
  { name: 'Adaeze', country: 'NG', wallet: false },
  { name: 'Tunde', country: 'NG', wallet: true },
  { name: 'Yemi', country: 'NG', wallet: false },
  { name: 'Chioma', country: 'NG', wallet: false },
  { name: 'Ikenna', country: 'NG', wallet: true },
  { name: 'Bola', country: 'NG', wallet: false },
  { name: 'Sade', country: 'NG', wallet: true },
  { name: 'Dayo', country: 'NG', wallet: false },
  // Brazilian (10)
  { name: 'Lucas', country: 'BR', wallet: true },
  { name: 'Camila', country: 'BR', wallet: false },
  { name: 'Rafael', country: 'BR', wallet: true },
  { name: 'Isabela', country: 'BR', wallet: true },
  { name: 'Thiago', country: 'BR', wallet: true },
  { name: 'Fernanda', country: 'BR', wallet: false },
  { name: 'Gustavo', country: 'BR', wallet: true },
  { name: 'Larissa', country: 'BR', wallet: false },
  { name: 'Matheus', country: 'BR', wallet: true },
  { name: 'Juliana', country: 'BR', wallet: false },
  // Colombian (8)
  { name: 'Andres', country: 'CO', wallet: true },
  { name: 'Valentina', country: 'CO', wallet: true },
  { name: 'Santiago', country: 'CO', wallet: true },
  { name: 'Isabella', country: 'CO', wallet: false },
  { name: 'Mateo', country: 'CO', wallet: true },
  { name: 'Sofia', country: 'CO', wallet: true },
  { name: 'Julian', country: 'CO', wallet: false },
  { name: 'Mariana', country: 'CO', wallet: false },
  // Global (7)
  { name: 'James', country: 'GB', wallet: true },
  { name: 'Fatima', country: 'MA', wallet: false },
  { name: 'Yuki', country: 'JP', wallet: true },
  { name: 'Kwame', country: 'GH', wallet: true },
  { name: 'Lucia', country: 'ES', wallet: true },
  { name: 'Carlos', country: 'MX', wallet: true },
  { name: 'Amina', country: 'SN', wallet: false },
]

// Skill distribution (0-1) — determines prediction quality
const USER_SKILLS = USER_DEFS.map((_, i) => {
  // Top 5 users get high skill, bottom 10 get low, rest mid
  if (i < 5) return 0.85 + Math.random() * 0.1
  if (i < 15) return 0.55 + Math.random() * 0.2
  if (i < 30) return 0.25 + Math.random() * 0.25
  return 0.05 + Math.random() * 0.2
})

interface MatchDef {
  num: number
  teamA: { name: string; code: string; flag: string }
  teamB: { name: string; code: string; flag: string }
  group: string
  scoreA: number | null
  scoreB: number | null
  status: 'completed' | 'scheduled'
  kickoff: string
  venue: string
  city: string
}

const now = new Date()
const yesterday = new Date(now.getTime() - 86400000)
const twoDaysAgo = new Date(now.getTime() - 2 * 86400000)
const threeDaysAgo = new Date(now.getTime() - 3 * 86400000)
const fourDaysAgo = new Date(now.getTime() - 4 * 86400000)

function todayAt(hourUTC: number): string {
  const d = new Date(now)
  d.setUTCHours(hourUTC, 0, 0, 0)
  return d.toISOString()
}
function daysAgo(days: number, hourUTC: number): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() - days)
  d.setUTCHours(hourUTC, 0, 0, 0)
  return d.toISOString()
}
function daysFromNow(days: number, hourUTC: number): string {
  const d = new Date(now)
  d.setUTCDate(d.getUTCDate() + days)
  d.setUTCHours(hourUTC, 0, 0, 0)
  return d.toISOString()
}

const MATCHES: MatchDef[] = [
  // 8 COMPLETED matches (recent past)
  { num: 201, teamA: { name: 'Brazil', code: 'BRA', flag: '🇧🇷' }, teamB: { name: 'Morocco', code: 'MAR', flag: '🇲🇦' }, group: 'A', scoreA: 2, scoreB: 1, status: 'completed', kickoff: daysAgo(4, 16), venue: 'MetLife Stadium', city: 'New York' },
  { num: 202, teamA: { name: 'USA', code: 'USA', flag: '🇺🇸' }, teamB: { name: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' }, group: 'A', scoreA: 1, scoreB: 1, status: 'completed', kickoff: daysAgo(4, 19), venue: 'SoFi Stadium', city: 'Los Angeles' },
  { num: 203, teamA: { name: 'Colombia', code: 'COL', flag: '🇨🇴' }, teamB: { name: 'Haiti', code: 'HAI', flag: '🇭🇹' }, group: 'B', scoreA: 3, scoreB: 0, status: 'completed', kickoff: daysAgo(3, 16), venue: 'Hard Rock Stadium', city: 'Miami' },
  { num: 204, teamA: { name: 'France', code: 'FRA', flag: '🇫🇷' }, teamB: { name: 'Nigeria', code: 'NGA', flag: '🇳🇬' }, group: 'B', scoreA: 2, scoreB: 0, status: 'completed', kickoff: daysAgo(3, 19), venue: 'AT&T Stadium', city: 'Dallas' },
  { num: 205, teamA: { name: 'Argentina', code: 'ARG', flag: '🇦🇷' }, teamB: { name: 'Japan', code: 'JPN', flag: '🇯🇵' }, group: 'C', scoreA: 1, scoreB: 0, status: 'completed', kickoff: daysAgo(2, 16), venue: 'Estadio Azteca', city: 'Mexico City' },
  { num: 206, teamA: { name: 'Germany', code: 'GER', flag: '🇩🇪' }, teamB: { name: 'Senegal', code: 'SEN', flag: '🇸🇳' }, group: 'C', scoreA: 2, scoreB: 2, status: 'completed', kickoff: daysAgo(2, 19), venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { num: 207, teamA: { name: 'Mexico', code: 'MEX', flag: '🇲🇽' }, teamB: { name: 'Canada', code: 'CAN', flag: '🇨🇦' }, group: 'D', scoreA: 1, scoreB: 0, status: 'completed', kickoff: daysAgo(1, 10), venue: 'Estadio Guadalajara', city: 'Guadalajara' },
  { num: 208, teamA: { name: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, teamB: { name: 'Ecuador', code: 'ECU', flag: '🇪🇨' }, group: 'D', scoreA: 3, scoreB: 1, status: 'completed', kickoff: daysAgo(1, 14), venue: 'Lincoln Financial Field', city: 'Philadelphia' },
  // 4 TODAY matches (use UTC-safe hours: 10, 13, 16, 20)
  { num: 209, teamA: { name: 'Portugal', code: 'POR', flag: '🇵🇹' }, teamB: { name: 'Ghana', code: 'GHA', flag: '🇬🇭' }, group: 'E', scoreA: null, scoreB: null, status: 'scheduled', kickoff: todayAt(10), venue: 'Lumen Field', city: 'Seattle' },
  { num: 210, teamA: { name: 'Netherlands', code: 'NED', flag: '🇳🇱' }, teamB: { name: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦' }, group: 'E', scoreA: null, scoreB: null, status: 'scheduled', kickoff: todayAt(13), venue: 'Gillette Stadium', city: 'Boston' },
  { num: 211, teamA: { name: 'Spain', code: 'ESP', flag: '🇪🇸' }, teamB: { name: 'South Korea', code: 'KOR', flag: '🇰🇷' }, group: 'F', scoreA: null, scoreB: null, status: 'scheduled', kickoff: todayAt(16), venue: 'BMO Field', city: 'Toronto' },
  { num: 212, teamA: { name: 'Belgium', code: 'BEL', flag: '🇧🇪' }, teamB: { name: 'Cameroon', code: 'CMR', flag: '🇨🇲' }, group: 'F', scoreA: null, scoreB: null, status: 'scheduled', kickoff: todayAt(20), venue: 'BC Place', city: 'Vancouver' },
  // 4 TOMORROW matches
  { num: 213, teamA: { name: 'Croatia', code: 'CRO', flag: '🇭🇷' }, teamB: { name: 'Peru', code: 'PER', flag: '🇵🇪' }, group: 'G', scoreA: null, scoreB: null, status: 'scheduled', kickoff: daysFromNow(1, 10), venue: 'NRG Stadium', city: 'Houston' },
  { num: 214, teamA: { name: 'Uruguay', code: 'URU', flag: '🇺🇾' }, teamB: { name: 'Australia', code: 'AUS', flag: '🇦🇺' }, group: 'G', scoreA: null, scoreB: null, status: 'scheduled', kickoff: daysFromNow(1, 13), venue: 'MetLife Stadium', city: 'New York' },
  { num: 215, teamA: { name: 'Switzerland', code: 'SUI', flag: '🇨🇭' }, teamB: { name: 'Algeria', code: 'ALG', flag: '🇩🇿' }, group: 'H', scoreA: null, scoreB: null, status: 'scheduled', kickoff: daysFromNow(1, 16), venue: 'SoFi Stadium', city: 'Los Angeles' },
  { num: 216, teamA: { name: 'Denmark', code: 'DEN', flag: '🇩🇰' }, teamB: { name: 'Tunisia', code: 'TUN', flag: '🇹🇳' }, group: 'H', scoreA: null, scoreB: null, status: 'scheduled', kickoff: daysFromNow(1, 20), venue: 'Hard Rock Stadium', city: 'Miami' },
  // 4 DAY-AFTER-TOMORROW matches
  { num: 217, teamA: { name: 'Serbia', code: 'SRB', flag: '🇷🇸' }, teamB: { name: 'Costa Rica', code: 'CRC', flag: '🇨🇷' }, group: 'I', scoreA: null, scoreB: null, status: 'scheduled', kickoff: daysFromNow(2, 10), venue: 'AT&T Stadium', city: 'Dallas' },
  { num: 218, teamA: { name: 'Poland', code: 'POL', flag: '🇵🇱' }, teamB: { name: 'Paraguay', code: 'PAR', flag: '🇵🇾' }, group: 'I', scoreA: null, scoreB: null, status: 'scheduled', kickoff: daysFromNow(2, 13), venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { num: 219, teamA: { name: 'Sweden', code: 'SWE', flag: '🇸🇪' }, teamB: { name: 'Iran', code: 'IRN', flag: '🇮🇷' }, group: 'J', scoreA: null, scoreB: null, status: 'scheduled', kickoff: daysFromNow(2, 16), venue: 'Estadio Azteca', city: 'Mexico City' },
  { num: 220, teamA: { name: 'Chile', code: 'CHI', flag: '🇨🇱' }, teamB: { name: 'Wales', code: 'WAL', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' }, group: 'J', scoreA: null, scoreB: null, status: 'scheduled', kickoff: daysFromNow(2, 20), venue: 'Lincoln Financial Field', city: 'Philadelphia' },
]

interface GroupDef {
  name: string
  emoji: string
  isPaid: boolean
  entryFee: number
  payoutModel: string
  globalAlloc: number
  code: string
  creatorName: string
  memberNames: string[]
}

const GROUP_DEFS: GroupDef[] = [
  {
    name: 'Naija Ballers 🇳🇬', emoji: '🇳🇬', isPaid: false, entryFee: 0,
    payoutModel: 'podium_split', globalAlloc: 20, code: 'SEED01', creatorName: 'Chidi',
    memberNames: ['Chidi', 'Amara', 'Kelechi', 'Ngozi', 'Emeka', 'Funke', 'Obinna', 'Adaeze', 'Tunde', 'Yemi', 'Chioma', 'James'],
  },
  {
    name: 'Copa Parceros 🇨🇴', emoji: '🇨🇴', isPaid: true, entryFee: 25,
    payoutModel: 'podium_split', globalAlloc: 20, code: 'SEED02', creatorName: 'Andres',
    memberNames: ['Andres', 'Valentina', 'Santiago', 'Isabella', 'Mateo', 'Sofia', 'Julian', 'Mariana'],
  },
  {
    name: 'São Paulo FC Fans ⚽', emoji: '⚽', isPaid: true, entryFee: 10,
    payoutModel: 'proportional', globalAlloc: 20, code: 'SEED03', creatorName: 'Lucas',
    memberNames: ['Lucas', 'Camila', 'Rafael', 'Isabela', 'Thiago', 'Fernanda', 'Gustavo', 'Larissa', 'Matheus', 'Juliana', 'Carlos', 'Lucia', 'Fatima', 'Yuki', 'Kwame'],
  },
  {
    name: 'MiniPay Legends 🏆', emoji: '🏆', isPaid: true, entryFee: 50,
    payoutModel: 'winner_takes_all', globalAlloc: 20, code: 'SEED04', creatorName: 'Kwame',
    memberNames: ['Kwame', 'James', 'Carlos', 'Thiago', 'Andres', 'Emeka'],
  },
  {
    name: 'World Cup Newbies 🌍', emoji: '🌍', isPaid: false, entryFee: 0,
    payoutModel: 'podium_split', globalAlloc: 20, code: 'SEED05', creatorName: 'James',
    memberNames: [
      'James', 'Fatima', 'Yuki', 'Kwame', 'Lucia', 'Carlos', 'Amina',
      'Chidi', 'Amara', 'Kelechi', 'Lucas', 'Camila', 'Rafael',
      'Andres', 'Valentina', 'Santiago', 'Emeka', 'Funke', 'Obinna', 'Adaeze',
    ],
  },
]

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

function celoAddress(): string {
  return '0x' + randomHex(20)
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function calcPredictionPoints(predA: number, predB: number, actualA: number, actualB: number): number {
  // Exact score
  if (predA === actualA && predB === actualB) return 5
  // Result
  const predResult = predA > predB ? 'H' : predA < predB ? 'A' : 'D'
  const actualResult = actualA > actualB ? 'H' : actualA < actualB ? 'A' : 'D'
  if (predResult !== actualResult) return 0
  // Correct result + goal difference
  if ((predA - predB) === (actualA - actualB)) return 3
  // Correct result only
  return 2
}

function generatePrediction(
  skill: number,
  actualA: number,
  actualB: number
): { scoreA: number; scoreB: number } {
  const roll = Math.random()

  // Exact score probability scales with skill
  if (roll < skill * 0.35) {
    return { scoreA: actualA, scoreB: actualB }
  }

  // Correct result (maybe wrong GD)
  if (roll < skill * 0.35 + 0.4) {
    const actualResult = actualA > actualB ? 'H' : actualA < actualB ? 'A' : 'D'
    if (actualResult === 'H') {
      const gd = 1 + Math.floor(Math.random() * 3)
      const away = Math.floor(Math.random() * 3)
      return { scoreA: away + gd, scoreB: away }
    } else if (actualResult === 'A') {
      const gd = 1 + Math.floor(Math.random() * 3)
      const home = Math.floor(Math.random() * 3)
      return { scoreA: home, scoreB: home + gd }
    } else {
      const goals = Math.floor(Math.random() * 4)
      return { scoreA: goals, scoreB: goals }
    }
  }

  // Wrong result
  const results: Array<{ scoreA: number; scoreB: number }> = [
    { scoreA: 0, scoreB: 1 },
    { scoreA: 1, scoreB: 2 },
    { scoreA: 0, scoreB: 2 },
    { scoreA: 2, scoreB: 0 },
    { scoreA: 1, scoreB: 0 },
    { scoreA: 3, scoreB: 0 },
    { scoreA: 0, scoreB: 0 },
    { scoreA: 1, scoreB: 1 },
    { scoreA: 2, scoreB: 2 },
  ]
  // Filter to wrong results only
  const actualResult = actualA > actualB ? 'H' : actualA < actualB ? 'A' : 'D'
  const wrong = results.filter((r) => {
    const res = r.scoreA > r.scoreB ? 'H' : r.scoreA < r.scoreB ? 'A' : 'D'
    return res !== actualResult
  })
  return pick(wrong.length > 0 ? wrong : results)
}

function tierFromPercentile(pct: number): string {
  if (pct <= 0.001) return 'mythic'
  if (pct <= 0.01) return 'diamond'
  if (pct <= 0.05) return 'platinum'
  if (pct <= 0.15) return 'gold'
  if (pct <= 0.40) return 'silver'
  return 'bronze'
}

// ═══════════════════════════════════════════════════════════════
//  WIPE EXISTING SEED DATA
// ═══════════════════════════════════════════════════════════════

async function wipeExisting() {
  console.log('  Wiping existing seed data...')

  // 1. Find seed auth users by email pattern
  const { data: authData } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const seedAuthIds = (authData?.users || [])
    .filter((u) => u.email?.endsWith(SEED_EMAIL_DOMAIN))
    .map((u) => u.id)

  if (seedAuthIds.length > 0) {
    // Delete bets, predictions, global_leaderboard for seed users
    await sb.from('bets').delete().in('user_id', seedAuthIds)
    await sb.from('predictions').delete().in('user_id', seedAuthIds)
    await sb.from('mini_predictions').delete().in('user_id', seedAuthIds)
    await sb.from('global_leaderboard').delete().in('user_id', seedAuthIds)
    await sb.from('balance_transactions').delete().in('user_id', seedAuthIds)
    await sb.from('balances').delete().in('user_id', seedAuthIds)
    await sb.from('push_subscriptions').delete().in('user_id', seedAuthIds)
    await sb.from('deposits').delete().in('user_id', seedAuthIds)
    await sb.from('payouts').delete().in('user_id', seedAuthIds)
    await sb.from('bonus_predictions').delete().in('user_id', seedAuthIds)
  }

  // 2. Delete seed groups (cascade deletes group_members)
  // But first, remove demo user from seed groups (they're not a seed user)
  const { data: seedGroups } = await sb.from('groups').select('id').like('invite_code', 'SEED%')
  const seedGroupIds = (seedGroups || []).map((g) => g.id)
  if (seedGroupIds.length > 0) {
    // Remove ANY user's membership in seed groups (including demo user)
    await sb.from('group_members').delete().in('group_id', seedGroupIds)
    await sb.from('groups').delete().in('id', seedGroupIds)
  }

  // 3. Delete seed matches (match_number >= 201)
  // First delete bet_markets and bets referencing seed matches
  const { data: seedMatches } = await sb.from('matches').select('id').gte('match_number', 201)
  const seedMatchIds = (seedMatches || []).map((m) => m.id)
  if (seedMatchIds.length > 0) {
    await sb.from('bets').delete().in('match_id', seedMatchIds)
    await sb.from('bet_markets').delete().in('match_id', seedMatchIds)
    await sb.from('predictions').delete().in('match_id', seedMatchIds)
    await sb.from('mini_predictions').delete().in('match_id', seedMatchIds)
    await sb.from('matches').delete().gte('match_number', 201)
  }

  // 4. Delete seed auth users (cascade deletes users table)
  for (const id of seedAuthIds) {
    await sb.auth.admin.deleteUser(id)
  }

  // 5. Clean up demo user's seed data if they exist
  if (DEMO_AUTH_ID) {
    await sb.from('bets').delete().eq('user_id', DEMO_AUTH_ID).in('match_id', seedMatchIds.length > 0 ? seedMatchIds : ['00000000-0000-0000-0000-000000000000'])
    await sb.from('predictions').delete().eq('user_id', DEMO_AUTH_ID).in('match_id', seedMatchIds.length > 0 ? seedMatchIds : ['00000000-0000-0000-0000-000000000000'])
    await sb.from('global_leaderboard').delete().eq('user_id', DEMO_AUTH_ID)
  }

  console.log(`  Wiped ${seedAuthIds.length} seed users, ${seedGroupIds.length} groups, ${seedMatchIds.length} matches`)
}

// ═══════════════════════════════════════════════════════════════
//  SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const userIdMap = new Map<string, string>() // name → uuid

async function seedUsers(): Promise<void> {
  console.log('  Creating 40 seed users...')

  for (const def of USER_DEFS) {
    const email = `seed-${def.name.toLowerCase()}${SEED_EMAIL_DOMAIN}`

    const { data: authResult, error: authErr } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { is_seed: true },
    })

    if (authErr || !authResult.user) {
      console.error(`    Failed to create auth user ${def.name}: ${authErr?.message}`)
      continue
    }

    const userId = authResult.user.id
    userIdMap.set(def.name, userId)

    // Upsert user profile (auth trigger may have auto-created the row)
    const { error: profileErr } = await sb.from('users').upsert({
      id: userId,
      display_name: def.name,
      avatar_emoji: pick(AVATARS),
      country_code: def.country,
      total_xp: 0,
      packs_earned: 0,
      cards_collected: 0,
      streak_days: 0,
      wallet_connected: def.wallet,
      wallet_address: def.wallet ? celoAddress() : null,
      auth_method: def.wallet ? 'minipay' : 'anonymous',
      onboarding_completed: true,
      last_login_date: new Date().toISOString().split('T')[0],
    })

    if (profileErr) {
      console.error(`    Failed to create profile ${def.name}: ${profileErr.message}`)
    }

    // Upsert balance
    await sb.from('balances').upsert({
      user_id: userId,
      available: def.wallet ? (5 + Math.random() * 50).toFixed(2) : '0',
      locked: '0',
      total_deposited: def.wallet ? (10 + Math.random() * 100).toFixed(2) : '0',
      total_withdrawn: '0',
      total_won: '0',
    }, { onConflict: 'user_id' })
  }

  console.log(`  Created ${userIdMap.size} users`)
}

const matchIdMap = new Map<number, string>() // match_number → uuid

async function seedMatches(): Promise<void> {
  console.log('  Creating 20 seed matches...')

  const rows = MATCHES.map((m) => ({
    match_number: m.num,
    stage: 'group' as const,
    group_letter: m.group,
    team_a_name: m.teamA.name,
    team_a_code: m.teamA.code,
    team_a_flag: m.teamA.flag,
    team_b_name: m.teamB.name,
    team_b_code: m.teamB.code,
    team_b_flag: m.teamB.flag,
    kickoff: m.kickoff,
    venue: m.venue,
    city: m.city,
    multiplier: 1.0,
    score_a: m.scoreA,
    score_b: m.scoreB,
    status: m.status,
  }))

  const { data, error } = await sb.from('matches').insert(rows).select('id, match_number')

  if (error) {
    console.error(`  Failed to insert matches: ${error.message}`)
    return
  }

  for (const row of data || []) {
    matchIdMap.set(row.match_number, row.id)
  }

  console.log(`  Created ${data?.length || 0} matches`)
}

const groupIdMap = new Map<string, string>() // code → uuid

async function seedGroups(): Promise<void> {
  console.log('  Creating 5 seed groups...')

  for (const gdef of GROUP_DEFS) {
    const creatorId = userIdMap.get(gdef.creatorName)
    if (!creatorId) {
      console.error(`    Creator ${gdef.creatorName} not found — skipping group ${gdef.name}`)
      continue
    }

    const memberCount = gdef.memberNames.length + (DEMO_AUTH_ID ? 1 : 0)
    const grossPool = gdef.isPaid ? gdef.entryFee * memberCount : 0
    const netPool = grossPool * 0.95 // 5% service fee
    const groupPool = netPool * (1 - gdef.globalAlloc / 100)

    // Set member_count to 0 initially — a DB trigger may auto-increment on member insert
    const { data, error } = await sb
      .from('groups')
      .insert({
        name: gdef.name,
        emoji: gdef.emoji,
        created_by: creatorId,
        is_paid: gdef.isPaid,
        entry_fee: gdef.entryFee,
        payout_model: gdef.payoutModel,
        global_allocation: gdef.globalAlloc,
        invite_code: gdef.code,
        member_count: 0,
        pool_amount: groupPool,
        status: 'open',
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error(`    Failed to create group ${gdef.name}: ${error?.message}`)
      continue
    }

    groupIdMap.set(gdef.code, data.id)

    // Add members
    const memberRows: any[] = []
    for (const memberName of gdef.memberNames) {
      const memberId = userIdMap.get(memberName)
      if (!memberId) continue
      memberRows.push({
        group_id: data.id,
        user_id: memberId,
        role: memberName === gdef.creatorName ? 'admin' : 'member',
        total_points: 0,
        rank: null,
      })
    }

    // Add demo user to specific groups
    if (DEMO_AUTH_ID) {
      const demoGroups = ['SEED01', 'SEED02', 'SEED04'] // 1 free, 2 paid
      if (demoGroups.includes(gdef.code)) {
        memberRows.push({
          group_id: data.id,
          user_id: DEMO_AUTH_ID,
          role: 'member',
          total_points: 0,
          rank: null,
        })
      }
    }

    if (memberRows.length > 0) {
      const { error: memErr } = await sb.from('group_members').insert(memberRows)
      if (memErr) console.error(`    Failed to add members to ${gdef.name}: ${memErr.message}`)
    }

    // Update pool_amount now that member_count is correct (trigger-incremented)
    if (gdef.isPaid) {
      const actualMembers = memberRows.length
      const gross = gdef.entryFee * actualMembers
      const net = gross * 0.95
      const pool = net * (1 - gdef.globalAlloc / 100)
      await sb.from('groups').update({ pool_amount: pool }).eq('id', data.id)
    }
  }

  console.log(`  Created ${groupIdMap.size} groups`)
}

async function seedPredictions(): Promise<void> {
  console.log('  Creating predictions for completed matches...')

  const completedMatches = MATCHES.filter((m) => m.status === 'completed')
  const todayMatches = MATCHES.filter((m) => m.status === 'scheduled')
  const allUserIds = Array.from(userIdMap.entries())
  let predCount = 0

  // Predictions for completed matches — all users
  const predRows: any[] = []
  for (let ui = 0; ui < allUserIds.length; ui++) {
    const [name, userId] = allUserIds[ui]
    const skill = USER_SKILLS[ui]

    for (const match of completedMatches) {
      const matchId = matchIdMap.get(match.num)
      if (!matchId) continue

      const pred = generatePrediction(skill, match.scoreA!, match.scoreB!)
      const points = calcPredictionPoints(pred.scoreA, pred.scoreB, match.scoreA!, match.scoreB!)

      predRows.push({
        user_id: userId,
        match_id: matchId,
        score_a: pred.scoreA,
        score_b: pred.scoreB,
        points,
      })
    }
  }

  // Demo user predictions for completed matches
  if (DEMO_AUTH_ID) {
    for (const match of completedMatches) {
      const matchId = matchIdMap.get(match.num)
      if (!matchId) continue
      // Demo user is a good predictor — 75% skill
      const pred = generatePrediction(0.75, match.scoreA!, match.scoreB!)
      const points = calcPredictionPoints(pred.scoreA, pred.scoreB, match.scoreA!, match.scoreB!)
      predRows.push({
        user_id: DEMO_AUTH_ID,
        match_id: matchId,
        score_a: pred.scoreA,
        score_b: pred.scoreB,
        points,
      })
    }
  }

  // Predictions for today's matches — 60% of users
  for (let ui = 0; ui < allUserIds.length; ui++) {
    if (Math.random() > 0.6) continue
    const [, userId] = allUserIds[ui]

    for (const match of todayMatches) {
      const matchId = matchIdMap.get(match.num)
      if (!matchId) continue
      // Random predictions (match not played yet)
      const scoreA = Math.floor(Math.random() * 4)
      const scoreB = Math.floor(Math.random() * 4)
      predRows.push({
        user_id: userId,
        match_id: matchId,
        score_a: scoreA,
        score_b: scoreB,
        points: null, // not scored yet
      })
    }
  }

  // Demo user predictions for 3 of 4 today matches (75% complete)
  if (DEMO_AUTH_ID) {
    for (let i = 0; i < 3 && i < todayMatches.length; i++) {
      const matchId = matchIdMap.get(todayMatches[i].num)
      if (!matchId) continue
      predRows.push({
        user_id: DEMO_AUTH_ID,
        match_id: matchId,
        score_a: Math.floor(Math.random() * 3) + 1,
        score_b: Math.floor(Math.random() * 3),
        points: null,
      })
    }
  }

  // Bulk insert in chunks
  const CHUNK = 200
  for (let i = 0; i < predRows.length; i += CHUNK) {
    const chunk = predRows.slice(i, i + CHUNK)
    const { error } = await sb.from('predictions').insert(chunk)
    if (error) console.error(`    Prediction insert error: ${error.message}`)
    predCount += chunk.length
  }

  console.log(`  Created ${predCount} predictions`)
}

async function seedLeaderboards(): Promise<void> {
  console.log('  Populating leaderboards...')

  // Aggregate points per user from predictions
  const pointsPerUser = new Map<string, { total: number; predicted: number; exact: number }>()

  // Collect all user IDs (seed users + demo user)
  const allUserIds = new Set(userIdMap.values())
  if (DEMO_AUTH_ID) allUserIds.add(DEMO_AUTH_ID)

  for (const userId of allUserIds) {
    const { data: preds } = await sb
      .from('predictions')
      .select('points')
      .eq('user_id', userId)
      .not('points', 'is', null)

    if (!preds) continue
    const total = preds.reduce((sum, p) => sum + (p.points || 0), 0)
    const exact = preds.filter((p) => p.points === 5).length
    pointsPerUser.set(userId, { total, predicted: preds.length, exact })
  }

  // Sort by total points for ranking
  const sorted = Array.from(pointsPerUser.entries()).sort((a, b) => b[1].total - a[1].total)

  // Global leaderboard
  const globalRows = sorted.map(([userId, stats], i) => ({
    user_id: userId,
    total_points: stats.total,
    matches_predicted: stats.predicted,
    exact_scores: stats.exact,
    bonus_points: 0,
    rank: i + 1,
    tier: tierFromPercentile((i) / sorted.length),
  }))

  if (globalRows.length > 0) {
    const { error } = await sb.from('global_leaderboard').upsert(globalRows)
    if (error) console.error(`    Global leaderboard error: ${error.message}`)
  }

  // Group leaderboards (update group_members with total_points and rank)
  for (const gdef of GROUP_DEFS) {
    const groupId = groupIdMap.get(gdef.code)
    if (!groupId) continue

    const { data: members } = await sb
      .from('group_members')
      .select('id, user_id')
      .eq('group_id', groupId)

    if (!members) continue

    // Rank members by their global points
    const membersWithPoints = members
      .map((m) => ({
        ...m,
        totalPoints: pointsPerUser.get(m.user_id)?.total || 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)

    for (let i = 0; i < membersWithPoints.length; i++) {
      await sb
        .from('group_members')
        .update({ total_points: membersWithPoints[i].totalPoints, rank: i + 1 })
        .eq('id', membersWithPoints[i].id)
    }
  }

  console.log(`  Populated leaderboards for ${sorted.length} users, ${groupIdMap.size} groups`)
}

async function seedBetMarkets(): Promise<void> {
  console.log('  Creating bet markets and bets...')

  const completedMatches = MATCHES.filter((m) => m.status === 'completed')
  const todayMatches = MATCHES.filter((m) => m.status === 'scheduled')
  let marketCount = 0
  let betCount = 0

  // Helper to compute market_id like the contract does
  function marketIdHex(matchNum: number, type: string): string {
    // Simple deterministic hex ID for seed data
    const raw = `sabi-seed-${matchNum}-${type}`
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0')
  }

  // Completed matches — resolved markets
  for (const match of completedMatches) {
    const matchId = matchIdMap.get(match.num)
    if (!matchId) continue

    // Determine winning outcomes
    const resultWinner =
      match.scoreA! > match.scoreB! ? 0 : match.scoreA! < match.scoreB! ? 2 : 1
    const totalGoals = match.scoreA! + match.scoreB!
    const goalsWinner = totalGoals > 2 ? 1 : 0

    for (const mtype of ['result', 'goals'] as const) {
      const contractId = marketIdHex(match.num, mtype)
      const winOutcome = mtype === 'result' ? resultWinner : goalsWinner

      const { error: mkErr } = await sb.from('bet_markets').insert({
        match_id: matchId,
        market_type: mtype,
        contract_market_id: contractId,
        status: 'resolved',
        winning_outcome: winOutcome,
        tx_hash_create: '0x' + randomHex(32),
        tx_hash_resolve: '0x' + randomHex(32),
      })
      if (mkErr) {
        console.error(`    Market insert error: ${mkErr.message}`)
        continue
      }
      marketCount++

      // Seed bets from wallet-connected users
      const walletUsers = Array.from(userIdMap.entries()).filter(
        ([name]) => USER_DEFS.find((u) => u.name === name)?.wallet
      )

      const bettersCount = 5 + Math.floor(Math.random() * 11) // 5–15 bets
      const selectedBetters = walletUsers.sort(() => Math.random() - 0.5).slice(0, bettersCount)

      for (const [, betterId] of selectedBetters) {
        const outcomes = mtype === 'result' ? 3 : 2
        const outcome = Math.floor(Math.random() * outcomes)
        const amount = (0.5 + Math.random() * 9.5).toFixed(2)
        const won = outcome === winOutcome
        const payout = won ? (Number(amount) * (1.5 + Math.random() * 2)).toFixed(2) : null
        // Most claims completed, leave a few unclaimed
        const claimed = won ? Math.random() > 0.2 : false

        const { error: betErr } = await sb.from('bets').insert({
          user_id: betterId,
          match_id: matchId,
          market_type: mtype,
          market_id: contractId,
          outcome,
          amount,
          tx_hash: '0x' + randomHex(32),
          status: won ? 'won' : 'lost',
          payout,
          claimed,
        })
        if (!betErr) betCount++
      }
    }
  }

  // Today matches — open markets with bets
  for (const match of todayMatches) {
    const matchId = matchIdMap.get(match.num)
    if (!matchId) continue

    for (const mtype of ['result', 'goals'] as const) {
      const contractId = marketIdHex(match.num, mtype)

      const { error: mkErr } = await sb.from('bet_markets').insert({
        match_id: matchId,
        market_type: mtype,
        contract_market_id: contractId,
        status: 'open',
        winning_outcome: null,
        tx_hash_create: '0x' + randomHex(32),
      })
      if (mkErr) continue
      marketCount++

      // Fewer bets on open markets
      const walletUsers = Array.from(userIdMap.entries()).filter(
        ([name]) => USER_DEFS.find((u) => u.name === name)?.wallet
      )
      const bettersCount = 3 + Math.floor(Math.random() * 8)
      const selected = walletUsers.sort(() => Math.random() - 0.5).slice(0, bettersCount)

      for (const [, betterId] of selected) {
        const outcomes = mtype === 'result' ? 3 : 2
        const outcome = Math.floor(Math.random() * outcomes)
        const amount = (0.5 + Math.random() * 9.5).toFixed(2)

        const { error: betErr } = await sb.from('bets').insert({
          user_id: betterId,
          match_id: matchId,
          market_type: mtype,
          market_id: contractId,
          outcome,
          amount,
          tx_hash: '0x' + randomHex(32),
          status: 'pending',
          payout: null,
          claimed: false,
        })
        if (!betErr) betCount++
      }
    }
  }

  console.log(`  Created ${marketCount} markets, ${betCount} bets`)
}

async function seedDemoUser(): Promise<void> {
  if (!DEMO_AUTH_ID) {
    console.log('  No DEMO_USER_AUTH_ID set — skipping demo user setup')
    console.log('  Tip: Set DEMO_USER_AUTH_ID in .env.local to map your account to seed data')
    return
  }

  console.log('  Setting up demo user...')

  // Ensure demo user exists in users table
  const { data: existing } = await sb.from('users').select('id').eq('id', DEMO_AUTH_ID).single()
  if (!existing) {
    await sb.from('users').upsert({
      id: DEMO_AUTH_ID,
      display_name: 'You',
      avatar_emoji: '🧑',
      country_code: 'NG',
      total_xp: 0,
      packs_earned: 0,
      cards_collected: 0,
      streak_days: 0,
      wallet_connected: true,
      wallet_address: celoAddress(),
      auth_method: 'minipay',
      onboarding_completed: true,
      last_login_date: new Date().toISOString().split('T')[0],
    })

    await sb.from('balances').upsert({
      user_id: DEMO_AUTH_ID,
      available: '42.50',
      locked: '0',
      total_deposited: '75.00',
      total_withdrawn: '0',
      total_won: '18.30',
    }, { onConflict: 'user_id' })
  }

  // Create unclaimed bet wins for demo user (~$8.50 total)
  const completedMatchIds = MATCHES.filter((m) => m.status === 'completed')
    .slice(0, 2)
    .map((m) => matchIdMap.get(m.num))
    .filter(Boolean) as string[]

  if (completedMatchIds.length >= 2) {
    const demoWinBets = [
      {
        user_id: DEMO_AUTH_ID,
        match_id: completedMatchIds[0],
        market_type: 'result',
        market_id: '0x' + randomHex(32),
        outcome: 0, // home win (correct for Brazil 2-1 Morocco)
        amount: '3.00',
        tx_hash: '0x' + randomHex(32),
        status: 'won',
        payout: '5.25',
        claimed: false,
      },
      {
        user_id: DEMO_AUTH_ID,
        match_id: completedMatchIds[1],
        market_type: 'goals',
        market_id: '0x' + randomHex(32),
        outcome: 0, // under 2.5 (correct for USA 1-1 Scotland, total 2)
        amount: '2.00',
        tx_hash: '0x' + randomHex(32),
        status: 'won',
        payout: '3.30',
        claimed: false,
      },
    ]

    // Some lost bets for realism
    const moreLosses = completedMatchIds.slice(0, 2).flatMap((matchId) => [
      {
        user_id: DEMO_AUTH_ID,
        match_id: matchId,
        market_type: 'result' as const,
        market_id: '0x' + randomHex(32),
        outcome: 2, // away win (wrong)
        amount: (2 + Math.random() * 5).toFixed(2),
        tx_hash: '0x' + randomHex(32),
        status: 'lost' as const,
        payout: null,
        claimed: false,
      },
    ])

    // Additional bets on other matches
    const otherMatchIds = MATCHES.filter((m) => m.status === 'completed')
      .slice(2, 6)
      .map((m) => matchIdMap.get(m.num))
      .filter(Boolean) as string[]

    const additionalBets = otherMatchIds.map((matchId) => ({
      user_id: DEMO_AUTH_ID,
      match_id: matchId,
      market_type: Math.random() > 0.5 ? ('result' as const) : ('goals' as const),
      market_id: '0x' + randomHex(32),
      outcome: Math.floor(Math.random() * 3),
      amount: (1 + Math.random() * 6).toFixed(2),
      tx_hash: '0x' + randomHex(32),
      status: (Math.random() > 0.6 ? 'won' : 'lost') as 'won' | 'lost',
      payout: null,
      claimed: Math.random() > 0.3,
    }))

    // Set payout for won bets
    for (const bet of additionalBets) {
      if (bet.status === 'won') {
        bet.payout = (Number(bet.amount) * (1.5 + Math.random() * 1.5)).toFixed(2) as any
      }
    }

    const allDemoBets = [...demoWinBets, ...moreLosses, ...additionalBets]
    const { error } = await sb.from('bets').insert(allDemoBets)
    if (error) console.error(`    Demo bets error: ${error.message}`)
    else console.log(`    Created ${allDemoBets.length} bets for demo user`)
  }

  console.log('  Demo user ready')
}

async function updateBalancesFromBets(): Promise<void> {
  console.log('  Updating balances from bet history...')

  // Collect all seed + demo user IDs
  const allIds = Array.from(userIdMap.values())
  if (DEMO_AUTH_ID) allIds.push(DEMO_AUTH_ID)

  let updated = 0
  for (const userId of allIds) {
    const { data: bets } = await sb
      .from('bets')
      .select('amount, status, payout')
      .eq('user_id', userId)

    if (!bets || bets.length === 0) continue

    const totalWagered = bets.reduce((s, b) => s + Number(b.amount || 0), 0)
    const totalWon = bets
      .filter((b) => b.status === 'won')
      .reduce((s, b) => s + Number(b.payout || 0), 0)

    await sb
      .from('balances')
      .update({
        total_deposited: totalWagered.toFixed(2),
        total_won: totalWon.toFixed(2),
        available: Math.max(0, totalWon - totalWagered + 10).toFixed(2),
      })
      .eq('user_id', userId)

    updated++
  }

  console.log(`  Updated ${updated} user balances`)
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('')
  console.log('====================================')
  console.log('  Sabi Seed Script')
  console.log('====================================')
  console.log(`  Supabase: ${SUPABASE_URL}`)
  console.log(`  Demo user: ${DEMO_AUTH_ID || '(not set)'}`)
  console.log('')

  await wipeExisting()
  await seedUsers()
  await seedMatches()
  await seedGroups()
  await seedPredictions()
  await seedLeaderboards()
  await seedBetMarkets()
  await seedDemoUser()
  await updateBalancesFromBets()

  // Summary
  console.log('')
  console.log('====================================')
  console.log('  Seed Complete!')
  console.log('====================================')
  console.log(`  Users:        ${userIdMap.size}`)
  console.log(`  Matches:      ${matchIdMap.size}`)
  console.log(`  Groups:       ${groupIdMap.size}`)
  console.log(`  Demo user:    ${DEMO_AUTH_ID || 'none (set DEMO_USER_AUTH_ID)'}`)
  console.log('')
  console.log('  Set NEXT_PUBLIC_DEMO_MODE=true in .env.local to show the demo banner.')
  console.log('')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
