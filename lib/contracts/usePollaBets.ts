'use client'

import { useReadContract, useWriteContract, useAccount, useChainId } from 'wagmi'
import { parseUnits, formatUnits, keccak256, toHex, type Address, type Hex } from 'viem'
import { useCallback, useState } from 'react'
import PollaBetsArtifact from './PollaBets.json'

// Contract addresses per chain
const POLLA_BETS_ADDRESS: Record<number, Address> = {
  42220: ((process.env.NEXT_PUBLIC_POLLA_BETS_ADDRESS || '0x0').trim()) as Address,    // Celo mainnet
  11142220: ((process.env.NEXT_PUBLIC_POLLA_BETS_ADDRESS || '0x0').trim()) as Address, // Celo Sepolia
}

// USDC addresses per chain
const USDC_ADDRESS: Record<number, Address> = {
  42220: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',    // Celo mainnet
  11142220: '0x01C5C0122039549AD1493B8220cABEdD739BC44E', // Celo Sepolia (Circle testnet USDC)
}

const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

const pollaBetsAbi = PollaBetsArtifact.abi

function useContractAddress(): Address {
  const chainId = useChainId()
  return POLLA_BETS_ADDRESS[chainId] || ('0x0' as Address)
}

function useUsdcAddress(): Address {
  const chainId = useChainId()
  return USDC_ADDRESS[chainId] || ('0x0' as Address)
}

// ─── Read: Market Data ──────────────────────────────────────

export interface MarketData {
  numOutcomes: number
  closingTime: number
  resolved: boolean
  cancelled: boolean
  winningOutcome: number
  totalPool: bigint
  pools: bigint[]
  // Derived
  totalPoolUsd: number
  oddsMultipliers: number[] // e.g. [2.4, 3.1, 0]
}

export function useMarketData(marketId: Hex | undefined) {
  const contractAddress = useContractAddress()

  const { data, refetch, isLoading } = useReadContract({
    address: contractAddress,
    abi: pollaBetsAbi,
    functionName: 'getMarket',
    args: marketId ? [marketId] : undefined,
    query: { enabled: !!marketId && contractAddress !== '0x0' },
  })

  const { data: oddsData } = useReadContract({
    address: contractAddress,
    abi: pollaBetsAbi,
    functionName: 'getOdds',
    args: marketId ? [marketId] : undefined,
    query: { enabled: !!marketId && contractAddress !== '0x0' },
  })

  let market: MarketData | null = null
  if (data) {
    const [numOutcomes, closingTime, resolved, cancelled, winningOutcome, totalPool, pools] =
      data as [number, bigint, boolean, boolean, number, bigint, bigint[]]

    const oddsRaw = (oddsData as bigint[]) || []
    const oddsMultipliers = Array.from({ length: Number(numOutcomes) }, (_, i) => {
      const raw = oddsRaw[i] ? Number(oddsRaw[i]) : 0
      return raw > 0 ? raw / 10_000 : 0
    })

    market = {
      numOutcomes: Number(numOutcomes),
      closingTime: Number(closingTime),
      resolved,
      cancelled,
      winningOutcome: Number(winningOutcome),
      totalPool,
      pools: pools.map(p => p),
      totalPoolUsd: Number(formatUnits(totalPool, 6)),
      oddsMultipliers,
    }
  }

  return { market, refetch, isLoading }
}

// ─── Read: User Bets ────────────────────────────────────────

export function useUserBets(marketId: Hex | undefined) {
  const contractAddress = useContractAddress()
  const { address } = useAccount()

  const { data, refetch } = useReadContract({
    address: contractAddress,
    abi: pollaBetsAbi,
    functionName: 'getUserBet',
    args: marketId && address ? [marketId, address] : undefined,
    query: { enabled: !!marketId && !!address && contractAddress !== '0x0' },
  })

  const bets = (data as bigint[]) || []
  const betsUsd = bets.map(b => Number(formatUnits(b, 6)))
  const hasBet = bets.some(b => b > BigInt(0))

  return { bets, betsUsd, hasBet, refetch }
}

// ─── Read: Check claimed ────────────────────────────────────

export function useClaimed(marketId: Hex | undefined) {
  const contractAddress = useContractAddress()
  const { address } = useAccount()

  const { data } = useReadContract({
    address: contractAddress,
    abi: pollaBetsAbi,
    functionName: 'claimed',
    args: marketId && address ? [marketId, address] : undefined,
    query: { enabled: !!marketId && !!address && contractAddress !== '0x0' },
  })

  return data as boolean | undefined
}

// ─── Write: Place Bet (approve + placeBet) ──────────────────

type BetStep = 'idle' | 'approving' | 'betting' | 'confirming' | 'confirmed' | 'error'

export function usePlaceBet() {
  const contractAddress = useContractAddress()
  const usdcAddress = useUsdcAddress()
  const { address } = useAccount()
  const [step, setStep] = useState<BetStep>('idle')
  const [error, setError] = useState<string | null>(null)

  const { writeContractAsync } = useWriteContract()

  const placeBet = useCallback(
    async (
      marketId: Hex,
      outcome: number,
      amountUsd: number,
      meta?: { matchId: string; marketType: 'result' | 'goals' }
    ) => {
      if (!address) throw new Error('Wallet not connected')
      setStep('approving')
      setError(null)

      const amount = parseUnits(amountUsd.toString(), 6)

      try {
        // Step 1: Approve USDC spend
        await writeContractAsync({
          address: usdcAddress,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [contractAddress, amount],
        })

        // Step 2: Place bet
        setStep('betting')
        const betTx = await writeContractAsync({
          address: contractAddress,
          abi: pollaBetsAbi,
          functionName: 'placeBet',
          args: [marketId, outcome, amount],
        })

        setStep('confirming')

        // Step 3: Record in Supabase for bet history + XP
        if (meta) {
          await fetch('/api/bets/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              match_id: meta.matchId,
              market_type: meta.marketType,
              market_id: marketId,
              outcome,
              amount: amountUsd,
              tx_hash: betTx,
            }),
          }).catch(() => {}) // Non-blocking — on-chain is source of truth
        }

        await new Promise(r => setTimeout(r, 2000))
        setStep('confirmed')

        return betTx
      } catch (err: any) {
        setStep('error')
        const msg = err?.shortMessage || err?.message || 'Transaction failed'
        setError(msg)
        throw err
      }
    },
    [address, contractAddress, usdcAddress, writeContractAsync]
  )

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
  }, [])

  return { placeBet, step, error, reset }
}

// ─── Write: Claim Winnings ──────────────────────────────────

export function useClaim() {
  const contractAddress = useContractAddress()
  const [pending, setPending] = useState(false)

  const { writeContractAsync } = useWriteContract()

  const claim = useCallback(
    async (marketId: Hex) => {
      setPending(true)
      try {
        const tx = await writeContractAsync({
          address: contractAddress,
          abi: pollaBetsAbi,
          functionName: 'claim',
          args: [marketId],
        })
        return tx
      } finally {
        setPending(false)
      }
    },
    [contractAddress, writeContractAsync]
  )

  const claimRefund = useCallback(
    async (marketId: Hex) => {
      setPending(true)
      try {
        const tx = await writeContractAsync({
          address: contractAddress,
          abi: pollaBetsAbi,
          functionName: 'claimRefund',
          args: [marketId],
        })
        return tx
      } finally {
        setPending(false)
      }
    },
    [contractAddress, writeContractAsync]
  )

  return { claim, claimRefund, pending }
}

// ─── Utility: matchId → marketId ────────────────────────────

export function matchIdToMarketId(matchId: string): Hex {
  return keccak256(toHex(matchId))
}
