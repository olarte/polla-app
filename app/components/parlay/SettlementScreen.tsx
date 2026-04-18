'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useChainId } from 'wagmi'
import confetti from 'canvas-confetti'
import { PARLAY_COPY } from '@/lib/parlay/copy'
import QuestionCard, { type ParlayQuestion } from './QuestionCard'
import ShareTicketButton from './ShareTicketCard'

interface SettlementScreenProps {
  market: {
    id: string
    status: string
    settled_at: string | null
  }
  ticket: {
    stake_usdc: number
    pick_q1: 'A' | 'B'
    pick_q2: 'A' | 'B'
    pick_q3: 'A' | 'B'
    pick_q4: 'A' | 'B'
    pick_q5: 'A' | 'B'
    score: number | null
    payout_usdc: number | null
    tx_hash_payout: string | null
  }
  questions: ParlayQuestion[]
  matchLabel: string
}

function celoscanBase(chainId: number): string {
  return chainId === 11142220
    ? 'https://celo-sepolia.blockscout.com'
    : 'https://celoscan.io'
}

function fireConfetti(tier: number) {
  const intensity = tier === 5 ? 1 : tier === 4 ? 0.6 : 0.3
  const colors = tier === 5
    ? ['#FFD700', '#FFC93C', '#FFF5DC', '#7B2CFF']
    : tier === 4
    ? ['#14B8A6', '#7B2CFF', '#FFC93C']
    : ['#14B8A6', '#7B2CFF']

  confetti({
    particleCount: Math.round(80 * intensity),
    spread: 70 * intensity + 30,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.5 },
    colors,
  })

  if (tier >= 4) {
    setTimeout(() => {
      confetti({
        particleCount: Math.round(60 * intensity),
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
      })
      confetti({
        particleCount: Math.round(60 * intensity),
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
      })
    }, 250)
  }

  if (tier === 5) {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 120,
        startVelocity: 35,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#FFD700', '#FFC93C'],
      })
    }, 600)
  }
}

export default function SettlementScreen({ market, ticket, questions, matchLabel }: SettlementScreenProps) {
  const chainId = useChainId()
  const score = ticket.score ?? 0
  const payout = Number(ticket.payout_usdc ?? 0)
  const won = score >= 3
  const picks = [ticket.pick_q1, ticket.pick_q2, ticket.pick_q3, ticket.pick_q4, ticket.pick_q5]

  const [meRank, setMeRank] = useState<{ rank: number; total: number } | null>(null)
  const [confettiFired, setConfettiFired] = useState(false)

  // Fire confetti once, only when user won. Rolling into the page, not on re-renders.
  useEffect(() => {
    if (!won || confettiFired) return
    setConfettiFired(true)
    fireConfetti(score)
  }, [won, score, confettiFired])

  // Fetch leaderboard position for today
  useEffect(() => {
    let aborted = false
    fetch('/api/parlay/leaderboard?scope=today', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (aborted || !data?.me) return
        setMeRank({ rank: data.me.rank, total: data.me.total_players })
      })
      .catch(() => {})
    return () => { aborted = true }
  }, [])

  const replay = useCallback(() => fireConfetti(score), [score])

  const loseSub =
    score === 3 ? PARLAY_COPY.loseSubtitle3
    : score === 2 ? PARLAY_COPY.loseSubtitle2
    : score === 1 ? PARLAY_COPY.loseSubtitle1
    : PARLAY_COPY.loseSubtitle0

  return (
    <div className="space-y-5">
      <div
        className={`glow-card p-6 text-center space-y-3 ${won ? 'cursor-pointer' : ''}`}
        onClick={won ? replay : undefined}
      >
        <p className="label">
          {won ? PARLAY_COPY.winPayoutLabel : 'Match settled'}
        </p>

        <h2 className="text-3xl font-bold">
          {won ? PARLAY_COPY.winHero(score) : PARLAY_COPY.loseHero(score)}
        </h2>

        {won ? (
          <>
            <div className="num text-5xl text-polla-gold">
              ${payout.toFixed(2)}
            </div>
            <p className="text-polla-success text-sm">{PARLAY_COPY.winSentToWallet}</p>
            {ticket.tx_hash_payout && (
              <a
                href={`${celoscanBase(chainId)}/tx/${ticket.tx_hash_payout}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-polla-success text-xs underline underline-offset-2"
              >
                {PARLAY_COPY.winViewTx}
              </a>
            )}
          </>
        ) : (
          <p className="text-text-70 text-sm">{loseSub}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="label px-1">{PARLAY_COPY.breakdownHeader}</p>
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              value={picks[idx]}
              readOnly
              showResult
            />
          ))}
        </div>
      </div>

      <ShareTicketButton
        data={{
          score,
          payoutUsd: payout,
          stake: Number(ticket.stake_usdc),
          matchLabel,
          picks,
          questions,
        }}
      />

      {meRank && (
        <Link
          href="/app/leaderboard/parlay"
          className="block glass-card p-3 text-center hover:border-polla-accent/50 transition-colors"
        >
          <span className="text-text-70 text-sm">
            {PARLAY_COPY.leaderboardCtaPosition(meRank.rank, meRank.total)}
          </span>
          <span className="text-polla-accent text-xs ml-2">
            {PARLAY_COPY.leaderboardCtaLink} →
          </span>
        </Link>
      )}
    </div>
  )
}
