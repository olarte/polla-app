'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { PARLAY_COPY } from '@/lib/parlay/copy'
import { applyTeamLabels, type TeamRef } from '@/lib/parlay/displayLabels'
import { packPicks, usePlaceTicket, useUsdcBalance, type TicketStep } from '@/lib/contracts/useSabiParlay'
import LockCountdown from './LockCountdown'
import QuestionCard, { type ParlayQuestion, type Pick } from './QuestionCard'
import StakeInput from './StakeInput'
import PayoutPreview, { type TierEstimates } from './PayoutPreview'
import TicketView from './TicketView'
import SettlementScreen from './SettlementScreen'
import ConnectWalletPrompt from '../ConnectWalletPrompt'

interface ParlayMarket {
  id: string
  match_id: string
  status: 'open' | 'locked' | 'settling' | 'settled' | 'voided' | 'manual_review'
  opens_at: string
  locks_at: string
  settled_at: string | null
  onchain_market_id: number | null
  voided_reason: string | null
}

interface ParlayTicket {
  id: string
  parlay_market_id: string
  stake_usdc: number
  pick_q1: 'A' | 'B'
  pick_q2: 'A' | 'B'
  pick_q3: 'A' | 'B'
  pick_q4: 'A' | 'B'
  pick_q5: 'A' | 'B'
  score: number | null
  payout_usdc: number | null
  tx_hash_bet: string | null
  tx_hash_payout: string | null
  refund_pending: boolean | null
}

interface ParlayTabProps {
  matchId: string
  matchLabel: string
  kickoffIso: string
  home: TeamRef
  away: TeamRef
}

const DEFAULT_STAKE = 5

