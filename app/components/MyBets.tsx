'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { keccak256, toHex, formatUnits, type Hex } from 'viem'
import { useReadContract } from 'wagmi'
import { useClaim } from '@/lib/contracts/usePollaBets'
import Card from './Card'
import Label from './Label'
import Collapsible from './Collapsible'

// We store bet records in Supabase for easy querying
// This component fetches from /api/bets/my-bets

interface BetRecord {
  id: string
  match_id: string
  market_type: 'result' | 'goals'
  outcome: number
  amount: number // USD
  team_a_name: string
  team_a_flag: string
  team_b_name: string
  team_b_flag: string
  kickoff: string
  status: 'pending' | 'won' | 'lost' | 'refund'
  payout: number | null
  market_id: string // hex
  claimed: boolean
}

function outcomeLabel(bet: BetRecord): string {
  if (bet.market_type === 'goals') {
    return bet.outcome === 0 ? 'Under 2.5' : 'Over 2.5'
  }
  if (bet.outcome === 0) return `${bet.team_a_flag} ${bet.team_a_name}`
  if (bet.outcome === 1) return 'Draw'
  return `${bet.team_b_flag} ${bet.team_b_name}`
}

export default function MyBets() {
  const { address } = useAccount()
  const [bets, setBets] = useState<BetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { claim, claimRefund, pending: claimPending } = useClaim()
  const [claimingId, setClaimingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBets() {
      try {
        const res = await fetch('/api/bets/my-bets')
        if (res.ok) {
          const data = await res.json()
          setBets(data.bets || [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchBets()
  }, [])

  const handleClaim = async (bet: BetRecord) => {
    setClaimingId(bet.id)
    try {
      if (bet.status === 'refund') {
        await claimRefund(bet.market_id as Hex)
      } else {
        await claim(bet.market_id as Hex)
      }
      // Mark as claimed locally
      setBets(prev =>
        prev.map(b => (b.id === bet.id ? { ...b, claimed: true } : b))
      )
    } catch {
      // handled upstream
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) return null
  if (bets.length === 0) return null

  const activeBets = bets.filter(b => b.status === 'pending')
  const resolvedBets = bets.filter(b => b.status !== 'pending')

  return (
    <Collapsible title={`My Bets (${bets.length})`}>
      <div className="space-y-2">
        {activeBets.map(bet => (
          <Card key={bet.id} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">
                {bet.team_a_flag} {bet.team_a_name} vs {bet.team_b_name} {bet.team_b_flag}
              </p>
              <p className="text-text-40 text-[10px] mt-0.5">
                {outcomeLabel(bet)} · ${bet.amount.toFixed(2)}
              </p>
            </div>
            <span className="text-polla-warning text-[10px] font-semibold px-2 py-1 rounded-lg bg-polla-warning/10 border border-polla-warning/20">
              Pending
            </span>
          </Card>
        ))}

        {resolvedBets.map(bet => (
          <Card key={bet.id} className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">
                {bet.team_a_flag} {bet.team_a_name} vs {bet.team_b_name} {bet.team_b_flag}
              </p>
              <p className="text-text-40 text-[10px] mt-0.5">
                {outcomeLabel(bet)} · ${bet.amount.toFixed(2)}
              </p>
            </div>
            {bet.status === 'won' && !bet.claimed ? (
              <button
                onClick={() => handleClaim(bet)}
                disabled={claimPending && claimingId === bet.id}
                className="text-polla-success text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-polla-success/10 border border-polla-success/20 active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {claimPending && claimingId === bet.id
                  ? 'Claiming...'
                  : `Won $${bet.payout?.toFixed(2)} — Claim`}
              </button>
            ) : bet.status === 'won' && bet.claimed ? (
              <span className="text-polla-success text-[10px] font-semibold">
                Won ${bet.payout?.toFixed(2)} ✓
              </span>
            ) : bet.status === 'refund' && !bet.claimed ? (
              <button
                onClick={() => handleClaim(bet)}
                disabled={claimPending && claimingId === bet.id}
                className="text-polla-warning text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-polla-warning/10 border border-polla-warning/20 active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {claimPending && claimingId === bet.id ? 'Claiming...' : 'Refund'}
              </button>
            ) : (
              <span className="text-text-25 text-[10px]">
                Lost ${bet.amount.toFixed(2)}
              </span>
            )}
          </Card>
        ))}
      </div>
    </Collapsible>
  )
}
