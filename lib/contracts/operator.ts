/**
 * Server-side operator wallet for PollaBets contract interactions.
 * Uses POLLA_OPERATOR_PRIVATE_KEY to sign transactions (createMarket, resolve, cancelMarket).
 * This module runs ONLY on the server (API routes / cron jobs).
 */

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import PollaBetsArtifact from './PollaBets.json'

// Celo Sepolia testnet — not yet in viem, define manually
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

// ─── Config ──────────────────────────────────────────────────

const IS_TESTNET = process.env.NEXT_PUBLIC_POLLA_BETS_ADDRESS?.startsWith('0x') &&
  process.env.NODE_ENV !== 'production'

const chain = IS_TESTNET ? celoSepolia : celo
const rpcUrl = IS_TESTNET
  ? 'https://forno.celo-sepolia.celo-testnet.org'
  : 'https://forno.celo.org'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_POLLA_BETS_ADDRESS as Address
const pollaBetsAbi = PollaBetsArtifact.abi

// ─── Clients ─────────────────────────────────────────────────

function getOperatorAccount() {
  const pk = process.env.POLLA_OPERATOR_PRIVATE_KEY
  if (!pk) throw new Error('POLLA_OPERATOR_PRIVATE_KEY not set')
  return privateKeyToAccount(pk as Hex)
}

const publicClient = createPublicClient({
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

// ─── Market ID helpers ───────────────────────────────────────

/** Compute the same marketId that BetCard uses on the frontend */
export function computeMarketId(matchId: string, marketType: 'result' | 'goals'): Hex {
  return keccak256(toHex(`${matchId}-${marketType}`))
}

// ─── Contract Write Functions ────────────────────────────────

/**
 * Create a market on-chain for a given match + type.
 * Returns the transaction hash.
 */
export async function createMarketOnChain(
  matchId: string,
  marketType: 'result' | 'goals',
  closingTime: number // unix timestamp
): Promise<Hex> {
  const wallet = getWalletClient()
  const marketId = computeMarketId(matchId, marketType)
  const numOutcomes = marketType === 'result' ? 3 : 2

  const hash = await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: pollaBetsAbi,
    functionName: 'createMarket',
    args: [marketId, numOutcomes, BigInt(closingTime)],
  })

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash })

  return hash
}

/**
 * Resolve a market with the winning outcome.
 * Returns the transaction hash.
 */
export async function resolveMarketOnChain(
  contractMarketId: Hex,
  winningOutcome: number
): Promise<Hex> {
  const wallet = getWalletClient()

  const hash = await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: pollaBetsAbi,
    functionName: 'resolve',
    args: [contractMarketId, winningOutcome],
  })

  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

/**
 * Cancel a market (e.g., match postponed). All bets refundable.
 * Returns the transaction hash.
 */
export async function cancelMarketOnChain(contractMarketId: Hex): Promise<Hex> {
  const wallet = getWalletClient()

  const hash = await wallet.writeContract({
    address: CONTRACT_ADDRESS,
    abi: pollaBetsAbi,
    functionName: 'cancelMarket',
    args: [contractMarketId],
  })

  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

/**
 * Read market data from the contract (for verification).
 */
export async function getMarketOnChain(contractMarketId: Hex) {
  const data = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: pollaBetsAbi,
    functionName: 'getMarket',
    args: [contractMarketId],
  }) as [number, bigint, boolean, boolean, number, bigint, bigint[]]

  const [numOutcomes, closingTime, resolved, cancelled, winningOutcome, totalPool, pools] = data
  return {
    numOutcomes: Number(numOutcomes),
    closingTime: Number(closingTime),
    resolved,
    cancelled,
    winningOutcome: Number(winningOutcome),
    totalPool,
    pools,
  }
}
