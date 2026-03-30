'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '../../components/Card'
import Label from '../../components/Label'
import MiniPredictions from '../../components/MiniPredictions'
import CardAlbum from '../../components/CardAlbum'
import PackOpening from '../../components/PackOpening'
import BetCard from '../../components/BetCard'
import ConnectWalletPrompt from '../../components/ConnectWalletPrompt'
import { useAuth } from '../../contexts/AuthContext'

const PACK_MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 3000]

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

interface MiniPred {
  first_to_score: string | null
  total_goals: string | null
  both_score: string | null
  early_goal: string | null
  motm: string | null
  correct_count: number | null
  xp_earned: number | null
  scored_at: string | null
}

function getNextMilestone(xp: number): number {
  for (const m of PACK_MILESTONES) {
    if (xp < m) return m
  }
  return PACK_MILESTONES[PACK_MILESTONES.length - 1]
}

function getPrevMilestone(xp: number): number {
  let prev = 0
  for (const m of PACK_MILESTONES) {
    if (xp < m) return prev
    prev = m
  }
  return prev
}

function getCountdownStr(kickoff: string): string {
  const diff = new Date(kickoff).getTime() - Date.now()
  if (diff <= 0) return 'Live'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}m`
}

export default function DailyPage() {
  const { profile, refreshProfile } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, MiniPred>>({})
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [loginRecorded, setLoginRecorded] = useState(false)
  const [view, setView] = useState<'daily' | 'album' | 'packs'>('daily')
  const [walletPromptOpen, setWalletPromptOpen] = useState(false)
  const [unclaimed, setUnclaimed] = useState<{ total: number; count: number } | null>(null)

  const totalXp = profile?.total_xp ?? 0
  const streakDays = profile?.streak_days ?? 0
  const cardsCollected = profile?.cards_collected ?? 0
  const packsEarned = profile?.packs_earned ?? 0
  const nextMilestone = getNextMilestone(totalXp)
  const prevMilestone = getPrevMilestone(totalXp)
  const xpProgress = nextMilestone > prevMilestone
    ? ((totalXp - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100

  // Unopened packs badge
  const unopenedPacks = packsEarned - cardsCollected // simplified estimate

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/daily/matches')
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches || [])
        setPredictions(data.predictions || {})
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Record daily login on mount
  useEffect(() => {
    if (!loginRecorded) {
      setLoginRecorded(true)
      fetch('/api/daily/login', { method: 'POST' }).then(() => {
        refreshProfile()
      })
    }
  }, [loginRecorded, refreshProfile])

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

  // Card Album view
  if (view === 'album') {
    return (
      <CardAlbum
        onBack={() => setView('daily')}
        onOpenPacks={() => setView('packs')}
        unopenedCount={unopenedPacks > 0 ? unopenedPacks : 0}
      />
    )
  }

  // Pack Opening view
  if (view === 'packs') {
    return (
      <PackOpening
        onBack={() => setView('album')}
      />
    )
  }

  // If a match is selected, show MiniPredictions
  if (selectedMatch) {
    return (
      <MiniPredictions
        match={selectedMatch}
        existing={predictions[selectedMatch.id] ?? null}
        onBack={() => setSelectedMatch(null)}
        onSubmitted={() => {
          fetchMatches()
          refreshProfile()
        }}
      />
    )
  }

  return (
    <div className="px-4 pt-4 space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Today&apos;s Matches</h1>
          <p className="text-text-40 text-xs mt-0.5">Predict daily, earn XP & collectibles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('album')}
            className="relative w-9 h-9 rounded-xl bg-card border border-card-border flex items-center justify-center text-base active:scale-90 transition-transform"
          >
            🃏
            {unopenedPacks > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-polla-accent text-[9px] num flex items-center justify-center">
                {unopenedPacks}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* XP Summary Strip */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <Label>Total XP</Label>
          <p className="num text-lg mt-0.5">{totalXp}</p>
        </div>
        <div className="w-px h-8 bg-card-border" />
        <div className="text-center flex-1">
          <Label>Day Streak</Label>
          <p className="num text-lg mt-0.5 text-polla-gold">
            {streakDays > 0 ? `🔥 ${streakDays}` : '0'}
          </p>
        </div>
        <div className="w-px h-8 bg-card-border" />
        <div className="text-center flex-1">
          <Label>Cards</Label>
          <p className="num text-lg mt-0.5">{cardsCollected}/85</p>
        </div>
      </div>

      {/* XP Progress Bar */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <Label>XP Progress — Next Pack</Label>
          <span className="text-text-70 text-xs num">{totalXp} / {nextMilestone} XP</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-rarity-epic transition-all"
            style={{ width: `${Math.min(xpProgress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-text-25 text-[10px]">
            Pack {Math.min(packsEarned + 1, 8)}: {nextMilestone} XP
          </span>
          <span className="text-text-25 text-[10px]">{packsEarned} packs earned</span>
        </div>
      </Card>

      {/* Unclaimed winnings banner */}
      {unclaimed && unclaimed.total > 0 && (
        <button
          onClick={() => {/* scroll to completed bets */}}
          className="w-full"
        >
          <Card glow className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <div className="text-left">
                <p className="text-sm font-bold text-polla-success">
                  ${unclaimed.total.toFixed(2)} unclaimed
                </p>
                <p className="text-text-40 text-[10px]">
                  {unclaimed.count} winning {unclaimed.count === 1 ? 'bet' : 'bets'} ready to claim
                </p>
              </div>
            </div>
            <span className="text-polla-accent text-xs font-semibold">Claim →</span>
          </Card>
        </button>
      )}

      {/* Motivational banner */}
      <Card glow className="text-center py-3">
        <p className="text-sm">
          🎯 <span className="font-semibold">5 predictions per match</span>
          <span className="text-text-40"> — 10 XP each correct</span>
        </p>
        <p className="text-text-40 text-xs mt-1">Perfect 5/5 = +25 bonus XP</p>
      </Card>

      {/* Today's Upcoming Matches */}
      <div>
        <Label>Upcoming</Label>
        {loading ? (
          <Card className="mt-2 text-center py-8">
            <p className="text-text-40 text-sm">Loading matches...</p>
          </Card>
        ) : upcoming.length === 0 && completed.length === 0 ? (
          <Card className="mt-2 text-center py-10">
            <span className="text-3xl block mb-3">🎯</span>
            <p className="text-text-40 text-sm">No matches today</p>
            <p className="text-text-25 text-xs mt-1">Tournament starts June 11, 2026</p>
          </Card>
        ) : upcoming.length === 0 ? (
          <Card className="mt-2 text-center py-4">
            <p className="text-text-40 text-xs">No more matches today</p>
          </Card>
        ) : (
          <div className="space-y-2 mt-2">
            {upcoming.map(match => {
              const hasPred = !!predictions[match.id]
              return (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className="w-full text-left"
                >
                  <Card className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{match.team_a_flag}</span>
                        <span className="text-xs font-semibold">{match.team_a_code}</span>
                      </div>
                      <span className="text-text-25 text-xs">vs</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{match.team_b_code}</span>
                        <span className="text-lg">{match.team_b_flag}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasPred && (
                        <span className="text-polla-success text-xs">✓</span>
                      )}
                      <div className="text-right">
                        <p className="text-text-40 text-[10px]">{getCountdownStr(match.kickoff)}</p>
                        <p className="text-polla-accent text-xs font-semibold">
                          {hasPred ? 'Edit' : 'Predict'} →
                        </p>
                      </div>
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Match Bets — real USDC pari-mutuel */}
      {upcoming.length > 0 && (
        <div>
          <Label>Match Bets (USDC)</Label>
          <div className="space-y-3 mt-2">
            {upcoming.map(match => (
              <BetCard
                key={`bet-${match.id}`}
                match={match}
                onWalletNeeded={() => setWalletPromptOpen(true)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Bets — completed matches with claim flow */}
      {completed.length > 0 && (
        <div>
          <Label>Bet Results</Label>
          <div className="space-y-3 mt-2">
            {completed.map(match => (
              <BetCard
                key={`bet-resolved-${match.id}`}
                match={match}
                onWalletNeeded={() => setWalletPromptOpen(true)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Matches */}
      {completed.length > 0 && (
        <div>
          <Label>Completed</Label>
          <div className="space-y-2 mt-2">
            {completed.map(match => {
              const pred = predictions[match.id] as MiniPred | undefined
              return (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(match)}
                  className="w-full text-left"
                >
                  <Card className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{match.team_a_flag}</span>
                        <span className="text-xs font-semibold">{match.team_a_code}</span>
                      </div>
                      <div className="num text-sm font-bold px-2">
                        {match.score_a} - {match.score_b}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{match.team_b_code}</span>
                        <span className="text-lg">{match.team_b_flag}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {pred?.scored_at ? (
                        <>
                          <p className="text-polla-gold num text-xs font-bold">
                            {pred.correct_count}/5
                          </p>
                          <p className="text-text-40 text-[10px]">+{pred.xp_earned} XP</p>
                        </>
                      ) : pred ? (
                        <p className="text-text-40 text-[10px]">Awaiting results</p>
                      ) : (
                        <p className="text-text-25 text-[10px]">No prediction</p>
                      )}
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Connect Wallet Prompt */}
      {walletPromptOpen && (
        <ConnectWalletPrompt
          onClose={() => setWalletPromptOpen(false)}
          onConnected={() => setWalletPromptOpen(false)}
        />
      )}

      {/* Streak Card */}
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-semibold">Daily Streak</p>
            <p className="text-text-40 text-xs">Log in daily to build your streak and earn bonus XP</p>
          </div>
          <span className="num text-lg text-polla-gold ml-auto">{streakDays}</span>
        </div>
        <div className="flex gap-1 mt-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full ${
                i < streakDays % 7
                  ? 'bg-gradient-to-r from-polla-warning to-polla-gold'
                  : 'bg-white/[0.06]'
              }`}
            />
          ))}
        </div>
        <p className="text-text-25 text-[10px] mt-2">
          Streak bonus: +{5 * (streakDays || 1)} XP per day
        </p>
      </Card>
    </div>
  )
}
