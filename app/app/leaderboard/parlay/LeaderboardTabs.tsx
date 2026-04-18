'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { PARLAY_COPY } from '@/lib/parlay/copy'

type Scope = 'today' | 'week' | 'tournament'

interface Entry {
  rank: number
  user_id: string
  username: string
  avatar_emoji: string
  total_score: number
  total_stake: number
  total_winnings: number
  ticket_count: number
}

interface Payload {
  scope: Scope
  entries: Entry[]
  total_players: number
  me: { rank: number; total_score: number; total_players: number } | null
}

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'today', label: PARLAY_COPY.leaderboardTabToday },
  { id: 'week', label: PARLAY_COPY.leaderboardTabWeek },
  { id: 'tournament', label: PARLAY_COPY.leaderboardTabTournament },
]

export default function LeaderboardTabs() {
  const [scope, setScope] = useState<Scope>('today')
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    let aborted = false
    setLoading(true)
    fetch(`/api/parlay/leaderboard?scope=${scope}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!aborted) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!aborted) setLoading(false)
      })
    return () => { aborted = true }
  }, [scope])

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
        {SCOPES.map(s => (
          <button
            key={s.id}
            role="tab"
            aria-selected={scope === s.id}
            onClick={() => setScope(s.id)}
            className={`flex-1 min-h-[44px] py-2 rounded-lg text-xs font-bold transition-colors ${
              scope === s.id ? 'bg-polla-accent/20 text-polla-accent' : 'text-text-40'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card h-14 skeleton-pulse" />
          ))}
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-text-40 text-sm">{PARLAY_COPY.leaderboardEmpty}</p>
        </div>
      ) : (
        <>
          <div className="glass-card overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_60px_80px_50px] gap-2 px-3 py-2 border-b border-card-border text-text-25 text-[10px] uppercase tracking-wider font-bold">
              <span>{PARLAY_COPY.leaderboardColRank}</span>
              <span>{PARLAY_COPY.leaderboardColPlayer}</span>
              <span className="text-right">{PARLAY_COPY.leaderboardColScore}</span>
              <span className="text-right">{PARLAY_COPY.leaderboardColWinnings}</span>
              <span className="text-right">{PARLAY_COPY.leaderboardColTickets}</span>
            </div>
            {data.entries.map(e => {
              const isMe = user?.id === e.user_id
              return (
                <div
                  key={e.user_id}
                  className={`grid grid-cols-[40px_1fr_60px_80px_50px] gap-2 px-3 py-3 border-b border-card-border/50 items-center ${
                    isMe ? 'bg-polla-accent/10' : ''
                  }`}
                >
                  <span className="num text-sm text-text-70">{e.rank}</span>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-lg flex-shrink-0">{e.avatar_emoji}</span>
                    <span className="text-sm text-text-100 truncate">
                      {e.username}
                      {isMe && <span className="ml-1 text-polla-accent text-[10px]">({PARLAY_COPY.leaderboardMe})</span>}
                    </span>
                  </span>
                  <span className="num text-sm text-right text-polla-success">{e.total_score}</span>
                  <span className="num text-sm text-right text-polla-gold">${e.total_winnings.toFixed(0)}</span>
                  <span className="num text-xs text-right text-text-40">{e.ticket_count}</span>
                </div>
              )
            })}
          </div>

          {data.me && data.me.rank > 100 && (
            <div className="glass-card p-3 text-center border-polla-accent/40">
              <p className="text-text-70 text-sm">
                {PARLAY_COPY.leaderboardCtaPosition(data.me.rank, data.me.total_players)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
