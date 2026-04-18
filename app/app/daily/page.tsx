'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Label from '../../components/Label'
import { EmptyMatches } from '../../components/EmptyState'
import ParlayMatchCard, { type ParlayMatchSummary } from '../../components/parlay/ParlayMatchCard'

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

export default function DailyPage() {
  const [matches, setMatches] = useState<ParlayMatchSummary[]>([])
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

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const groupedByDay = useMemo<[string, ParlayMatchSummary[]][]>(() => {
    const dayMap = new Map<string, ParlayMatchSummary[]>()
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
