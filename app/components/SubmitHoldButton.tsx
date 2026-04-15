'use client'

import { useEffect, useRef, useState } from 'react'

interface SubmitHoldButtonProps {
  onSubmit: () => void | Promise<void>
  disabled?: boolean
  holdMs?: number
  idleLabel?: string
  holdingLabel?: string
  submittingLabel?: string
}

/**
 * A deliberate-friction Submit button. The user must press and
 * hold for `holdMs` (default 2500ms) before the action fires.
 * Releasing early cancels. Used for irreversible actions like
 * locking in a prediction bracket.
 */
export default function SubmitHoldButton({
  onSubmit,
  disabled = false,
  holdMs = 2500,
  idleLabel = 'Hold to Submit',
  holdingLabel = 'Keep holding…',
  submittingLabel = 'Submitting…',
}: SubmitHoldButtonProps) {
  const [holding, setHolding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const cancel = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    startRef.current = null
    setHolding(false)
    setProgress(0)
  }

  const fire = async () => {
    cancel()
    setSubmitting(true)
    try {
      await onSubmit()
    } finally {
      setSubmitting(false)
    }
  }

  const start = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || submitting) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setHolding(true)
    startRef.current = performance.now()
    const tick = () => {
      const elapsed = performance.now() - (startRef.current ?? 0)
      const p = Math.min(1, elapsed / holdMs)
      setProgress(p)
      if (p >= 1) {
        fire()
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const release = () => {
    if (!holding || submitting) return
    cancel()
  }

  const label = submitting
    ? submittingLabel
    : holding
      ? holdingLabel
      : idleLabel

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      disabled={disabled || submitting}
      className="relative w-full h-12 rounded-xl overflow-hidden border-2 border-polla-accent bg-polla-accent/10 text-white text-sm font-bold select-none touch-none disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Fill bar grows left-to-right as the user holds */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-polla-accent to-polla-accent-dark transition-none"
        style={{
          width: `${progress * 100}%`,
          opacity: submitting ? 1 : holding ? 0.9 : 0,
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {!holding && !submitting && <span>🔒</span>}
        <span>{label}</span>
      </span>
    </button>
  )
}
