// ============================================================
// Football Data API Client
// Polls football-data.org for live match results
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
