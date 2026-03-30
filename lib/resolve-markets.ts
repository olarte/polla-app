/**
 * Market Resolution — determines winning outcomes and resolves on-chain.
 *
 * Called after a match completes and scores are written.
 * For each match, resolves two markets:
 *   - Result market: 0 = home win, 1 = draw, 2 = away win
 *   - Goals market:  0 = under 2.5, 1 = over 2.5
 *
 * Edge cases:
 *   - Penalties: 90-min result counts (draw if went to pens). Goals = 90 min only.
 *   - Cancelled/postponed: call cancelMarket for refunds.
 */

import { supabaseAdmin } from './supabase-admin'
import {
  resolveMarketOnChain,
  cancelMarketOnChain,
  getMarketOnChain,
} from './contracts/operator'
import { formatUnits, type Hex } from 'viem'

interface ResolveResult {
  match_id: string
  markets_resolved: number
  markets_cancelled: number
  bets_updated: number
  errors: string[]
}

/**
 * Determine the winning outcome for a result market.
 * 0 = home win, 1 = draw, 2 = away win
 */
function getResultOutcome(scoreA: number, scoreB: number): number {
  if (scoreA > scoreB) return 0
  if (scoreA === scoreB) return 1
  return 2
}

/**
 * Determine the winning outcome for a goals market.
 * 0 = under 2.5, 1 = over 2.5
 */
function getGoalsOutcome(scoreA: number, scoreB: number): number {
  return (scoreA + scoreB) > 2 ? 1 : 0
}

/**
 * Calculate gross payout for a winning bet using on-chain pool data.
 * grossPayout = (userBet / winnerPool) * totalPool
 * netPayout = grossPayout - 5% fee
 */
function calculateNetPayout(
  betAmount: number,
  totalPool: bigint,
  winnerPool: bigint
): number {
  if (winnerPool === BigInt(0)) return 0
  // Mirror the contract math: grossPayout = (userBet * totalPool) / winnerPool
  // Fee = grossPayout * 500 / 10000
  const betWei = BigInt(Math.round(betAmount * 1e6))
  const gross = (betWei * totalPool) / winnerPool
  const fee = (gross * BigInt(500)) / BigInt(10000)
  const net = gross - fee
  return Number(formatUnits(net, 6))
}

/**
 * Resolve all markets for a completed match.
 */
export async function resolveMatchMarkets(
  matchId: string,
  scoreA: number,
  scoreB: number
): Promise<ResolveResult> {
  const result: ResolveResult = {
    match_id: matchId,
    markets_resolved: 0,
    markets_cancelled: 0,
    bets_updated: 0,
    errors: [],
  }

  // Fetch bet_markets for this match that are still open
  const { data: markets, error } = await supabaseAdmin
    .from('bet_markets')
    .select('*')
    .eq('match_id', matchId)
    .eq('status', 'open')

  if (error) {
    result.errors.push(`Failed to fetch markets: ${error.message}`)
    return result
  }

  if (!markets || markets.length === 0) {
    return result // No markets to resolve
  }

  for (const market of markets) {
    const contractMarketId = market.contract_market_id as Hex
    const marketType = market.market_type as 'result' | 'goals'

    try {
      // Check if market has any bets on-chain
      const onChainData = await getMarketOnChain(contractMarketId)

      // Skip if already resolved/cancelled on-chain
      if (onChainData.resolved || onChainData.cancelled) {
        await supabaseAdmin
          .from('bet_markets')
          .update({
            status: onChainData.cancelled ? 'cancelled' : 'resolved',
            winning_outcome: onChainData.cancelled ? null : onChainData.winningOutcome,
          })
          .eq('id', market.id)
        continue
      }

      // Determine winning outcome
      const winningOutcome = marketType === 'result'
        ? getResultOutcome(scoreA, scoreB)
        : getGoalsOutcome(scoreA, scoreB)

      // Resolve on-chain
      const txHash = await resolveMarketOnChain(contractMarketId, winningOutcome)

      // Update bet_markets
      await supabaseAdmin
        .from('bet_markets')
        .update({
          status: 'resolved',
          winning_outcome: winningOutcome,
          tx_hash_resolve: txHash,
        })
        .eq('id', market.id)

      result.markets_resolved++

      // Re-read on-chain data after resolution to get accurate pool sizes
      const resolvedData = await getMarketOnChain(contractMarketId)

      // Update bets table — mark winners and losers, calculate payouts
      const { data: bets } = await supabaseAdmin
        .from('bets')
        .select('id, user_id, outcome, amount')
        .eq('market_id', contractMarketId)
        .eq('status', 'active')

      if (bets && bets.length > 0) {
        const winnerPool = resolvedData.pools[winningOutcome] ?? BigInt(0)
        const totalPool = resolvedData.totalPool

        for (const bet of bets) {
          const isWinner = bet.outcome === winningOutcome
          const payout = isWinner
            ? calculateNetPayout(bet.amount, totalPool, winnerPool)
            : 0

          const { error: updateErr } = await supabaseAdmin
            .from('bets')
            .update({
              status: isWinner ? 'won' : 'lost',
              payout: isWinner ? payout : null,
            })
            .eq('id', bet.id)

          if (updateErr) {
            result.errors.push(`Bet ${bet.id}: ${updateErr.message}`)
          } else {
            result.bets_updated++

            // Award XP for winning bet (5 XP)
            if (isWinner) {
              await supabaseAdmin.rpc('increment_xp', {
                p_user_id: bet.user_id,
                p_amount: 5,
              })
              await supabaseAdmin.from('xp_events').insert({
                user_id: bet.user_id,
                event_type: 'bet_won',
                xp_amount: 5,
                reference_id: matchId,
              })
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      result.errors.push(`Market ${market.market_type}: ${msg}`)
      console.error(`Failed to resolve market ${contractMarketId}:`, err)
    }
  }

  return result
}

/**
 * Cancel all markets for a match (e.g., postponed/cancelled).
 */
export async function cancelMatchMarkets(matchId: string): Promise<ResolveResult> {
  const result: ResolveResult = {
    match_id: matchId,
    markets_resolved: 0,
    markets_cancelled: 0,
    bets_updated: 0,
    errors: [],
  }

  const { data: markets } = await supabaseAdmin
    .from('bet_markets')
    .select('*')
    .eq('match_id', matchId)
    .eq('status', 'open')

  if (!markets || markets.length === 0) return result

  for (const market of markets) {
    const contractMarketId = market.contract_market_id as Hex

    try {
      const txHash = await cancelMarketOnChain(contractMarketId)

      await supabaseAdmin
        .from('bet_markets')
        .update({
          status: 'cancelled',
          tx_hash_resolve: txHash,
        })
        .eq('id', market.id)

      result.markets_cancelled++

      // Mark all bets as refundable
      const { data: bets } = await supabaseAdmin
        .from('bets')
        .select('id')
        .eq('market_id', contractMarketId)
        .eq('status', 'active')

      if (bets) {
        for (const bet of bets) {
          await supabaseAdmin
            .from('bets')
            .update({ status: 'refund' })
            .eq('id', bet.id)
          result.bets_updated++
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      result.errors.push(`Cancel ${market.market_type}: ${msg}`)
    }
  }

  return result
}
