'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Card from '../../components/Card'
import Label from '../../components/Label'
import { EmptyMatches } from '../../components/EmptyState'

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
}

// Schedule times are ET (UTC-4 in June). Group by ET calendar day so
// 01:00 UTC on June 13 (= 21:00 ET June 12) groups under June 12.
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

function formatKickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export default function DailyPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  // Group matches by ET calendar day, preserving kickoff order.
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
        <p className="text-text-40 text-xs mt-0.5">104 matches · tap to predict</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-16 skeleton-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <EmptyMatches />
      ) : (
        <div className="space-y-5">
          {groupedByDay.map(([dayLabel, dayMatches]) => (
            <div key={dayLabel}>
              <Label>{dayLabel}</Label>
              <div className="space-y-2.5 mt-2">
                {dayMatches.map(match => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MatchRow({ match }: { match: Match }) {
  const kickoff = new Date(match.kickoff).getTime()
  const isLive = match.status === 'live'
  const isDone = match.status === 'completed'
  const isFuture = kickoff > Date.now() && match.status === 'scheduled'

  const hasScore = match.score_a !== null && match.score_b !== null

  return (
    <Link
      href={`/app/match/${match.id}`}
      className="block active:scale-[0.98] transition-transform"
    >
      <Card className="py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base">{match.team_a_flag}</span>
              <span className="text-sm font-semibold truncate">{match.team_a_name}</span>
              {hasScore && (
                <span className="num text-sm font-bold text-text-100 ml-auto">{match.score_a}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base">{match.team_b_flag}</span>
              <span className="text-sm font-semibold truncate">{match.team_b_name}</span>
              {hasScore && (
                <span className="num text-sm font-bold text-text-100 ml-auto">{match.score_b}</span>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            {isLive && (
              <p className="text-polla-accent-dark text-[10px] font-bold uppercase tracking-wider">Live</p>
            )}
            {isDone && (
              <p className="text-text-40 text-[10px] uppercase tracking-wider">FT</p>
            )}
            {isFuture && (
              <p className="text-text-70 text-xs font-semibold">{formatKickoffTime(match.kickoff)}</p>
            )}
            <p className="text-text-40 text-[10px] mt-0.5">
              {match.group_letter ? `Group ${match.group_letter}` : match.stage}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  )
}
