'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '../../components/Card'
import Label from '../../components/Label'
import BetCard from '../../components/BetCard'
import ConnectWalletPrompt from '../../components/ConnectWalletPrompt'
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

function getCountdownStr(kickoff: string): string {
  const diff = new Date(kickoff).getTime() - Date.now()
  if (diff < 0) return 'Starting soon'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h < 1) return `${m} min`
  return `${h}h ${m}m`
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function DailyPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [walletPromptOpen, setWalletPromptOpen] = useState(false)
  const [unclaimed, setUnclaimed] = useState<{ total: number; count: number } | null>(null)

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

  // Fetch unclaimed winnings
  useEffect(() => {
    fetch('/api/bets/unclaimed')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.total > 0) setUnclaimed({ total: data.total, count: data.count })
      })
      .catch(() => {})
  }, [])

  // Separate upcoming vs completed
  const upcoming = matches.filter(m => m.status === 'scheduled')
  const completed = matches.filter(m => m.status === 'completed' || m.status === 'live')

  return (
    <div className="px-4 pt-4 space-y-5 pb-32 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Today&apos;s Matches</h1>
        <p className="text-text-40 text-xs mt-0.5">{formatDate()}</p>
      </div>

      {/* Unclaimed winnings banner */}
      {unclaimed && unclaimed.total > 0 && (
        <Card glow className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <div className="text-left">
              <p className="text-sm font-bold text-polla-success">
                ${unclaimed.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} unclaimed
              </p>
              <p className="text-text-40 text-[10px]">
                {unclaimed.count} winning {unclaimed.count === 1 ? 'bet' : 'bets'} ready to claim
              </p>
            </div>
          </div>
          <span className="text-polla-accent text-xs font-semibold">↓ Scroll to claim</span>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white/[0.06] h-7 w-7" />
                  <div className="rounded-lg bg-white/[0.06] h-4 w-10" />
                  <span className="text-text-25 text-xs">vs</span>
                  <div className="rounded-lg bg-white/[0.06] h-4 w-10" />
                  <div className="rounded-full bg-white/[0.06] h-7 w-7" />
                </div>
                <div className="rounded-lg bg-white/[0.06] h-4 w-14" />
              </div>
            </Card>
          ))}
        </div>
      ) : upcoming.length === 0 && completed.length === 0 ? (
        <EmptyMatches />
      ) : (
        <>
          {/* Upcoming matches with BetCards */}
          {upcoming.length > 0 && (
            <div>
              <Label>Upcoming</Label>
              <div className="space-y-3 mt-2">
                {upcoming.map(match => (
                  <div key={match.id}>
                    {/* Match header */}
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{match.team_a_flag}</span>
                        <span className="text-xs font-semibold">{match.team_a_code}</span>
                        <span className="text-text-25 text-[10px]">vs</span>
                        <span className="text-xs font-semibold">{match.team_b_code}</span>
                        <span className="text-base">{match.team_b_flag}</span>
                      </div>
                      <span className="text-text-40 text-[10px] num">{getCountdownStr(match.kickoff)}</span>
                    </div>
                    {/* Bet card */}
                    <BetCard
                      match={match}
                      onWalletNeeded={() => setWalletPromptOpen(true)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed matches with results + bet outcomes */}
          {completed.length > 0 && (
            <div>
              <Label>Results</Label>
              <div className="space-y-3 mt-2">
                {completed.map(match => (
                  <div key={match.id}>
                    {/* Match result header */}
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{match.team_a_flag}</span>
                        <span className="text-xs font-semibold">{match.team_a_code}</span>
                        <span className="num text-sm font-bold px-1.5">{match.score_a} - {match.score_b}</span>
                        <span className="text-xs font-semibold">{match.team_b_code}</span>
                        <span className="text-base">{match.team_b_flag}</span>
                      </div>
                      <span className="text-text-25 text-[10px]">FT</span>
                    </div>
                    {/* Bet card with claim flow */}
                    <BetCard
                      match={match}
                      onWalletNeeded={() => setWalletPromptOpen(true)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* "No more upcoming" message when only completed remain */}
          {upcoming.length === 0 && completed.length > 0 && (
            <Card className="text-center py-4">
              <p className="text-text-40 text-xs">No more matches today</p>
            </Card>
          )}
        </>
      )}

      {/* Connect Wallet Prompt */}
      {walletPromptOpen && (
        <ConnectWalletPrompt
          onClose={() => setWalletPromptOpen(false)}
          onConnected={() => setWalletPromptOpen(false)}
        />
      )}
    </div>
  )
}
