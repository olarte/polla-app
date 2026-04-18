'use client'

import { useChainId } from 'wagmi'
import { PARLAY_COPY } from '@/lib/parlay/copy'
import LockCountdown from './LockCountdown'
import QuestionCard, { type ParlayQuestion } from './QuestionCard'

interface TicketViewProps {
  market: {
    id: string
    status: string
    locks_at: string
  }
  ticket: {
    stake_usdc: number
    pick_q1: 'A' | 'B'
    pick_q2: 'A' | 'B'
    pick_q3: 'A' | 'B'
    pick_q4: 'A' | 'B'
    pick_q5: 'A' | 'B'
    tx_hash_bet: string | null
  }
  questions: ParlayQuestion[]
  kickoffIso: string
}

function celoscanBase(chainId: number): string {
  return chainId === 11142220
    ? 'https://celo-sepolia.blockscout.com'
    : 'https://celoscan.io'
}

export default function TicketView({ market, ticket, questions, kickoffIso }: TicketViewProps) {
  const chainId = useChainId()
  const picks = [ticket.pick_q1, ticket.pick_q2, ticket.pick_q3, ticket.pick_q4, ticket.pick_q5]
  const kickoff = new Date(kickoffIso).getTime()

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="label">{PARLAY_COPY.ticketHeader}</span>
          <span className="text-polla-success text-[10px] uppercase tracking-wider font-bold">
            ✓ In
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-text-40 text-xs">{PARLAY_COPY.ticketStakeLabel}</span>
          <span className="num text-polla-gold">${Number(ticket.stake_usdc).toFixed(2)}</span>
        </div>

        {kickoff > Date.now() ? (
          <LockCountdown locksAt={kickoffIso} label={PARLAY_COPY.ticketKickoffIn} />
        ) : (
          <div className="flex items-baseline justify-between">
            <span className="label">{PARLAY_COPY.ticketLocked}</span>
          </div>
        )}

        {ticket.tx_hash_bet && (
          <div className="flex items-center justify-between pt-2 border-t border-card-border">
            <span className="text-text-40 text-xs">{PARLAY_COPY.ticketTxLabel}</span>
            <a
              href={`${celoscanBase(chainId)}/tx/${ticket.tx_hash_bet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-polla-success text-xs underline underline-offset-2"
            >
              {PARLAY_COPY.ticketViewOnCeloscan}
            </a>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="label px-1">{PARLAY_COPY.ticketPicksLabel}</p>
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              value={picks[idx]}
              readOnly
            />
          ))}
        </div>
      </div>
    </div>
  )
}
