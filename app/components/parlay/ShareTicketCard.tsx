'use client'

import { forwardRef, useCallback, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { PARLAY_COPY } from '@/lib/parlay/copy'
import type { ParlayQuestion } from './QuestionCard'

export interface ShareTicketData {
  score: number // 0..5
  payoutUsd: number
  stake: number
  matchLabel: string // e.g. "Colombia vs Brazil · World Cup 2026"
  picks: ('A' | 'B')[]
  questions: ParlayQuestion[]
}

interface ShareTicketCardProps {
  data: ShareTicketData
  className?: string
}

/**
 * Off-screen branded ticket card. Rendered at a fixed 1080×1350 size
 * optimized for WhatsApp / Twitter share — tall portrait that fits the
 * status + picks + payout cleanly.
 */
export const ShareTicketCardVisual = forwardRef<HTMLDivElement, ShareTicketCardProps>(
  ({ data, className = '' }, ref) => {
    const { score, payoutUsd, matchLabel, picks, questions } = data
    const won = score >= 3
    const heroColor = won ? '#14B8A6' : '#FFC93C'

    return (
      <div
        ref={ref}
        className={className}
        style={{
          width: 1080,
          height: 1350,
          padding: 56,
          background: 'linear-gradient(160deg, #15102A, #1F1538, #2A1F4A)',
          color: '#FFF5DC',
          fontFamily: 'SF Pro Rounded, -apple-system, BlinkMacSystemFont, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 40,
          border: '4px solid rgba(255, 201, 60, 0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: '#FFC93C', letterSpacing: '0.04em' }}>
            SABI
          </span>
          <span style={{ fontSize: 22, color: 'rgba(255,245,220,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>
            Parlay
          </span>
        </div>

        {/* Score hero */}
        <div style={{ marginTop: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 220, fontWeight: 900, color: heroColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {score}<span style={{ color: 'rgba(255,245,220,0.25)', fontSize: 120 }}>/5</span>
          </div>
          {won && (
            <div style={{ marginTop: 16, fontSize: 56, fontWeight: 900, color: '#FFD700', fontVariantNumeric: 'tabular-nums' }}>
              ${payoutUsd.toFixed(2)}
            </div>
          )}
          <div style={{ marginTop: 16, fontSize: 28, color: 'rgba(255,245,220,0.7)', fontWeight: 700 }}>
            {matchLabel}
          </div>
        </div>

        {/* Picks */}
        <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map((q, idx) => {
            const pick = picks[idx]
            const isVoid = q.resolution === 'void'
            const isCorrect = q.resolution === pick
            const mark = isVoid ? '—' : isCorrect ? '✓' : '✗'
            const markColor = isVoid ? 'rgba(255,245,220,0.4)' : isCorrect ? '#14B8A6' : '#FF3D6E'
            return (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '16px 24px',
                  borderRadius: 20,
                  background: 'rgba(255,245,220,0.05)',
                  border: '1px solid rgba(255,201,60,0.15)',
                }}
              >
                <span style={{ fontSize: 44, fontWeight: 900, color: markColor, minWidth: 52 }}>
                  {mark}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,245,220,0.9)' }}>
                    {q.prompt}
                  </div>
                  <div style={{ fontSize: 18, color: 'rgba(255,245,220,0.5)', marginTop: 4 }}>
                    Picked: {pick === 'A' ? q.option_a_label : q.option_b_label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 'auto', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#FFC93C', letterSpacing: '0.08em' }}>
            {PARLAY_COPY.shareCardCta}
          </div>
        </div>
      </div>
    )
  },
)
ShareTicketCardVisual.displayName = 'ShareTicketCardVisual'

interface ShareTicketButtonProps {
  data: ShareTicketData
  disabled?: boolean
}

/**
 * Share button + hidden visual. Generates PNG via html-to-image, then
 * tries Web Share API with image. Falls back to download if unsupported.
 */
export default function ShareTicketButton({ data, disabled }: ShareTicketButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [sharing, setSharing] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const handleShare = useCallback(async () => {
    if (!ref.current || sharing) return
    setSharing(true)
    setNote(null)

    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0B0714',
      })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `sabi-parlay-${data.score}of5.png`, { type: 'image/png' })

      const caption = PARLAY_COPY.shareCaption(
        data.score,
        data.matchLabel.split(' vs ')[0] || 'Team A',
        (data.matchLabel.split(' vs ')[1] || 'Team B').split(' · ')[0] || 'Team B',
      )

      if (
        typeof navigator !== 'undefined' &&
        'share' in navigator &&
        'canShare' in navigator &&
        (navigator as any).canShare?.({ files: [file] })
      ) {
        await (navigator as any).share({ files: [file], text: caption })
      } else {
        // Fallback: download
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = file.name
        link.click()
        setNote(PARLAY_COPY.shareFallbackHint)
      }
    } catch {
      setNote('Couldn\'t generate image')
    } finally {
      setSharing(false)
    }
  }, [data, sharing])

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={disabled || sharing}
        className="w-full min-h-[48px] py-3 rounded-xl bg-polla-whatsapp/15 border border-polla-whatsapp/40 text-polla-whatsapp text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-40"
      >
        {sharing ? 'Generating…' : PARLAY_COPY.shareButton}
      </button>
      {note && <p className="text-text-40 text-[11px] text-center">{note}</p>}

      {/* Off-screen visual for html-to-image capture */}
      <div style={{ position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none' }} aria-hidden>
        <ShareTicketCardVisual ref={ref} data={data} />
      </div>
    </>
  )
}
