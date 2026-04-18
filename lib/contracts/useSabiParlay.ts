'use client'

import { useReadContract, useWriteContract, useAccount, useChainId, usePublicClient } from 'wagmi'
import { parseUnits, decodeEventLog, type Address, type Hex } from 'viem'
import { useCallback, useState } from 'react'
import ParlayArtifact from './SabiParlayPools.json'

const PARLAY_ADDRESS_BY_CHAIN: Record<number, Address> = {
  42220: ((process.env.NEXT_PUBLIC_PARLAY_POOLS_ADDRESS || '0x0').trim()) as Address,
  11142220: ((process.env.NEXT_PUBLIC_PARLAY_POOLS_ADDRESS || '0x0').trim()) as Address,
}

const USDC_ADDRESS_BY_CHAIN: Record<number, Address> = {
  42220: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  11142220: '0x01C5C0122039549AD1493B8220cABEdD739BC44E',
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
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

const parlayAbi = ParlayArtifact.abi

export type TicketStep =
  | 'idle'
  | 'approving'
  | 'placing'
  | 'confirming'
  | 'confirmed'
  | 'error'

export interface PicksInput {
  // Each entry is 'A' or 'B' for a 5-question market, in slot order 1..5
  slot1: 'A' | 'B'
  slot2: 'A' | 'B'
  slot3: 'A' | 'B'
  slot4: 'A' | 'B'
  slot5: 'A' | 'B'
}

/**
 * Pack a 5-pick selection into a uint8 bitmask where bit i = 1 when
 * slot (i+1) is 'B'. 'A' = 0, 'B' = 1. Matches the contract's resolution
 * mask convention.
 */
export function packPicks(p: PicksInput): number {
  const bit = (x: 'A' | 'B') => (x === 'B' ? 1 : 0)
  return (
    bit(p.slot1) |
    (bit(p.slot2) << 1) |
    (bit(p.slot3) << 2) |
    (bit(p.slot4) << 3) |
    (bit(p.slot5) << 4)
  )
}

function useAddresses() {
  const chainId = useChainId()
  return {
    parlay: PARLAY_ADDRESS_BY_CHAIN[chainId] || ('0x0' as Address),
    usdc: USDC_ADDRESS_BY_CHAIN[chainId] || ('0x0' as Address),
  }
}

// ─── Read: USDC balance ─────────────────────────────────────
export function useUsdcBalance() {
  const { address } = useAccount()
  const { usdc } = useAddresses()

  const { data, refetch } = useReadContract({
    address: usdc,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && usdc !== '0x0' },
  })

  const raw = (data as bigint | undefined) ?? 0n
  const usd = Number(raw) / 1_000_000
  return { raw, usd, refetch }
}

// ─── Write: approve + placeTicket ──────────────────────────
export function usePlaceTicket() {
  const { address } = useAccount()
  const { parlay, usdc } = useAddresses()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const [step, setStep] = useState<TicketStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<Hex | null>(null)
  const [onchainTicketId, setOnchainTicketId] = useState<bigint | null>(null)

  const placeTicket = useCallback(
    async (onchainMarketId: bigint, picks: number, amountUsd: number) => {
      if (!address) throw new Error('Wallet not connected')
      if (!publicClient) throw new Error('No RPC client')
      setError(null)
      setStep('approving')

      const amount = parseUnits(amountUsd.toString(), 6)

      try {
        await writeContractAsync({
          address: usdc,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [parlay, amount],
        })

        setStep('placing')
        const hash = await writeContractAsync({
          address: parlay,
          abi: parlayAbi,
          functionName: 'placeTicket',
          args: [onchainMarketId, picks, amount],
        })
        setTxHash(hash)

        setStep('confirming')
        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        // Extract TicketPlaced event to recover on-chain ticketId
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== parlay.toLowerCase()) continue
          try {
            const decoded = decodeEventLog({ abi: parlayAbi, data: log.data, topics: log.topics })
            if (decoded.eventName === 'TicketPlaced') {
              const args = decoded.args as unknown as { ticketId: bigint }
              setOnchainTicketId(args.ticketId)
              break
            }
          } catch {
            // skip non-parlay events
          }
        }

        setStep('confirmed')
        return { hash, receipt }
      } catch (err: any) {
        setStep('error')
        setError(err?.shortMessage || err?.message || 'Transaction failed')
        throw err
      }
    },
    [address, parlay, usdc, publicClient, writeContractAsync]
  )

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setTxHash(null)
    setOnchainTicketId(null)
  }, [])

  return { placeTicket, step, error, txHash, onchainTicketId, reset }
}
