import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchTodaysMatches, mapApiStatus, mapTeamCode } from '@/lib/football-api'
import { runScoringPipeline } from '@/lib/scoring'
import { resolveMatchMarkets } from '@/lib/resolve-markets'

/**
 * GET /api/cron/poll-matches
 *
 * Called by a cron job every 60s during match windows.
 * - Fetches latest results from football-data.org
 * - Updates match status and scores in our DB
 * - Triggers scoring pipeline for newly completed matches
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiMatches = await fetchTodaysMatches()
    const updates: string[] = []
    const scored: string[] = []
    const resolved: string[] = []

    for (const apiMatch of apiMatches) {
      const ourStatus = mapApiStatus(apiMatch.status)
      const homeCode = mapTeamCode(apiMatch.homeTeam.tla)
      const awayCode = mapTeamCode(apiMatch.awayTeam.tla)

      // Find matching match in our DB by team codes and date
      const { data: dbMatch } = await supabaseAdmin
        .from('matches')
        .select('id, status, score_a, score_b')
        .eq('team_a_code', homeCode)
        .eq('team_b_code', awayCode)
        .single()

      if (!dbMatch) continue

      // Skip if already completed and scored
      if (dbMatch.status === 'completed') continue

      const needsUpdate =
        dbMatch.status !== ourStatus ||
        dbMatch.score_a !== apiMatch.score.fullTime.home ||
        dbMatch.score_b !== apiMatch.score.fullTime.away

      if (!needsUpdate) continue

      // Update match
      const updateData: Record<string, unknown> = { status: ourStatus }
      if (apiMatch.score.fullTime.home !== null) {
        updateData.score_a = apiMatch.score.fullTime.home
        updateData.score_b = apiMatch.score.fullTime.away
      }

      const { error: updateErr } = await supabaseAdmin
        .from('matches')
        .update(updateData)
        .eq('id', dbMatch.id)

      if (updateErr) {
        console.error(`Failed to update match ${dbMatch.id}: ${updateErr.message}`)
        continue
      }

      updates.push(dbMatch.id)

      // If match just completed, trigger scoring pipeline
      if (ourStatus === 'completed' && dbMatch.status !== 'completed') {
        try {
          const result = await runScoringPipeline(dbMatch.id)
          scored.push(dbMatch.id)
          console.log(`Scored match ${dbMatch.id}:`, result)
        } catch (scoreErr) {
          console.error(`Failed to score match ${dbMatch.id}:`, scoreErr)
        }

        // Resolve on-chain bet markets for this match
        if (apiMatch.score.fullTime.home !== null && apiMatch.score.fullTime.away !== null) {
          try {
            const resolveResult = await resolveMatchMarkets(
              dbMatch.id,
              apiMatch.score.fullTime.home,
              apiMatch.score.fullTime.away
            )
            if (resolveResult.markets_resolved > 0) {
              resolved.push(dbMatch.id)
              console.log(`Resolved markets for ${dbMatch.id}:`, resolveResult)
            }
          } catch (resolveErr) {
            console.error(`Failed to resolve markets for ${dbMatch.id}:`, resolveErr)
          }
        }
      }
    }

    return NextResponse.json({
      polled: apiMatches.length,
      updated: updates.length,
      scored: scored.length,
      resolved: resolved.length,
      updated_ids: updates,
      scored_ids: scored,
      resolved_ids: resolved,
    })
  } catch (err) {
    console.error('Poll matches error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
