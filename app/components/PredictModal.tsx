'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useAuth } from '../contexts/AuthContext'
import { GROUPS, ALL_TEAMS, LOCK_DEADLINE } from '@/lib/world-cup-data'
import type { Database } from '@/lib/database.types'
import Label from './Label'
import MatchDetail from './MatchDetail'

type Match = Database['public']['Tables']['matches']['Row']
type Prediction = Database['public']['Tables']['predictions']['Row']
type BonusPrediction = Database['public']['Tables']['bonus_predictions']['Row']

const GROUP_TABS = GROUPS.map((g) => g.letter)
const BONUS_TYPES = [
  { type: 'champion', label: 'Champion', points: 20, inputType: 'team' as const },
  { type: 'runner_up', label: 'Runner-up', points: 10, inputType: 'team' as const },
  { type: 'third_place', label: 'Third Place', points: 5, inputType: 'team' as const },
  { type: 'golden_boot', label: 'Golden Boot', points: 15, inputType: 'text' as const },
  { type: 'golden_ball', label: 'Golden Ball', points: 10, inputType: 'text' as const },
  ...GROUPS.map((g) => ({
    type: `group_winner_${g.letter}`,
    label: `Group ${g.letter} Winner`,
    points: 5,
    inputType: 'group_team' as const,
    groupLetter: g.letter,
  })),
]

