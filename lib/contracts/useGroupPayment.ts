'use client'

import { useCallback, useState } from 'react'
import { useAccount, useWriteContract, useChainId } from 'wagmi'
import { parseUnits, type Address } from 'viem'

// USDC addresses per chain (same as usePollaBets)
const USDC_ADDRESS: Record<number, Address> = {
  42220: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',    // Celo mainnet
  11142220: '0x01C5C0122039549AD1493B8220cABEdD739BC44E', // Celo Sepolia (Circle testnet USDC)
}

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as Address

const ERC20_ABI = [
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
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const

export type PaymentStep = 'idle' | 'approving' | 'transferring' | 'confirming' | 'confirmed' | 'error'

/**
 * Hook to handle USDC payment for paid group entry.
 * Approve + transfer to treasury address.
 */
export function useGroupPayment() {
  const chainId = useChainId()
  const { address } = useAccount()
  const [step, setStep] = useState<PaymentStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const { writeContractAsync } = useWriteContract()

  const usdcAddress = USDC_ADDRESS[chainId] || ('0x0' as Address)

  const payEntryFee = useCallback(
    async (amountUsd: number): Promise<string> => {
      if (!address) throw new Error('Wallet not connected')
      if (!TREASURY_ADDRESS || TREASURY_ADDRESS === '0x0') {
        throw new Error('Treasury address not configured')
      }

      setStep('approving')
      setError(null)

      const amount = parseUnits(amountUsd.toString(), 6)

      try {
        // Step 1: Approve USDC spend (approve treasury to pull, or just transfer)
        // For a simple transfer we don't need approval, but some USDC implementations
        // require it. We'll do approve + transfer for safety.
        await writeContractAsync({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [TREASURY_ADDRESS, amount],
        })

        // Step 2: Transfer USDC to treasury
        setStep('transferring')
        const txHash = await writeContractAsync({
          address: usdcAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [TREASURY_ADDRESS, amount],
        })

        setStep('confirming')
        // Small delay to let the tx propagate
        await new Promise(r => setTimeout(r, 2000))
        setStep('confirmed')

        return txHash
      } catch (err: any) {
        setStep('error')
        const msg = err?.shortMessage || err?.message || 'Payment failed'
        setError(msg)
        throw err
      }
    },
    [address, usdcAddress, writeContractAsync]
  )

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
  }, [])

  return { payEntryFee, step, error, reset }
}
