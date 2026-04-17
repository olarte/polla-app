/**
 * Server-side operator for SabiParlayPools.
 *
 * Mirrors lib/contracts/operator.ts (PollaBets operator) in shape —
 * same chain selection, same reliance on POLLA_OPERATOR_PRIVATE_KEY.
 * The parlay contract and the match-winner contract share one
 * operator wallet on Celo / Celo Sepolia.
 */

import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  http,
  type Address,
  type Hex,
  type TransactionReceipt,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import ParlayArtifact from './SabiParlayPools.json'

const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://forno.celo-sepolia.celo-testnet.org'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://celo-sepolia.blockscout.com' },
  },
  testnet: true,
})

const IS_TESTNET =
  process.env.NEXT_PUBLIC_POLLA_BETS_ADDRESS?.startsWith('0x') &&
  process.env.NODE_ENV !== 'production'

const chain = IS_TESTNET ? celoSepolia : celo
const rpcUrl = IS_TESTNET
  ? 'https://forno.celo-sepolia.celo-testnet.org'
  : 'https://forno.celo.org'

const PARLAY_ADDRESS = (
  process.env.NEXT_PUBLIC_PARLAY_POOLS_ADDRESS ||
  (ParlayArtifact as { address?: string }).address ||
  ''
).trim() as Address

export const parlayPoolsAbi = ParlayArtifact.abi
export const parlayPoolsAddress = PARLAY_ADDRESS

// ─── Clients ─────────────────────────────────────────────────

function getOperatorAccount() {
  const pk = process.env.POLLA_OPERATOR_PRIVATE_KEY
  if (!pk) throw new Error('POLLA_OPERATOR_PRIVATE_KEY not set')
  return privateKeyToAccount(pk as Hex)
}

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
})

function getWalletClient() {
  return createWalletClient({
    account: getOperatorAccount(),
    chain,
    transport: http(rpcUrl),
  })
}

// ─── Gas / balance ───────────────────────────────────────────

/** Current operator wallet CELO balance, in wei. */
export async function getOperatorBalance(): Promise<bigint> {
  const account = getOperatorAccount()
  return publicClient.getBalance({ address: account.address })
}

export const GAS_WARN_WEI = 2_000_000_000_000_000_000n // 2 CELO
export const GAS_BLOCK_WEI = 500_000_000_000_000_000n // 0.5 CELO

export function classifyBalance(balanceWei: bigint): 'ok' | 'warn' | 'block' {
  if (balanceWei < GAS_BLOCK_WEI) return 'block'
  if (balanceWei < GAS_WARN_WEI) return 'warn'
  return 'ok'
}

// ─── Contract writes ─────────────────────────────────────────

export async function createParlayMarket(
  onchainMarketId: bigint,
  locksAt: number,
): Promise<Hex> {
  const wallet = getWalletClient()
  const hash = await wallet.writeContract({
    address: PARLAY_ADDRESS,
    abi: parlayPoolsAbi,
    functionName: 'createMarket',
    args: [onchainMarketId, BigInt(locksAt)],
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

export async function settleAndPayout(
  onchainMarketId: bigint,
  resolution: number,
  winners5: bigint[],
  winners4: bigint[],
  winners3: bigint[],
): Promise<{ hash: Hex; receipt: TransactionReceipt }> {
  const wallet = getWalletClient()
  const hash = await wallet.writeContract({
    address: PARLAY_ADDRESS,
    abi: parlayPoolsAbi,
    functionName: 'settleAndPayout',
    args: [onchainMarketId, resolution, winners5, winners4, winners3],
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(`settleAndPayout reverted (tx=${hash})`)
  }
  return { hash, receipt }
}

// ─── Contract reads ──────────────────────────────────────────

export interface OnchainMarket {
  locksAt: bigint
  resolution: number
  settled: boolean
  grossPool: bigint
  tier5Stakes: bigint
  tier4Stakes: bigint
  tier3Stakes: bigint
  tier5Pool: bigint
  tier4Pool: bigint
  tier3Pool: bigint
}

export async function getMarketOnchain(
  onchainMarketId: bigint,
): Promise<OnchainMarket> {
  const data = (await publicClient.readContract({
    address: PARLAY_ADDRESS,
    abi: parlayPoolsAbi,
    functionName: 'getMarket',
    args: [onchainMarketId],
  })) as [
    bigint,
    number,
    boolean,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
  ]
  const [
    locksAt,
    resolution,
    settled,
    grossPool,
    tier5Stakes,
    tier4Stakes,
    tier3Stakes,
    tier5Pool,
    tier4Pool,
    tier3Pool,
  ] = data
  return {
    locksAt,
    resolution,
    settled,
    grossPool,
    tier5Stakes,
    tier4Stakes,
    tier3Stakes,
    tier5Pool,
    tier4Pool,
    tier3Pool,
  }
}

// ─── Receipt event parsing ───────────────────────────────────

export interface PayoutEvent {
  ticketId: bigint
  user: Address
  amount: bigint
}

export interface ReceiptSummary {
  payouts: PayoutEvent[]
  orphanSwept: bigint
}

/**
 * Decode PayoutDelivered + OrphanPoolSwept events from a settle receipt.
 * Used by both the settle job (happy-path writeback) and the reconcile
 * job (replay for markets whose DB state fell behind the chain).
 */
export function parseSettleReceipt(
  receipt: TransactionReceipt,
  onchainMarketId: bigint,
): ReceiptSummary {
  const payouts: PayoutEvent[] = []
  let orphanSwept = 0n

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !== PARLAY_ADDRESS.toLowerCase()
    ) {
      continue
    }
    try {
      const decoded = decodeEventLog({
        abi: parlayPoolsAbi,
        data: log.data,
        topics: log.topics,
      })
      if (decoded.eventName === 'PayoutDelivered') {
        const args = decoded.args as unknown as {
          marketId: bigint
          ticketId: bigint
          user: Address
          amount: bigint
        }
        if (args.marketId === onchainMarketId) {
          payouts.push({
            ticketId: args.ticketId,
            user: args.user,
            amount: args.amount,
          })
        }
      } else if (decoded.eventName === 'OrphanPoolSwept') {
        const args = decoded.args as unknown as {
          marketId: bigint
          amount: bigint
        }
        if (args.marketId === onchainMarketId) {
          orphanSwept += args.amount
        }
      }
    } catch {
      // Not one of our events; skip.
    }
  }

  return { payouts, orphanSwept }
}
