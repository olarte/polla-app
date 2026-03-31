'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { keccak256, toHex, formatUnits, type Hex } from 'viem'
import { useMarketData, useUserBets, usePlaceBet, useClaimed, useClaim } from '@/lib/contracts/usePollaBets'
import Card from './Card'
import Label from './Label'
import ShareBtn from './ShareBtn'
import BetConfirmModal, { type BetStep } from './BetConfirmModal'

export type { BetStep }

interface Match {
  id: string
  team_a_name: string
  team_a_code: string
  team_a_flag: string
  team_b_name: string
  team_b_code: string
  team_b_flag: string
  kickoff: string
  score_a?: number | null
  score_b?: number | null
  status?: string
}

interface BetCardProps {
  match: Match
  onWalletNeeded: () => void
}

const PRESET_AMOUNTS = [0.5, 1, 2, 5]

type MarketType = 'result' | 'goals'

function getMarketId(matchId: string, type: MarketType): Hex {
  return keccak256(toHex(`${matchId}-${type}`))
}

function getCountdown(kickoff: string): string {
  const diff = new Date(kickoff).getTime() - Date.now()
  if (diff <= 0) return 'Locked'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}m`
}

export default function BetCard({ match, onWalletNeeded }: BetCardProps) {
  const { address, isConnected } = useAccount()
  const [marketType, setMarketType] = useState<MarketType>('result')
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null)
  const [amount, setAmount] = useState<number>(1)
  const [customAmount, setCustomAmount] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const [claimSuccess, setClaimSuccess] = useState(false)

  const marketId = getMarketId(match.id, marketType)
  const { market, refetch: refetchMarket } = useMarketData(marketId)
  const { betsUsd, hasBet, refetch: refetchBets } = useUserBets(marketId)
  const { placeBet, step, error, reset } = usePlaceBet()
  const alreadyClaimed = useClaimed(marketId)
  const { claim, claimRefund, pending: claimPending } = useClaim()

  const isResolved = market?.resolved ?? false
  const isCancelled = market?.cancelled ?? false
  const winningOutcome = market?.winningOutcome ?? 0

  // Determine user's position after resolution
  const userWonAmount = isResolved && hasBet
    ? (() => {
        const userBet = betsUsd[winningOutcome] || 0
        if (userBet <= 0 || !market) return 0
        const winnerPoolUsd = Number(formatUnits(market.pools[winningOutcome] ?? BigInt(0), 6))
        if (winnerPoolUsd <= 0) return 0
        const gross = (userBet / winnerPoolUsd) * market.totalPoolUsd
        return gross - gross * 0.05 // 5% fee
      })()
    : 0

  const userHasWinningBet = isResolved && userWonAmount > 0
  const userHasLosingBet = isResolved && hasBet && !userHasWinningBet
  const canClaim = (userHasWinningBet || isCancelled) && !alreadyClaimed && !claimSuccess

  const handleClaim = async () => {
    try {
      if (isCancelled) {
        await claimRefund(marketId)
      } else {
        await claim(marketId)
      }
      // Record claim in Supabase
      await fetch('/api/bets/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: marketId }),
      }).catch(() => {})
      setClaimSuccess(true)
    } catch {
      // error handled upstream
    }
  }

  // Poll for live odds every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMarket()
    }, 30_000)
    return () => clearInterval(interval)
  }, [refetchMarket])

  const betBtnRef = useRef<HTMLButtonElement>(null)

  // Hide bottom nav when bet selector is active
  useEffect(() => {
    if (selectedOutcome !== null) {
      document.documentElement.setAttribute('data-hide-nav', 'true')
    } else {
      document.documentElement.removeAttribute('data-hide-nav')
    }
    return () => document.documentElement.removeAttribute('data-hide-nav')
  }, [selectedOutcome])

  const isLocked = new Date(match.kickoff).getTime() <= Date.now()

  const outcomeLabels =
    marketType === 'result'
      ? [`${match.team_a_flag} ${match.team_a_code}`, 'Draw', `${match.team_b_code} ${match.team_b_flag}`]
      : ['Under 2.5', 'Over 2.5']

  const outcomeDescriptions =
    marketType === 'result'
      ? [`${match.team_a_name} to win`, 'Draw', `${match.team_b_name} to win`]
      : ['Under 2.5 goals', 'Over 2.5 goals']

  const numOutcomes = marketType === 'result' ? 3 : 2

  const handleOutcomeClick = (idx: number) => {
    if (isLocked) return
    if (!isConnected) {
      onWalletNeeded()
      return
    }
    setSelectedOutcome(idx === selectedOutcome ? null : idx)
    // Scroll the Place Bet button into view after a tick
    if (idx !== selectedOutcome) {
      setTimeout(() => betBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)
    }
  }

  const handleAmountChip = (val: number) => {
    setAmount(val)
    setCustomAmount('')
  }

  const handleCustomAmount = (val: string) => {
    setCustomAmount(val)
    const num = parseFloat(val)
    if (!isNaN(num) && num > 0) setAmount(num)
  }

  const handlePlaceBet = () => {
    if (selectedOutcome === null) return
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (selectedOutcome === null) return
    try {
      await placeBet(marketId, selectedOutcome, amount, {
        matchId: match.id,
        marketType,
      })
      // Refresh market data after bet
      setTimeout(() => {
        refetchMarket()
        refetchBets()
      }, 3000)
    } catch {
      // error is handled in usePlaceBet
    }
  }

  const handleCloseConfirm = () => {
    setConfirmOpen(false)
    if (step === 'confirmed') {
      setSelectedOutcome(null)
      setAmount(1)
      setCustomAmount('')
    }
    reset()
  }

  const odds = market?.oddsMultipliers || Array(numOutcomes).fill(0)

  // ─── Resolved Market: Claim / Result UI ──────────────────
  if ((isResolved || isCancelled) && hasBet) {
    return (
      <Card className="space-y-3">
        {/* Match header with score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{match.team_a_flag}</span>
            <span className="text-xs font-bold">{match.team_a_code}</span>
            {match.score_a !== null && match.score_b !== null && (
              <span className="num text-sm font-bold px-2">
                {match.score_a} - {match.score_b}
              </span>
            )}
            <span className="text-xs font-bold">{match.team_b_code}</span>
            <span className="text-lg">{match.team_b_flag}</span>
          </div>
          <span className="text-text-25 text-[10px] uppercase tracking-wider">
            {isCancelled ? 'Cancelled' : 'Final'}
          </span>
        </div>

        {/* Market tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
          {(['result', 'goals'] as const).map(type => (
            <button
              key={type}
              onClick={() => setMarketType(type)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                marketType === type
                  ? 'bg-polla-accent/20 text-polla-accent'
                  : 'text-text-40'
              }`}
            >
              {type === 'result' ? 'Result' : 'Goals'}
            </button>
          ))}
        </div>

        {/* Outcome results — winning highlighted in green */}
        <div className={`grid gap-2 ${numOutcomes === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {Array.from({ length: numOutcomes }).map((_, i) => {
            const isWinner = !isCancelled && i === winningOutcome
            const userBetOnThis = betsUsd[i] || 0

            return (
              <div
                key={i}
                className={`py-3 px-2 rounded-xl border text-center ${
                  isWinner
                    ? 'border-polla-success/40 bg-polla-success/10'
                    : 'border-card-border bg-card opacity-50'
                }`}
              >
                <p className="text-xs font-semibold leading-tight">{outcomeLabels[i]}</p>
                {isWinner && (
                  <p className="text-polla-success text-[10px] mt-1 font-bold">Winner</p>
                )}
                {userBetOnThis > 0 && (
                  <p className={`text-[9px] mt-0.5 ${isWinner ? 'text-polla-success' : 'text-text-25'}`}>
                    Your bet: ${userBetOnThis.toFixed(2)}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Claim state */}
        {claimSuccess || alreadyClaimed ? (
          <div className="text-center space-y-2">
            <p className="text-polla-success text-sm font-bold">
              {isCancelled
                ? 'Refund claimed!'
                : `$${userWonAmount.toFixed(2)} USDC claimed!`}
            </p>
            <ShareBtn
              variant="whatsapp"
              text="Share Win"
              options={{
                template: 'payout',
                title: 'I won on Polla!',
                text: `Just won $${userWonAmount.toFixed(2)} predicting ${match.team_a_name} vs ${match.team_b_name} on Polla Football!`,
              }}
            />
          </div>
        ) : canClaim ? (
          <button
            onClick={handleClaim}
            disabled={claimPending}
            className="w-full py-3 rounded-xl bg-polla-success/20 border border-polla-success/30 text-polla-success text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-50 animate-pulse"
          >
            {claimPending
              ? 'Claiming...'
              : isCancelled
              ? 'Claim Refund'
              : `You won! Claim $${userWonAmount.toFixed(2)}`}
          </button>
        ) : userHasLosingBet ? (
          <p className="text-text-25 text-xs text-center">
            Better luck next time
          </p>
        ) : null}
      </Card>
    )
  }

  // ─── Active Market: Betting UI ──────────────────────────
  return (
    <>
      <Card className="space-y-3">
        {/* Match header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{match.team_a_flag}</span>
            <span className="text-xs font-bold">{match.team_a_code}</span>
            <span className="text-text-25 text-xs">vs</span>
            <span className="text-xs font-bold">{match.team_b_code}</span>
            <span className="text-lg">{match.team_b_flag}</span>
          </div>
          <div className="text-right">
            <p className="text-text-40 text-[10px]">{getCountdown(match.kickoff)}</p>
            <p className="text-polla-accent text-[10px] font-bold">BETS</p>
          </div>
        </div>

        {/* Market tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
          {(['result', 'goals'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                setMarketType(type)
                setSelectedOutcome(null)
              }}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                marketType === type
                  ? 'bg-polla-accent/20 text-polla-accent'
                  : 'text-text-40'
              }`}
            >
              {type === 'result' ? 'Result' : 'Goals'}
            </button>
          ))}
        </div>

        {/* Outcome buttons with live odds */}
        <div className={`grid gap-2 ${numOutcomes === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {Array.from({ length: numOutcomes }).map((_, i) => {
            const isSelected = selectedOutcome === i
            const userBetOnThis = betsUsd[i] || 0
            const oddsVal = odds[i]

            return (
              <button
                key={i}
                onClick={() => handleOutcomeClick(i)}
                disabled={isLocked}
                className={`py-3 px-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'border-polla-accent bg-polla-accent/10'
                    : 'border-card-border bg-card hover:border-white/10'
                } ${isLocked ? 'opacity-40' : 'active:scale-[0.97]'}`}
              >
                <p className="text-xs font-semibold leading-tight">{outcomeLabels[i]}</p>
                <p className={`num text-sm mt-1 ${oddsVal > 0 ? 'text-polla-gold' : 'text-text-25'}`}>
                  {oddsVal > 0 ? `${oddsVal.toFixed(1)}x` : '—'}
                </p>
                {userBetOnThis > 0 && (
                  <p className="text-polla-success text-[9px] mt-0.5">
                    ${userBetOnThis.toFixed(2)}
                  </p>
                )}
              </button>
            )
          })}
        </div>

        {/* Amount selector — shown when outcome is selected */}
        {selectedOutcome !== null && !isLocked && (
          <div className="space-y-2">
            <Label>Amount (USDC)</Label>
            <div className="flex gap-2">
              {PRESET_AMOUNTS.map(val => (
                <button
                  key={val}
                  onClick={() => handleAmountChip(val)}
                  className={`flex-1 py-2 rounded-lg text-xs num font-bold transition-colors ${
                    amount === val && !customAmount
                      ? 'bg-polla-accent/20 text-polla-accent border border-polla-accent/40'
                      : 'bg-card border border-card-border text-text-70'
                  }`}
                >
                  ${val}
                </button>
              ))}
              <input
                type="number"
                placeholder="Other"
                value={customAmount}
                onChange={e => handleCustomAmount(e.target.value)}
                className="w-16 py-2 px-2 rounded-lg bg-card border border-card-border text-xs num text-center outline-none focus:border-polla-accent/50"
                min="0.01"
                step="0.01"
              />
            </div>

            <button
              ref={betBtnRef}
              onClick={handlePlaceBet}
              disabled={amount <= 0}
              className="w-full py-3 rounded-xl bg-btn-primary text-sm font-bold disabled:opacity-40 active:scale-[0.97] transition-transform"
            >
              Place Bet — ${amount.toFixed(2)} USDC
            </button>
          </div>
        )}

        {/* Pool info */}
        {market && market.totalPoolUsd > 0 && (
          <p className="text-text-25 text-[10px] text-center">
            Total pool: ${market.totalPoolUsd.toFixed(2)}
          </p>
        )}

        {/* User's existing bet indicator */}
        {hasBet && (
          <div className="flex items-center gap-1.5 justify-center">
            <span className="text-polla-success text-[10px]">✓ You have a bet on this match</span>
          </div>
        )}
      </Card>


      {/* Confirm Modal */}
      {confirmOpen && selectedOutcome !== null && (
        <BetConfirmModal
          matchLabel={`${match.team_a_name} vs ${match.team_b_name}`}
          outcomeLabel={outcomeDescriptions[selectedOutcome]}
          amount={amount}
          odds={odds[selectedOutcome] || 1}
          step={step}
          error={error}
          onConfirm={handleConfirm}
          onClose={handleCloseConfirm}
        />
      )}
    </>
  )
}
