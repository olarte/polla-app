import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runScoringPipeline } from '@/lib/scoring'

/**
 * POST /api/test/seed-results
 *
 * Seeds mock match results and triggers scoring.
 * For testing only — do NOT deploy to production.
 *
 * Body options:
 * - { match_count?: number }  — how many group matches to seed (default: 6, one group)
 * - { match_ids?: string[] }  — specific match IDs to seed with random scores
 *
 * Also seeds mock predictions for any existing users.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const matchCount = body.match_count ?? 6

    // Get matches to seed
    let matches: { id: string; match_number: number; team_a_code: string; team_b_code: string }[]

    if (body.match_ids) {
      const { data } = await supabaseAdmin
        .from('matches')
        .select('id, match_number, team_a_code, team_b_code')
        .in('id', body.match_ids)

      matches = data ?? []
    } else {
      const { data } = await supabaseAdmin
        .from('matches')
        .select('id, match_number, team_a_code, team_b_code')
        .eq('status', 'scheduled')
        .eq('stage', 'group')
        .order('match_number')
        .limit(matchCount)

      matches = data ?? []
    }

    if (matches.length === 0) {
      return NextResponse.json({ error: 'No scheduled matches found to seed' }, { status: 404 })
    }

    // Get all users for mock predictions
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(100)

    const results: Array<{
      match_id: string
      match_number: number
      score: string
      predictions_seeded: number
      scoring: unknown
    }> = []

    for (const match of matches) {
      // Generate random realistic score (0-4 goals each)
      const scoreA = Math.floor(Math.random() * 4)
      const scoreB = Math.floor(Math.random() * 4)

      // Set match as completed with score
      await supabaseAdmin
        .from('matches')
        .update({
          score_a: scoreA,
          score_b: scoreB,
          status: 'completed',
        })
        .eq('id', match.id)

      // Seed mock predictions for each user
      let predictionsSeeded = 0
      for (const user of users ?? []) {
        // Random prediction (slightly biased toward actual result for realism)
        const bias = Math.random() > 0.3
        const predA = bias ? scoreA + Math.floor(Math.random() * 2) - 1 : Math.floor(Math.random() * 5)
        const predB = bias ? scoreB + Math.floor(Math.random() * 2) - 1 : Math.floor(Math.random() * 5)

        const { error: predErr } = await supabaseAdmin
          .from('predictions')
          .upsert(
            {
              user_id: user.id,
              match_id: match.id,
              score_a: Math.max(0, predA),
              score_b: Math.max(0, predB),
            },
            { onConflict: 'user_id,match_id' }
          )

        if (!predErr) predictionsSeeded++
      }

      // Run scoring pipeline
      const scoring = await runScoringPipeline(match.id)

      results.push({
        match_id: match.id,
        match_number: match.match_number,
        score: `${scoreA}-${scoreB}`,
        predictions_seeded: predictionsSeeded,
        scoring,
      })
    }

    return NextResponse.json({
      success: true,
      matches_seeded: results.length,
      results,
    })
  } catch (err) {
    console.error('Seed results error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
