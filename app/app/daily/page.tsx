'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Label from '../../components/Label'
import { EmptyMatches } from '../../components/EmptyState'

interface ParlaySummary {
  status: string
  locks_at: string
  gross_pool_usdc: number
  tier5_multiplier: number
  tier4_multiplier: number
  tier3_multiplier: number
}

interface Match {
  id: string
  match_number: number
  stage: string
  group_letter: string | null
  team_a_name: string
  team_a_code: string
  team_a_flag: string
  team_b_name: string
  team_b_code: string
  team_b_flag: string
  kickoff: string
  venue: string
  city: string
  score_a: number | null
  score_b: number | null
  status: string
  parlay: ParlaySummary | null
}

const ET_OFFSET_MS = 4 * 60 * 60 * 1000

function etDayKey(iso: string): string {
  const et = new Date(new Date(iso).getTime() - ET_OFFSET_MS)
  return et.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function kickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPool(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return `$${n.toFixed(0)}`
}

function formatCountdown(msUntil: number): string {
  if (msUntil <= 0) return 'Locked'
  const s = Math.floor(msUntil / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${ss}s`
  return `${ss}s`
}

export default function DailyPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/daily/matches')
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMatches() }, [fetchMatches])

  // Tick once per second so countdowns stay live.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const groupedByDay = useMemo<[string, Match[]][]>(() => {
    const dayMap = new Map<string, Match[]>()
    const order: string[] = []
    for (const m of matches) {
      const key = etDayKey(m.kickoff)
      if (!dayMap.has(key)) {
        dayMap.set(key, [])
        order.push(key)
      }
      dayMap.get(key)!.push(m)
    }
    return order.map(k => [k, dayMap.get(k)!])
  }, [matches])

  return (
    <div className="px-4 pt-4 space-y-5 pb-32 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold">World Cup 2026</h1>
        <p className="text-text-40 text-xs mt-0.5">104 parlays · pick 5 per match</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-28 skeleton-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <EmptyMatches />
      ) : (
        <div className="space-y-6">
          {groupedByDay.map(([dayLabel, dayMatches]) => (
            <div key={dayLabel}>
              <Label>{dayLabel}</Label>
              <div className="space-y-3 mt-2">
                {dayMatches.map(match => (
                  <ParlayMatchCard key={match.id} match={match} now={now} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ParlayMatchCard({ match, now }: { match: Match; now: number }) {
  const kickoff = new Date(match.kickoff).getTime()
  const hasScore = match.score_a !== null && match.score_b !== null
  const stageLabel = match.group_letter ? `Group ${match.group_letter}` : match.stage
  const parlay = match.parlay

  return (
    <Link
      href={`/app/match/${match.id}`}
      className="block active:scale-[0.98] transition-transform"
    >
      <div className="glass-card overflow-hidden">
        {/* Top row — teams + kickoff */}
        <div className="px-4 pt-3 pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TeamBadge flag={match.team_a_flag} code={match.team_a_code} />
            <span className="text-text-25 text-xs">vs</span>
            <TeamBadge flag={match.team_b_flag} code={match.team_b_code} />
          </div>
          <div className="text-right flex-shrink-0">
            {hasScore ? (
              <span className="num text-sm font-bold text-text-100">
                {match.score_a} – {match.score_b}
              </span>
            ) : (
              <span className="text-text-70 text-xs font-semibold num">
                {kickoffTime(match.kickoff)}
              </span>
            )}
            <p className="text-text-40 text-[10px] mt-0.5">{stageLabel}</p>
          </div>
        </div>

        {/* Market rail — prediction-market-style strip */}
        <ParlayRail parlay={parlay} kickoff={kickoff} matchStatus={match.status} now={now} />
      </div>
    </Link>
  )
}

function TeamBadge({ flag, code }: { flag: string; code: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-lg">{flag}</span>
      <span className="text-sm font-semibold">{code}</span>
    </span>
  )
}

function ParlayRail({
  parlay, kickoff, matchStatus, now,
}: {
  parlay: ParlaySummary | null
  kickoff: number
  matchStatus: string
  now: number
}) {
  const isLive = matchStatus === 'live'
  const isDone = matchStatus === 'completed'

  // No parlay market yet → ghost rail with CTA
  if (!parlay) {
    if (isDone) {
      return (
        <div className="px-4 py-2.5 border-t border-card-border bg-white/[0.02]">
          <span className="text-text-40 text-xs">Match final</span>
        </div>
      )
    }
    return (
      <div className="px-4 py-2.5 border-t border-card-border bg-white/[0.02] flex items-center justify-between">
        <span className="text-text-40 text-xs">Parlay opens 24h before kickoff</span>
        <span className="text-polla-accent text-xs font-bold">→</span>
      </div>
    )
  }

  const status = parlay.status
  const locksAtMs = new Date(parlay.locks_at).getTime()
  const msUntilLock = locksAtMs - now
  const pool = parlay.gross_pool_usdc
  const mult = parlay.tier5_multiplier

  if (status === 'settled') {
    return (
      <div className="px-4 py-2.5 border-t border-card-border bg-white/[0.02] flex items-center justify-between">
        <span className="text-text-40 text-xs">Parlay settled</span>
        <span className="num text-xs text-text-70">Pool {formatPool(pool)}</span>
      </div>
    )
  }

  if (status === 'voided') {
    return (
      <div className="px-4 py-2.5 border-t border-card-border bg-white/[0.02]">
        <span className="text-polla-warning text-xs">Parlay voided — refunds pending</span>
      </div>
    )
  }

  if (status === 'manual_review') {
    return (
      <div className="px-4 py-2.5 border-t border-card-border bg-white/[0.02]">
        <span className="text-text-40 text-xs">Verifying result</span>
      </div>
    )
  }

  // open / locked / settling
  const isOpen = status === 'open' && msUntilLock > 0
  const statusPill = isOpen
    ? { label: 'OPEN', className: 'bg-polla-success/15 text-polla-success border-polla-success/40' }
    : isLive
      ? { label: 'LIVE', className: 'bg-polla-accent-dark/15 text-polla-accent-dark border-polla-accent-dark/40' }
      : { label: 'LOCKED', className: 'bg-white/5 text-text-40 border-card-border' }

  const urgent = isOpen && msUntilLock < 10 * 60 * 1000 && msUntilLock > 0

  return (
    <div className="border-t border-card-border bg-white/[0.02]">
      <div className="px-4 py-2.5 grid grid-cols-[auto_1fr_auto] gap-4 items-center">
        {/* Pool */}
        <div className="flex flex-col">
          <span className="label">Pool</span>
          <span className="num text-sm text-polla-gold">{formatPool(pool)}</span>
        </div>

        {/* Multiplier */}
        <div className="flex flex-col items-center">
          <span className="label">Up to</span>
          <span className={`num text-sm ${mult > 0 ? 'text-polla-success' : 'text-text-40'}`}>
            {mult > 0 ? `${mult.toFixed(1)}x` : '—'}
          </span>
        </div>

        {/* Status pill + countdown */}
        <div className="flex flex-col items-end">
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${statusPill.className}`}>
            {statusPill.label}
          </span>
          {isOpen && (
            <span
              className={`num text-[11px] mt-0.5 ${urgent ? 'text-polla-accent-dark' : 'text-text-40'}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCountdown(msUntilLock)}
            </span>
          )}
          {!isOpen && kickoff > now && (
            <span className="text-text-25 text-[11px] mt-0.5 num">
              Kicks in {formatCountdown(kickoff - now)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