interface PredictModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PredictModal({ isOpen, onClose }: PredictModalProps) {
  const [supabase] = useState(() => createClient())
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('A')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, { score_a: number; score_b: number }>>({})
  const [bonusPredictions, setBonusPredictions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [detailMatch, setDetailMatch] = useState<Match | null>(null)
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const bonusTimers = useRef<Record<string, NodeJS.Timeout>>({})

  const isLocked = new Date() >= LOCK_DEADLINE

  // ── Load matches + predictions ──
  useEffect(() => {
    if (!isOpen || !user) return

    async function load() {
      setLoading(true)
      const [matchRes, predRes, bonusRes] = await Promise.all([
        supabase.from('matches').select('*').order('match_number'),
        supabase.from('predictions').select('*').eq('user_id', user!.id),
        supabase.from('bonus_predictions').select('*').eq('user_id', user!.id),
      ])

      if (matchRes.data) setMatches(matchRes.data)

      if (predRes.data) {
        const map: Record<string, { score_a: number; score_b: number }> = {}
        for (const p of predRes.data) {
          map[p.match_id] = { score_a: p.score_a, score_b: p.score_b }
        }
        setPredictions(map)
      }

      if (bonusRes.data) {
        const map: Record<string, string> = {}
        for (const b of bonusRes.data) {
          map[b.prediction_type] = b.value
        }
        setBonusPredictions(map)
      }

      setLoading(false)
    }

    load()
  }, [isOpen, user, supabase])

  // ── Debounced auto-save prediction ──
  const savePrediction = useCallback(
    (matchId: string, scoreA: number, scoreB: number) => {
      if (!user || isLocked) return

      // Clear existing timer
      if (saveTimers.current[matchId]) {
        clearTimeout(saveTimers.current[matchId])
      }

      saveTimers.current[matchId] = setTimeout(async () => {
        await supabase.from('predictions').upsert(
          {
            user_id: user.id,
            match_id: matchId,
            score_a: scoreA,
            score_b: scoreB,
          },
          { onConflict: 'user_id,match_id' }
        )
      }, 800)
    },
    [user, supabase, isLocked]
  )

  // ── Debounced auto-save bonus prediction ──
  const saveBonusPrediction = useCallback(
    (type: string, value: string) => {
      if (!user || isLocked) return

      if (bonusTimers.current[type]) {
        clearTimeout(bonusTimers.current[type])
      }

      bonusTimers.current[type] = setTimeout(async () => {
        if (value.trim()) {
          await supabase.from('bonus_predictions').upsert(
            {
              user_id: user.id,
              prediction_type: type,
              value: value.trim(),
            },
            { onConflict: 'user_id,prediction_type' }
          )
        }
      }, 800)
    },
    [user, supabase, isLocked]
  )

  // ── Score change handler ──
  const handleScore = (matchId: string, side: 'a' | 'b', value: number) => {
    if (isLocked) return
    const clamped = Math.max(0, Math.min(20, value))
    const current = predictions[matchId] ?? { score_a: 0, score_b: 0 }
    const updated = side === 'a'
      ? { ...current, score_a: clamped }
      : { ...current, score_b: clamped }

    setPredictions((prev) => ({ ...prev, [matchId]: updated }))
    savePrediction(matchId, updated.score_a, updated.score_b)
  }

  // ── Bonus change handler ──
  const handleBonus = (type: string, value: string) => {
    if (isLocked) return
    setBonusPredictions((prev) => ({ ...prev, [type]: value }))
    saveBonusPrediction(type, value)
  }

  // ── Filter matches by active tab ──
  const filteredMatches =
    activeTab === 'Bonus'
      ? []
      : activeTab === 'KO'
        ? matches.filter((m) => m.stage !== 'group')
        : matches.filter((m) => m.group_letter === activeTab)

  // ── Progress calc ──
  const groupMatches = matches.filter((m) => m.stage === 'group')
  const predictedCount = groupMatches.filter((m) => predictions[m.id]).length
  const totalMatchCount = matches.length
  const totalPredicted = matches.filter((m) => predictions[m.id]).length
  const progressPct = totalMatchCount > 0 ? Math.round((totalPredicted / totalMatchCount) * 100) : 0

  // ── Time until lock ──
  const timeToLock = LOCK_DEADLINE.getTime() - Date.now()
  const daysToLock = Math.max(0, Math.floor(timeToLock / 86400000))

  if (!isOpen) return null

  // ── Show match detail ──
  if (detailMatch) {
    return (
      <MatchDetail
        match={detailMatch}
        prediction={predictions[detailMatch.id]}
        onScoreChange={(side, val) => handleScore(detailMatch.id, side, val)}
        onBack={() => setDetailMatch(null)}
        isLocked={isLocked}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-polla-bg flex flex-col">
      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-2 border-b border-card-border">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onClose}
            className="text-text-40 text-sm font-medium active:text-white transition-colors"
          >
            ← Done
          </button>
          <h1 className="text-sm font-bold">Predict the World Cup</h1>
          <div className="w-14" />
        </div>

        {/* Lock deadline warning */}
        {!isLocked && daysToLock <= 30 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polla-warning/10 border border-polla-warning/20 mb-2">
            <span className="text-polla-warning text-xs">⏰</span>
            <span className="text-polla-warning text-[11px]">
              Predictions lock {daysToLock > 0 ? `in ${daysToLock} days` : 'today'}
              {' · '}Jun 11 at kickoff
            </span>
          </div>
        )}
        {isLocked && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-polla-accent/10 border border-polla-accent/20 mb-2">
            <span className="text-polla-accent text-xs">🔒</span>
            <span className="text-polla-accent text-[11px]">Predictions are locked</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center justify-between mb-1">
          <Label>Progress</Label>
          <span className="text-text-40 text-[10px] num">{totalPredicted} of {totalMatchCount} predicted</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="px-2 py-2 border-b border-card-border overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {GROUP_TABS.map((tab) => {
            const tabMatches = matches.filter((m) => m.group_letter === tab)
            const tabPredicted = tabMatches.filter((m) => predictions[m.id]).length
            const isComplete = tabMatches.length > 0 && tabPredicted === tabMatches.length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-polla-accent text-white'
                    : isComplete
                      ? 'bg-polla-success/15 text-polla-success border border-polla-success/20'
                      : 'bg-card text-text-40 border border-card-border'
                }`}
              >
                {tab}
              </button>
            )
          })}
          <button
            onClick={() => setActiveTab('Bonus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'Bonus'
                ? 'bg-polla-accent text-white'
                : 'bg-card text-text-40 border border-card-border'
            }`}
          >
            ⭐
          </button>
          <button
            onClick={() => setActiveTab('KO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'KO'
                ? 'bg-polla-accent text-white'
                : 'bg-card text-text-25 border border-card-border'
            }`}
          >
            KO 🔒
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-text-40 text-sm">Loading matches...</div>
          </div>
        ) : activeTab === 'Bonus' ? (
          <BonusTab
            bonusPredictions={bonusPredictions}
            onBonusChange={handleBonus}
            isLocked={isLocked}
          />
        ) : activeTab === 'KO' ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-text-40 text-sm font-semibold">Knockout Stage</p>
            <p className="text-text-25 text-xs mt-1">
              Knockout predictions will unlock after the group stage
            </p>
          </div>
        ) : (
          <>
            {/* Group header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Group {activeTab}</p>
                <p className="text-text-40 text-[10px] mt-0.5">
                  {GROUPS.find((g) => g.letter === activeTab)?.teams.map((t) => `${t.flag} ${t.code}`).join('  ·  ')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-text-40 text-[10px] num">
                  {filteredMatches.filter((m) => predictions[m.id]).length}/{filteredMatches.length}
                </span>
              </div>
            </div>

            {/* Match cards */}
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictions[match.id]}
                onScoreChange={(side, val) => handleScore(match.id, side, val)}
                onDetails={() => setDetailMatch(match)}
                isLocked={isLocked}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ── Match Card ──────────────────────────────────────────────

interface MatchCardProps {
  match: Match
  prediction?: { score_a: number; score_b: number }
  onScoreChange: (side: 'a' | 'b', value: number) => void
  onDetails: () => void
  isLocked: boolean
}

function MatchCard({ match, prediction, onScoreChange, onDetails, isLocked }: MatchCardProps) {
  const kickoff = new Date(match.kickoff)
  const dateStr = kickoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = kickoff.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const isPredicted = prediction !== undefined

  return (
    <div className={`glass-card p-3 ${isPredicted ? 'border-polla-success/20' : ''}`}>
      {/* Date + venue row */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-text-40 text-[10px]">{dateStr} · {timeStr}</span>
          {match.multiplier > 1 && (
            <span className="text-polla-gold text-[10px] num">{match.multiplier}x</span>
          )}
        </div>
        <button
          onClick={onDetails}
          className="text-polla-accent text-[10px] font-semibold active:opacity-70 transition-opacity"
        >
          Details ↗
        </button>
      </div>

      {/* Teams + score inputs */}
      <div className="flex items-center gap-3">
        {/* Team A */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-lg">{match.team_a_flag}</span>
          <span className="text-xs font-semibold truncate">{match.team_a_code}</span>
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-2">
          <ScoreInput
            value={prediction?.score_a}
            onChange={(v) => onScoreChange('a', v)}
            disabled={isLocked}
          />
          <span className="text-text-25 text-xs font-bold">-</span>
          <ScoreInput
            value={prediction?.score_b}
            onChange={(v) => onScoreChange('b', v)}
            disabled={isLocked}
          />
        </div>

        {/* Team B */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className="text-xs font-semibold truncate">{match.team_b_code}</span>
          <span className="text-lg">{match.team_b_flag}</span>
        </div>
      </div>

      {/* Venue */}
      <div className="mt-2">
        <span className="text-text-25 text-[9px]">{match.venue}, {match.city}</span>
      </div>
    </div>
  )
}

// ── Score Input ─────────────────────────────────────────────

interface ScoreInputProps {
  value?: number
  onChange: (value: number) => void
  disabled: boolean
}

function ScoreInput({ value, onChange, disabled }: ScoreInputProps) {
  const hasValue = value !== undefined
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={20}
      value={hasValue ? value : ''}
      placeholder="–"
      onChange={(e) => {
        const v = e.target.value
        if (v === '') return
        onChange(parseInt(v, 10))
      }}
      disabled={disabled}
      className={`w-10 h-10 rounded-lg text-center text-sm font-extrabold num
        bg-white/[0.04] border transition-colors outline-none
        ${hasValue
          ? 'border-polla-accent/40 text-white'
          : 'border-card-border text-text-25'
        }
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'focus:border-polla-accent'}
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
    />
  )
}