export default function ParlayTab({ matchId, matchLabel, kickoffIso, home, away }: ParlayTabProps) {
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(true)
  const [market, setMarket] = useState<ParlayMarket | null>(null)
  const [questions, setQuestions] = useState<ParlayQuestion[]>([])
  const [ticket, setTicket] = useState<ParlayTicket | null>(null)

  const [picks, setPicks] = useState<Pick[]>([null, null, null, null, null])
  const [stake, setStake] = useState<number>(DEFAULT_STAKE)
  const [estimates, setEstimates] = useState<TierEstimates | null>(null)
  const [showConnect, setShowConnect] = useState(false)

  const { placeTicket, step, error: txError, txHash, onchainTicketId, reset } = usePlaceTicket()
  const { usd: balanceUsd, refetch: refetchBalance } = useUsdcBalance()

  // ─── Load market + questions + my ticket ───────────────────
  const loadMarket = useCallback(async () => {
    try {
      const res = await fetch(`/api/parlay/by-match/${matchId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load failed')
      const data = await res.json()
      setMarket(data.market)
      setQuestions(applyTeamLabels((data.questions || []) as ParlayQuestion[], home, away))
      setTicket(data.ticket)
      if (data.ticket) {
        setPicks([
          data.ticket.pick_q1,
          data.ticket.pick_q2,
          data.ticket.pick_q3,
          data.ticket.pick_q4,
          data.ticket.pick_q5,
        ])
        setStake(Number(data.ticket.stake_usdc))
      }
    } finally {
      setLoading(false)
    }
  }, [matchId, home, away])

  useEffect(() => {
    loadMarket()
  }, [loadMarket])

  // ─── Poll estimates every 30s while viewing an open/locked market ──
  useEffect(() => {
    if (!market || market.status === 'settled' || market.status === 'voided') return

    let aborted = false
    async function pull() {
      if (!market) return
      try {
        const res = await fetch(`/api/parlay/${market.id}/estimates`, { cache: 'no-store' })
        if (!res.ok || aborted) return
        const data = await res.json()
        if (!aborted) setEstimates(data)
      } catch {
        // stale estimate is fine
      }
    }
    pull()
    const id = setInterval(pull, 30_000)
    return () => {
      aborted = true
      clearInterval(id)
    }
  }, [market])

  // ─── Successful placement: persist to DB, reload ───────────
  useEffect(() => {
    if (step !== 'confirmed' || !market) return
    const allPicked = picks.every(p => p !== null)
    if (!allPicked) return

    fetch('/api/parlay/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parlay_market_id: market.id,
        stake_usdc: stake,
        pick_q1: picks[0],
        pick_q2: picks[1],
        pick_q3: picks[2],
        pick_q4: picks[3],
        pick_q5: picks[4],
        tx_hash_bet: txHash,
        onchain_ticket_id: onchainTicketId ? Number(onchainTicketId) : null,
      }),
    })
      .catch(() => {})
      .then(() => {
        refetchBalance()
        loadMarket()
      })
  }, [step, market, picks, stake, txHash, onchainTicketId, refetchBalance, loadMarket])

  const allPicked = picks.every(p => p !== null)
  const stakeError = useMemo(() => {
    if (stake < 1) return PARLAY_COPY.stakeBelowMin
    if (balanceUsd !== null && stake > balanceUsd) return PARLAY_COPY.stakeAboveBalance
    return null
  }, [stake, balanceUsd])

  const now = Date.now()
  const locksAtMs = market ? new Date(market.locks_at).getTime() : 0
  const opensAtMs = market ? new Date(market.opens_at).getTime() : 0

  const canSubmit = market && market.status === 'open' && allPicked && !stakeError && locksAtMs > now

  // ─── Render branches ───────────────────────────────────────
  if (loading) return <Loading />

  // No parlay market exists for this match yet
  if (!market) {
    const kickoff = new Date(kickoffIso).getTime()
    const opens = kickoff - 24 * 60 * 60 * 1000
    return (
      <EmptyState>
        <p className="text-text-70 text-sm">{PARLAY_COPY.stateNotOpenYet}</p>
        {opens > now && (
          <LockCountdown locksAt={new Date(opens).toISOString()} label={PARLAY_COPY.opensIn} />
        )}
      </EmptyState>
    )
  }

  // Settled + ticket → celebration / commiseration screen
  if (market.status === 'settled' && ticket) {
    return (
      <SettlementScreen
        market={market}
        ticket={ticket}
        questions={questions}
        matchLabel={matchLabel}
      />
    )
  }

  // Voided
  if (market.status === 'voided') {
    return (
      <EmptyState>
        <p className="text-text-70 text-sm">{PARLAY_COPY.stateVoided}</p>
        {market.voided_reason && (
          <p className="text-text-40 text-xs">{market.voided_reason}</p>
        )}
      </EmptyState>
    )
  }

  // Manual review
  if (market.status === 'manual_review') {
    return (
      <EmptyState>
        <p className="text-text-70 text-sm">{PARLAY_COPY.stateManualReview}</p>
      </EmptyState>
    )
  }

  // Has a ticket + market not settled → read-only ticket view
  if (ticket) {
    return (
      <TicketView
        market={market}
        ticket={ticket}
        questions={questions}
        kickoffIso={kickoffIso}
      />
    )
  }

  // Market is locked/settling but no ticket
  if (market.status === 'locked' || market.status === 'settling') {
    return (
      <EmptyState>
        <p className="text-text-70 text-sm">{PARLAY_COPY.stateLockedWaiting}</p>
      </EmptyState>
    )
  }

  // Open market, no ticket → entry flow
  return (
    <div className="space-y-4">
      {opensAtMs > now ? (
        <LockCountdown locksAt={market.opens_at} label={PARLAY_COPY.opensIn} />
      ) : (
        <LockCountdown locksAt={market.locks_at} label={PARLAY_COPY.locksInLabel} />
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            value={picks[idx]}
            onChange={v => {
              const next = picks.slice() as Pick[]
              next[idx] = v
              setPicks(next)
            }}
          />
        ))}
      </div>

      <StakeInput
        value={stake}
        onChange={setStake}
        balanceUsd={isConnected ? balanceUsd : null}
        error={stakeError}
      />

      <PayoutPreview stake={stake} estimates={estimates} loading={!estimates} />

      {txError && (
        <div className="glass-card p-3 border-polla-accent-dark/40">
          <p className="text-polla-accent-dark text-sm font-bold">{PARLAY_COPY.txErrorHeader}</p>
          <p className="text-text-40 text-xs mt-1">{PARLAY_COPY.txErrorHelp}</p>
          <p className="text-text-25 text-[10px] mt-2">{txError}</p>
        </div>
      )}

      <SubmitButton
        isConnected={isConnected}
        allPicked={allPicked}
        stakeOk={!stakeError && stake > 0}
        step={step}
        canSubmit={!!canSubmit}
        onConnect={() => setShowConnect(true)}
        onSubmit={async () => {
          if (!market?.onchain_market_id || !address || !allPicked) return
          try {
            const packed = packPicks({
              slot1: picks[0]!, slot2: picks[1]!, slot3: picks[2]!,
              slot4: picks[3]!, slot5: picks[4]!,
            })
            await placeTicket(BigInt(market.onchain_market_id), packed, stake)
          } catch {
            // handled in hook
          }
        }}
        onRetry={reset}
      />

      {showConnect && (
        <ConnectWalletPrompt
          onClose={() => setShowConnect(false)}
          onConnected={() => setShowConnect(false)}
        />
      )}
    </div>
  )
}

function SubmitButton({
  isConnected, allPicked, stakeOk, step, canSubmit, onConnect, onSubmit, onRetry,
}: {
  isConnected: boolean
  allPicked: boolean
  stakeOk: boolean
  step: TicketStep
  canSubmit: boolean
  onConnect: () => void
  onSubmit: () => void
  onRetry: () => void
}) {
  let label: string = PARLAY_COPY.submitIdle
  let busy = false
  let disabled = false

  if (!isConnected) {
    label = PARLAY_COPY.submitConnecting
  } else if (!allPicked) {
    label = PARLAY_COPY.submitAwaitingPicks
    disabled = true
  } else if (!stakeOk) {
    label = PARLAY_COPY.submitAwaitingStake
    disabled = true
  } else if (step === 'approving') {
    label = PARLAY_COPY.submitApproving
    busy = true
  } else if (step === 'placing') {
    label = PARLAY_COPY.submitPlacing
    busy = true
  } else if (step === 'confirming') {
    label = PARLAY_COPY.submitConfirming
    busy = true
  } else if (step === 'error') {
    label = PARLAY_COPY.txErrorRetry
  }

  disabled = disabled || busy || (!canSubmit && isConnected && step === 'idle')

  return (
    <button
      type="button"
      onClick={() => {
        if (!isConnected) return onConnect()
        if (step === 'error') return onRetry()
        onSubmit()
      }}
      disabled={disabled}
      className="w-full min-h-[52px] py-3 rounded-xl bg-btn-primary text-base font-bold disabled:opacity-40 active:scale-[0.97] transition-transform"
    >
      {label}
    </button>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 text-center space-y-3">{children}</div>
  )
}

function Loading() {
  return (
    <div className="space-y-3">
      <div className="glass-card h-8 skeleton-pulse" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass-card h-24 skeleton-pulse" />
      ))}
    </div>
  )
}
