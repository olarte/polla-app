'use client'

import Link from 'next/link'

export interface ParlaySummary {
  status: string
  locks_at: string
  gross_pool_usdc: number
  tier5_multiplier: number
  tier4_multiplier: number
  tier3_multiplier: number
}

export interface ParlayMatchSummary {
  id: string
  stage: string
  group_letter: string | null
  team_a_code: string
  team_a_flag: string
  team_b_code: string
  team_b_flag: string
  kickoff: string
  score_a: number | null
  score_b: number | null
  status: string
  parlay: ParlaySummary | null
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

function kickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ParlayMatchCard({
  match,
  now,
}: {
  match: ParlayMatchSummary
  now: number
}) {
  const kickoff = new Date(match.kickoff).getTime()
  const hasScore = match.score_a !== null && match.score_b !== null
  const stageLabel = match.group_letter ? `Group ${match.group_letter}` : match.stage

  return (
    <Link
      href={`/app/match/${match.id}`}
      className="block active:scale-[0.98] transition-transform"
    >
      <div className="glass-card overflow-hidden">
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

        <ParlayRail
          parlay={match.parlay}
          kickoff={kickoff}
          matchStatus={match.status}
          now={now}
        />
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
        <div className="flex flex-col">
          <span className="label">Pool</span>
          <span className="num text-sm text-polla-gold">{formatPool(pool)}</span>
        </div>

        <div className="flex flex-col items-center">
          <span className="label">Up to</span>
          <span className={`num text-sm ${mult > 0 ? 'text-polla-success' : 'text-text-40'}`}>
            {mult > 0 ? `${mult.toFixed(1)}x` : '—'}
          </span>
        </div>

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
