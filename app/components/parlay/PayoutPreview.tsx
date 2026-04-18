'use client'

import { PARLAY_COPY } from '@/lib/parlay/copy'

export interface TierEstimates {
  tier5_multiplier: number
  tier4_multiplier: number
  tier3_multiplier: number
}

interface PayoutPreviewProps {
  stake: number
  estimates: TierEstimates | null
  loading?: boolean
}

function fmt(n: number): string {
  if (!isFinite(n) || n <= 0) return '—'
  return `$${n.toFixed(2)}`
}

export default function PayoutPreview({ stake, estimates, loading }: PayoutPreviewProps) {
  const m5 = estimates?.tier5_multiplier ?? 0
  const m4 = estimates?.tier4_multiplier ?? 0
  const m3 = estimates?.tier3_multiplier ?? 0

  const p5 = stake > 0 ? stake * m5 : 0
  const p4 = stake > 0 ? stake * m4 : 0
  const p3 = stake > 0 ? stake * m3 : 0

  return (
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="label">{PARLAY_COPY.payoutHeader}</span>
        <span className="text-text-25 text-[10px] uppercase tracking-wider">
          {PARLAY_COPY.estimatedLabel}
        </span>
      </div>

      <div className="space-y-1.5 font-mono text-sm">
        <Row tier={5} usd={fmt(p5)} mult={m5 > 0 ? m5.toFixed(1) : '—'} loading={loading} />
        <Row tier={4} usd={fmt(p4)} mult={m4 > 0 ? m4.toFixed(1) : '—'} loading={loading} />
        <Row tier={3} usd={fmt(p3)} mult={m3 > 0 ? m3.toFixed(1) : '—'} loading={loading} />
      </div>

      <p className="text-text-25 text-[10px] leading-tight pt-1">
        {PARLAY_COPY.payoutHelp}
      </p>
    </div>
  )
}

function Row({ tier, usd, mult, loading }: { tier: 3 | 4 | 5; usd: string; mult: string; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-70 text-xs">{tier} of 5</span>
      <div className="flex items-baseline gap-2">
        <span className={`num text-sm ${tier === 5 ? 'text-polla-gold' : 'text-text-100'}`}>
          {loading ? '…' : usd}
        </span>
        <span className="text-text-40 text-[11px] num">
          {mult === '—' ? '—' : `${mult}x`}
        </span>
      </div>
    </div>
  )
}
