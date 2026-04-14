// ============================================================
// Football Data API Client
// Polls football-data.org for live match results
// ============================================================
//
// PARKED — upgrade to "Free + Deep Data" tier (€29/mo) before launch.
// Enables the `bookings[]` array on the match endpoint: { minute, team,
// player, card: 'YELLOW' | 'RED' }. Needed for:
//
//   1. FIFA Fair Play points tiebreaker in real group standings
//      (-1 yellow, -3 indirect red, -4 direct red). Post-process
//      second-yellow → direct-red by checking same-minute YELLOW+RED
//      on the same player.
//
//   2. Daily mini-prediction markets (post-redesign):
//        - Total Goals           (0–1 / 2–3 / 4+)       [keep, already live]
//        - Both Teams Score      (Yes / No)             [keep, already live]
//        - Early Goal (< 15')    (Yes / No)             [needs goals[] minute data]
//        - Total Cards (both)    (Under 3 / 3–5 / 6+)   [new — needs bookings]
//      Drop: First to Score, Man of the Match.
//
//   3. Grading cleanup in score_mini_predictions() —
//      migration 006_mini_predictions_xp.sql fakes three markets today:
//        - first_to_score: derived from final score (drop the market)
//        - motm:           derived from final score (drop the market)
//        - early_goal:     hardcoded to 'no' (never graded correctly)
//      Once Deep Data is live: replace with real goals[] events
//      (first event by minute ASC → first_to_score; any goal with
//      minute < 15 → early_goal = 'yes') and compute total_cards
//      from bookings[].
//
//   4. XP has been removed from the product. The scoring function
//      still writes xp_earned / xp_events / users.total_xp columns —
//      strip those writes (or drop the function entirely) when the
//      markets are reworked. Whatever replaces "5/5 = perfect match"
//      perfect-match reward logic should plug into the new reward
//      system, not XP.
//
// Also handle SUSPENDED / POSTPONED status as "void" for grading —
// current mapApiStatus collapses them into 'scheduled'.
// ============================================================

const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION_ID = 2000 // FIFA World Cup

interface ApiMatch {
  id: number
  matchday: number
  stage: string
  group: string | null
  utcDate: string
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'SUSPENDED' | 'POSTPONED' | 'CANCELLED'
  score: {
    fullTime: { home: number | null; away: number | null }
  }
  homeTeam: { tla: string; name: string }
  awayTeam: { tla: string; name: string }
}

interface ApiResponse {
  matches: ApiMatch[]
}

/**
 * Fetch matches from football-data.org for a given date range.
 * Requires FOOTBALL_DATA_API_KEY env var.
 */
export async function fetchLiveMatches(dateFrom?: string, dateTo?: string): Promise<ApiMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not configured')

  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  const url = `${API_BASE}/competitions/${COMPETITION_ID}/matches?${params}`

  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Football API ${res.status}: ${await res.text()}`)
  }

  const data: ApiResponse = await res.json()
  return data.matches
}

/**
 * Fetch today's matches (and yesterday's for late-night UTC games).
 */
export async function fetchTodaysMatches(): Promise<ApiMatch[]> {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateFrom = yesterday.toISOString().split('T')[0]
  const dateTo = now.toISOString().split('T')[0]

  return fetchLiveMatches(dateFrom, dateTo)
}

/**
 * Map football-data.org status to our match status.
 */
export function mapApiStatus(apiStatus: ApiMatch['status']): 'scheduled' | 'live' | 'completed' {
  switch (apiStatus) {
    case 'FINISHED':
      return 'completed'
    case 'IN_PLAY':
    case 'PAUSED':
      return 'live'
    default:
      return 'scheduled'
  }
}

/**
 * Map football-data.org team code to our team code.
 * Handles known mismatches between APIs.
 */
const CODE_MAP: Record<string, string> = {
  // football-data.org uses 3-letter FIFA codes but some differ
  KOR: 'KOR',
  CRC: 'CRC',
  KSA: 'KSA',
  CIV: 'CIV',
}

export function mapTeamCode(apiCode: string): string {
  return CODE_MAP[apiCode] ?? apiCode
}

export type { ApiMatch }
