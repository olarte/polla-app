'use client'

import { PARLAY_COPY } from '@/lib/parlay/copy'

interface StakeInputProps {
  value: number
  onChange: (v: number) => void
  balanceUsd: number | null
  error: string | null
}

const CHIPS = [2, 5, 10, 25]

export default function StakeInput({ value, onChange, balanceUsd, error }: StakeInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label">{PARLAY_COPY.stakeLabel}</span>
        {balanceUsd !== null && (
          <span className="text-text-40 text-[11px]">
            Balance: <span className="num text-text-70">${balanceUsd.toFixed(2)}</span>
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {CHIPS.map(c => {
          const isSelected = Math.abs(value - c) < 0.001
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={`flex-1 min-h-[44px] py-2 rounded-lg text-sm num font-bold transition-colors ${
                isSelected
                  ? 'bg-polla-accent/20 text-polla-accent border border-polla-accent/50'
                  : 'bg-card border border-card-border text-text-70'
              }`}
              aria-pressed={isSelected}
            >
              ${c}
            </button>
          )
        })}
      </div>

      <input
        type="number"
        inputMode="decimal"
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        placeholder="Custom"
        min="1"
        step="0.01"
        className="w-full min-h-[44px] px-3 rounded-xl bg-card border border-card-border num text-center outline-none focus:border-polla-accent/50"
      />

      {error && (
        <p className="text-polla-accent-dark text-xs">{error}</p>
      )}
    </div>
  )
}
