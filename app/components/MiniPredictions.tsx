'use client'

import { useState } from 'react'
import Card from './Card'
import Label from './Label'

interface MiniPredictionsProps {
  match: {
    id: string
    team_a_name: string
    team_a_code: string
    team_a_flag: string
    team_b_name: string
    team_b_code: string
    team_b_flag: string
    kickoff: string
    status: string
  }
  existing?: {
    first_to_score: string | null
    total_goals: string | null
    both_score: string | null
    early_goal: string | null
    motm: string | null
    correct_count: number | null
    xp_earned: number | null
    scored_at: string | null
  } | null
  onBack: () => void
  onSubmitted: () => void
}

type PredictionKey = 'first_to_score' | 'total_goals' | 'both_score' | 'early_goal' | 'motm'

export default function MiniPredictions({ match, existing, onBack, onSubmitted }: MiniPredictionsProps) {
  const [selections, setSelections] = useState<Record<PredictionKey, string | null>>({
    first_to_score: existing?.first_to_score ?? null,
    total_goals: existing?.total_goals ?? null,
    both_score: existing?.both_score ?? null,
    early_goal: existing?.early_goal ?? null,
    motm: existing?.motm ?? null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(!!existing?.first_to_score)

  const isScored = existing?.scored_at != null
  const filledCount = Object.values(selections).filter(Boolean).length
  const canSubmit = filledCount >= 4

  const lockTime = new Date(match.kickoff)
  lockTime.setMinutes(lockTime.getMinutes() - 60)
  const isLocked = new Date() >= lockTime || match.status !== 'scheduled'

  function select(key: PredictionKey, value: string) {
    if (isLocked || isScored) return
    setSelections(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }))
  }

  async function submit() {
    if (!canSubmit || submitting || isLocked) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/daily/mini-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: match.id, ...selections }),
      })

      if (res.ok) {
        setSubmitted(true)
        onSubmitted()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const optionBtn = (key: PredictionKey, value: string, label: string) => {
    const active = selections[key] === value
    return (
      <button
        key={value}
        onClick={() => select(key, value)}
        disabled={isLocked || isScored}
        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
          active
            ? 'bg-polla-accent text-white'
            : 'bg-card border border-card-border text-text-70 active:scale-95'
        } ${isLocked || isScored ? 'opacity-50' : ''}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="px-4 pt-4 space-y-4 pb-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-text-40 text-sm flex items-center gap-1"
      >
        <span>←</span> Today&apos;s Matches
      </button>

      {/* Match header */}
      <Card glow>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <span className="text-3xl block">{match.team_a_flag}</span>
            <p className="text-xs font-semibold mt-1">{match.team_a_code}</p>
          </div>
          <span className="text-text-25 text-lg font-bold">VS</span>
          <div className="text-center">
            <span className="text-3xl block">{match.team_b_flag}</span>
            <p className="text-xs font-semibold mt-1">{match.team_b_code}</p>
          </div>
        </div>
        <p className="text-center text-text-40 text-xs mt-2">
          {match.team_a_name} vs {match.team_b_name}
        </p>
        {isScored && existing && (
          <div className="text-center mt-3">
            <span className="text-polla-gold num text-lg font-bold">
              {existing.correct_count}/5 correct
            </span>
            <span className="text-text-40 text-xs ml-2">+{existing.xp_earned} XP</span>
          </div>
        )}
      </Card>

      {/* Predictions */}
      <div className="space-y-3">
        {/* 1. First to Score */}
        <Card>
          <Label>1. First to Score</Label>
          <div className="flex gap-2 mt-2">
            {optionBtn('first_to_score', 'team_a', match.team_a_code)}
            {optionBtn('first_to_score', 'team_b', match.team_b_code)}
            {optionBtn('first_to_score', 'none', 'No Goals')}
          </div>
        </Card>

        {/* 2. Total Goals */}
        <Card>
          <Label>2. Total Goals in Match</Label>
          <div className="flex gap-2 mt-2">
            {optionBtn('total_goals', 'under_2', '0-1')}
            {optionBtn('total_goals', '2_to_3', '2-3')}
            {optionBtn('total_goals', 'over_3', '4+')}
          </div>
        </Card>

        {/* 3. Both Teams Score */}
        <Card>
          <Label>3. Both Teams Score?</Label>
          <div className="flex gap-2 mt-2">
            {optionBtn('both_score', 'yes', 'Yes')}
            {optionBtn('both_score', 'no', 'No')}
          </div>
        </Card>

        {/* 4. Early Goal (before 15') */}
        <Card>
          <Label>4. Goal Before 15&apos;?</Label>
          <div className="flex gap-2 mt-2">
            {optionBtn('early_goal', 'yes', 'Yes')}
            {optionBtn('early_goal', 'no', 'No')}
          </div>
        </Card>

        {/* 5. Man of the Match */}
        <Card>
          <Label>5. Man of the Match from...</Label>
          <div className="flex gap-2 mt-2">
            {optionBtn('motm', 'team_a', match.team_a_code)}
            {optionBtn('motm', 'team_b', match.team_b_code)}
          </div>
        </Card>
      </div>

      {/* Submit */}
      {!isLocked && !isScored && (
        <button
          onClick={submit}
          disabled={!canSubmit || submitting || submitted}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
            canSubmit && !submitted
              ? 'bg-btn-primary active:scale-[0.97]'
              : submitted
              ? 'bg-polla-success/20 text-polla-success border border-polla-success/30'
              : 'bg-card border border-card-border text-text-25'
          }`}
        >
          {submitting
            ? 'Submitting...'
            : submitted
            ? '✓ Predictions Saved'
            : `Submit Predictions (${filledCount}/5 selected)`}
        </button>
      )}

      {isLocked && !isScored && (
        <div className="text-center py-3">
          <p className="text-text-40 text-xs">Predictions locked — match starting soon</p>
        </div>
      )}
    </div>
  )
}
