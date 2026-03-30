import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateAllMatches } from '@/lib/world-cup-data'

export async function POST() {
  const supabase = supabaseAdmin

  // Check if matches already seeded
  const { count } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Matches already seeded', count },
      { status: 409 }
    )
  }

  const allMatches = generateAllMatches()

  // Insert in batches of 50
  const rows = allMatches.map((m) => ({
    match_number: m.match_number,
    stage: m.stage,
    group_letter: m.group_letter,
    team_a_name: m.team_a.name,
    team_a_code: m.team_a.code,
    team_a_flag: m.team_a.flag,
    team_b_name: m.team_b.name,
    team_b_code: m.team_b.code,
    team_b_flag: m.team_b.flag,
    kickoff: m.kickoff,
    venue: m.venue,
    city: m.city,
    multiplier: m.multiplier,
    status: 'scheduled',
  }))

  const batchSize = 50
  let inserted = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from('matches').insert(batch)

    if (error) {
      return NextResponse.json(
        { error: `Failed at batch ${i}: ${error.message}`, inserted },
        { status: 500 }
      )
    }

    inserted += batch.length
  }

  return NextResponse.json({
    success: true,
    inserted,
    breakdown: {
      group: allMatches.filter((m) => m.stage === 'group').length,
      r32: allMatches.filter((m) => m.stage === 'r32').length,
      r16: allMatches.filter((m) => m.stage === 'r16').length,
      qf: allMatches.filter((m) => m.stage === 'qf').length,
      sf: allMatches.filter((m) => m.stage === 'sf').length,
      third: allMatches.filter((m) => m.stage === 'third').length,
      final: allMatches.filter((m) => m.stage === 'final').length,
    },
  })
}