// ── Bonus Predictions Tab ───────────────────────────────────

interface BonusTabProps {
  bonusPredictions: Record<string, string>
  onBonusChange: (type: string, value: string) => void
  isLocked: boolean
}

function BonusTab({ bonusPredictions, onBonusChange, isLocked }: BonusTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold mb-1">Bonus Predictions</p>
        <p className="text-text-40 text-[11px]">
          Earn extra points for predicting tournament outcomes
        </p>
      </div>

      {/* Main bonus predictions */}
      <div className="space-y-3">
        <Label>Tournament Results</Label>
        {BONUS_TYPES.filter((b) => b.inputType === 'team' || b.inputType === 'text').map((bonus) => (
          <div key={bonus.type} className="glass-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">{bonus.label}</span>
              <span className="text-polla-gold text-[10px] num">+{bonus.points} pts</span>
            </div>
            {bonus.inputType === 'team' ? (
              <select
                value={bonusPredictions[bonus.type] ?? ''}
                onChange={(e) => onBonusChange(bonus.type, e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-card-border text-xs text-white
                  outline-none focus:border-polla-accent transition-colors disabled:opacity-40"
              >
                <option value="" className="bg-polla-bg">Select team...</option>
                {ALL_TEAMS.map((t) => (
                  <option key={t.code} value={t.name} className="bg-polla-bg">
                    {t.flag} {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={bonusPredictions[bonus.type] ?? ''}
                onChange={(e) => onBonusChange(bonus.type, e.target.value)}
                placeholder={bonus.type === 'golden_boot' ? 'Player name (top scorer)' : 'Player name (best player)'}
                disabled={isLocked}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-card-border text-xs text-white
                  placeholder:text-text-25 outline-none focus:border-polla-accent transition-colors disabled:opacity-40"
              />
            )}
          </div>
        ))}
      </div>

      {/* Group winners */}
      <div className="space-y-3">
        <Label>Group Winners</Label>
        <p className="text-text-25 text-[10px] mb-1">+5 pts each correct prediction</p>
        <div className="grid grid-cols-2 gap-2">
          {GROUPS.map((group) => {
            const type = `group_winner_${group.letter}`
            return (
              <div key={type} className="glass-card p-2.5">
                <span className="text-[10px] text-text-40 font-bold mb-1 block">Group {group.letter}</span>
                <select
                  value={bonusPredictions[type] ?? ''}
                  onChange={(e) => onBonusChange(type, e.target.value)}
                  disabled={isLocked}
                  className="w-full px-2 py-1.5 rounded-md bg-white/[0.04] border border-card-border text-[11px] text-white
                    outline-none focus:border-polla-accent transition-colors disabled:opacity-40"
                >
                  <option value="" className="bg-polla-bg">Select...</option>
                  {group.teams.map((t) => (
                    <option key={t.code} value={t.name} className="bg-polla-bg">
                      {t.flag} {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
