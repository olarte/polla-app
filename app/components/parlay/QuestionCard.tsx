'use client'

import { motion } from 'framer-motion'

export interface ParlayQuestion {
  id: string
  slot: number
  prompt: string
  option_a_label: string
  option_b_label: string
  resolution?: 'A' | 'B' | 'void' | null
}

export type Pick = 'A' | 'B' | null

interface QuestionCardProps {
  question: ParlayQuestion
  value: Pick
  onChange?: (v: Pick) => void
  // Read-only mode: show result check/X. Used by TicketView + SettlementScreen.
  readOnly?: boolean
  // When readOnly + showResult, renders the resolution badge next to picks.
  showResult?: boolean
  disabled?: boolean
}

export default function QuestionCard({
  question,
  value,
  onChange,
  readOnly = false,
  showResult = false,
  disabled = false,
}: QuestionCardProps) {
  const isReadOnly = readOnly || !onChange
  const resolution = question.resolution

  const handle = (pick: 'A' | 'B') => {
    if (isReadOnly || disabled) return
    onChange?.(value === pick ? null : pick)
  }

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-text-25 text-[10px] num">{question.slot}</span>
          <p className="text-sm text-text-100 leading-snug font-semibold">
            {question.prompt}
          </p>
        </div>
        {showResult && resolution && (
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
              resolution === 'void'
                ? 'bg-text-25/10 text-text-40'
                : 'bg-polla-success/20 text-polla-success'
            }`}
          >
            {resolution === 'void' ? 'Void' : resolution}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['A', 'B'] as const).map(opt => {
          const label = opt === 'A' ? question.option_a_label : question.option_b_label
          const isSelected = value === opt
          const isCorrect = showResult && resolution === opt
          const isWrong = showResult && value === opt && resolution !== opt && resolution !== 'void'

          const base =
            'min-h-[44px] py-3 px-3 rounded-xl border text-sm font-bold transition-colors flex items-center justify-center gap-2'

          let state =
            'bg-card border-card-border text-text-70 hover:border-white/10'
          if (isSelected && !showResult) {
            state = 'bg-polla-success/20 border-polla-success text-polla-success'
          } else if (isCorrect) {
            state = 'bg-polla-success/20 border-polla-success text-polla-success'
          } else if (isWrong) {
            state = 'bg-polla-accent-dark/15 border-polla-accent-dark/50 text-polla-accent-dark'
          } else if (isSelected && showResult) {
            state = 'bg-card border-card-border text-text-40'
          }

          return (
            <motion.button
              key={opt}
              type="button"
              onClick={() => handle(opt)}
              disabled={isReadOnly || disabled}
              whileTap={isReadOnly || disabled ? undefined : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              aria-pressed={isSelected}
              aria-label={`${question.prompt} — ${label}`}
              className={`${base} ${state} ${
                isReadOnly || disabled ? 'cursor-default' : 'active:scale-[0.97]'
              }`}
            >
              {showResult && isCorrect && <span className="text-polla-success">✓</span>}
              {showResult && isWrong && <span className="text-polla-accent-dark">✗</span>}
              <span>{label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
