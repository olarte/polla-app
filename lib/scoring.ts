// ============================================================
// Scoring Engine — Core Logic
// ============================================================

import { supabaseAdmin } from './supabase-admin'

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
 * awards points (with stage multiplier), and credits XP.
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
