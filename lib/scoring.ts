// ============================================================
// Scoring Engine — Core Logic
// ============================================================

import { supabaseAdmin } from './supabase-admin'

// ── Match prediction grading ────────────────────────────────
//
// Tiered, exclusive scoring. Pick the highest tier the prediction
// satisfies; each row is strictly harder to reach than the one below.
//
//   EXACT             Both scores match exactly.                10
//   GD_WINNER         Winner + signed goal difference match.     5
//   WINNER_TEAM_GOALS Winner right + one team's goal count      3
//                     matches (but not both, else EXACT).
//   WINNER            Winner right, goals miss on both sides.    2
//   NONE              Wrong winner.                              0
//
// Note: the bonus "one team's goals right" cannot fire on the
// GD_WINNER tier — if GD matches and one team's goal count matches,
// the other team's count must also match by arithmetic, which is
// the EXACT tier. So the tiers above are mutually exclusive by
// construction.

export type ScoreTier =
  | 'EXACT'
  | 'GD_WINNER'
  | 'WINNER_TEAM_GOALS'
  | 'WINNER'
  | 'NONE'

export const TIER_POINTS: Record<ScoreTier, number> = {
  EXACT: 10,
  GD_WINNER: 5,
  WINNER_TEAM_GOALS: 3,
  WINNER: 2,
  NONE: 0,
}

export interface GradedPrediction {
  tier: ScoreTier
  points: number
}

interface ScoreInput {
  score_a: number
  score_b: number
}

export function gradePrediction(
  predicted: ScoreInput,
  actual: ScoreInput
): GradedPrediction {
  if (
    predicted.score_a === actual.score_a &&
    predicted.score_b === actual.score_b
  ) {
    return { tier: 'EXACT', points: TIER_POINTS.EXACT }
  }

  const predWinner = Math.sign(predicted.score_a - predicted.score_b)
  const actWinner = Math.sign(actual.score_a - actual.score_b)
  if (predWinner !== actWinner) {
    return { tier: 'NONE', points: TIER_POINTS.NONE }
  }

  const predGD = predicted.score_a - predicted.score_b
  const actGD = actual.score_a - actual.score_b
  if (predGD === actGD) {
    return { tier: 'GD_WINNER', points: TIER_POINTS.GD_WINNER }
  }

  const oneTeamGoalsMatch =
    predicted.score_a === actual.score_a ||
    predicted.score_b === actual.score_b
  if (oneTeamGoalsMatch) {
    return {
      tier: 'WINNER_TEAM_GOALS',
      points: TIER_POINTS.WINNER_TEAM_GOALS,
    }
  }

  return { tier: 'WINNER', points: TIER_POINTS.WINNER }
}

// ── DB-backed scoring pipeline ──────────────────────────────

export interface ScoreMatchResult {
  match_id: string
  match_number: number
  scored: number
}

export interface LeaderboardResult {
  users_ranked: number
}

/**
 * Score all predictions for a completed match.
 * Calls the DB function that compares predictions vs actual results,
 * awards points per the tiered rules in gradePrediction() above.
 */
export async function scoreMatch(matchId: string): Promise<ScoreMatchResult> {
  const { data, error } = await supabaseAdmin.rpc('score_match_predictions', {
    p_match_id: matchId,
  })

  if (error) throw new Error(`score_match_predictions failed: ${error.message}`)
  return data as unknown as ScoreMatchResult
}

/**
 * Refresh leaderboards for all groups that a match's predictions belong to.
 */
export async function refreshGroupLeaderboards(matchId: string): Promise<number> {
  // Find all groups that have members who predicted this match
  const { data: groupIds, error } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .in(
      'user_id',
      (
        await supabaseAdmin
          .from('predictions')
          .select('user_id')
          .eq('match_id', matchId)
      ).data?.map((p) => p.user_id) ?? []
    )

  if (error) throw new Error(`Failed to find groups: ${error.message}`)

  // Deduplicate group IDs
  const uniqueGroupIds = [...new Set(groupIds?.map((g) => g.group_id) ?? [])]

  for (const groupId of uniqueGroupIds) {
    const { error: refreshErr } = await supabaseAdmin.rpc('refresh_group_leaderboard', {
      p_group_id: groupId,
    })
    if (refreshErr) {
      console.error(`Failed to refresh group ${groupId}: ${refreshErr.message}`)
    }
  }

  return uniqueGroupIds.length
}

/**
 * Refresh the global leaderboard and recalculate tiers.
 */
export async function refreshGlobalLeaderboard(): Promise<LeaderboardResult> {
  const { data, error } = await supabaseAdmin.rpc('refresh_global_leaderboard')
  if (error) throw new Error(`refresh_global_leaderboard failed: ${error.message}`)
  return data as unknown as LeaderboardResult
}

/**
 * Full scoring pipeline for a completed match:
 * 1. Score predictions
 * 2. Refresh group leaderboards
 * 3. Refresh global leaderboard
 */
export async function runScoringPipeline(matchId: string) {
  const scoreResult = await scoreMatch(matchId)
  const groupsRefreshed = await refreshGroupLeaderboards(matchId)
  const globalResult = await refreshGlobalLeaderboard()

  return {
    ...scoreResult,
    groups_refreshed: groupsRefreshed,
    ...globalResult,
  }
}

/**
 * Score bonus predictions at tournament end.
 */
export async function scoreBonusPredictions(results: Record<string, string>) {
  const { data, error } = await supabaseAdmin.rpc('score_bonus_predictions', {
    p_results: results,
  })
  if (error) throw new Error(`score_bonus_predictions failed: ${error.message}`)

  // Refresh global leaderboard to include bonus points
  await refreshGlobalLeaderboard()

  return data
}
