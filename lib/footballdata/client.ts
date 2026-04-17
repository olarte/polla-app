/**
 * football-data.org v4 client for the parlay settlement pipeline.
 *
 * Rate limiting
 * ─────────────
 * The free tier is 10 req/min; paid tiers are 30–60 req/min. Every call
 * goes through a token-bucket limiter — if we run out of tokens, the
 * caller awaits until one refills. The cap is set by
 * FOOTBALL_DATA_RATE_PER_MINUTE (default 10, the safe floor).
 *
 * 429 handling
 * ────────────
 * We parse the `X-Requests-Available-Minute` / `X-RequestCounter-Reset`
 * header when present, sleep for that many seconds + a 250ms jitter,
 * then retry once. A second 429 surfaces to the caller — let the job
 * log and move on rather than stalling the cron.
 *
 * 5xx: retry with exponential backoff up to 3 attempts.
 * 403: log and return null (subscription doesn't cover the competition).
 *
 * The existing codebase env is `FOOTBALL_DATA_API_KEY`; the Session 17
 * brief mentions `FOOTBALL_DATA_API_TOKEN`. Read either, prefer token.
 *
 * TODO: revisit subscription tier before WC 2026 launch —
 *   https://www.football-data.org/pricing
 *   Free is 10 req/min. Every extra market creation adds one list
 *   call/hour + one detail call per settled match. Tier-scale before
 *   launch so settlement never stalls on 429.
 */

const BASE_URL = 'https://api.football-data.org/v4'

function getToken(): string {
  const tok =
    process.env.FOOTBALL_DATA_API_TOKEN ??
    process.env.FOOTBALL_DATA_API_KEY
  if (!tok) throw new Error('FOOTBALL_DATA_API_TOKEN not set')
  return tok
}

function getRatePerMinute(): number {
  const raw = process.env.FOOTBALL_DATA_RATE_PER_MINUTE
  if (!raw) return 10
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return 10
  return n
}

// ─── Token-bucket limiter ─────────────────────────────────────
// Single module-level bucket so every caller in a given process
// shares the same quota. Serverless cold starts reset it, which is
// actually what we want — a fresh cron run starts with a full bucket.

const bucket = (() => {
  let tokens = getRatePerMinute()
  let lastRefill = Date.now()
  let queue: Array<() => void> = []

  // Refill rate: tokens_per_minute / 60_000ms. Drip, not burst.
  function refill() {
    const now = Date.now()
    const elapsed = now - lastRefill
    const capacity = getRatePerMinute()
    const drip = (elapsed / 60_000) * capacity
    if (drip > 0) {
      tokens = Math.min(capacity, tokens + drip)
      lastRefill = now
    }
  }

  function drain() {
    refill()
    while (tokens >= 1 && queue.length > 0) {
      tokens -= 1
      const next = queue.shift()!
      next()
    }
    if (queue.length > 0) {
      // Time until the next whole token drips in.
      const capacity = getRatePerMinute()
      const deficit = 1 - tokens
      const waitMs = Math.ceil((deficit / capacity) * 60_000)
      setTimeout(drain, Math.max(50, waitMs))
    }
  }

  return {
    acquire(): Promise<void> {
      return new Promise((resolve) => {
        queue.push(resolve)
        drain()
      })
    },
  }
})()

// ─── Low-level fetch w/ retry ─────────────────────────────────

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

type FdFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; reason: 'not_covered' | 'other'; body: string }

async function fdFetch<T>(path: string): Promise<FdFetchResult<T>> {
  await bucket.acquire()

  const url = `${BASE_URL}${path}`
  const headers = { 'X-Auth-Token': getToken() }

  // One structural retry for 429; up to 3 attempts for 5xx.
  let attempt = 0
  let retried429 = false
  while (true) {
    attempt++
    const res = await fetch(url, { headers, cache: 'no-store' })

    if (res.ok) {
      const data = (await res.json()) as T
      return { ok: true, data }
    }

    if (res.status === 403) {
      const body = await res.text().catch(() => '')
      console.warn(`[football-data] 403 for ${path} — subscription gap:`, body)
      return { ok: false, status: 403, reason: 'not_covered', body }
    }

    if (res.status === 429 && !retried429) {
      retried429 = true
      const reset =
        Number.parseInt(res.headers.get('X-Requests-Available-Minute') ?? '', 10) ||
        Number.parseInt(res.headers.get('X-RequestCounter-Reset') ?? '', 10) ||
        10
      const waitMs = Math.min(60_000, Math.max(1_000, reset * 1_000)) + 250
      console.warn(`[football-data] 429 on ${path} — sleeping ${waitMs}ms before one retry`)
      await sleep(waitMs)
      continue
    }

    if (res.status >= 500 && attempt < 3) {
      const backoff = 500 * Math.pow(2, attempt - 1)
      console.warn(`[football-data] ${res.status} on ${path} — retrying in ${backoff}ms`)
      await sleep(backoff)
      continue
    }

    const body = await res.text().catch(() => '')
    return { ok: false, status: res.status, reason: 'other', body }
  }
}

// ─── Public API ───────────────────────────────────────────────

export interface FdMatchListItem {
  id: number
  utcDate: string
  status: string
  competition: { code: string; name: string }
  homeTeam: { id: number; tla: string; name: string }
  awayTeam: { id: number; tla: string; name: string }
}

export interface FdMatchListResponse {
  matches: FdMatchListItem[]
  resultSet?: { count: number }
}

/**
 * GET /v4/matches/{id} — full match detail including goals[], bookings[],
 * and per-team statistics. Returns null on 403 (subscription gap).
 */
export async function fetchMatch(matchId: number): Promise<unknown | null> {
  const result = await fdFetch<unknown>(`/matches/${matchId}`)
  if (!result.ok) {
    if (result.reason === 'not_covered') return null
    throw new Error(
      `football-data.org /matches/${matchId} → ${result.status}: ${result.body}`,
    )
  }
  return result.data
}

/**
 * GET /v4/matches?dateFrom=...&dateTo=...&competitions=...
 *
 * @param dateFromISO YYYY-MM-DD (UTC)
 * @param dateToISO   YYYY-MM-DD (UTC)
 * @param competitionCodes e.g. ['WC'] or ['WC','CL','PL']
 *
 * Returns an empty list on 403 (subscription doesn't cover any of the
 * requested competitions) rather than throwing — the caller doesn't
 * need to know the difference.
 */
export async function fetchMatchesInWindow(
  dateFromISO: string,
  dateToISO: string,
  competitionCodes: string[],
): Promise<FdMatchListItem[]> {
  const params = new URLSearchParams({
    dateFrom: dateFromISO,
    dateTo: dateToISO,
    competitions: competitionCodes.join(','),
  })
  const result = await fdFetch<FdMatchListResponse>(`/matches?${params}`)
  if (!result.ok) {
    if (result.reason === 'not_covered') return []
    throw new Error(
      `football-data.org /matches → ${result.status}: ${result.body}`,
    )
  }
  return result.data.matches ?? []
}
