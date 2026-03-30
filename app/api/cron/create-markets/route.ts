import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createMarketOnChain, computeMarketId } from '@/lib/contracts/operator'

/**
 * GET /api/cron/create-markets
 *
 * Creates on-chain markets for matches starting within the next 48 hours.
 * For each match, creates two markets:
 *   - Result market (3 outcomes: home win / draw / away win)
 *   - Goals market  (2 outcomes: under 2.5 / over 2.5)
 *
 * Idempotent: skips matches that already have markets in bet_markets.
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find matches starting within 48 hours that don't have markets yet
    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    const { data: matches, error: matchErr } = await supabaseAdmin
      .from('matches')
      .select('id, kickoff, status')
      .eq('status', 'scheduled')
      .gte('kickoff', now.toISOString())
      .lte('kickoff', in48h.toISOString())

    if (matchErr) throw new Error(`Failed to fetch matches: ${matchErr.message}`)
    if (!matches || matches.length === 0) {
      return NextResponse.json({ created: 0, message: 'No upcoming matches within 48h' })
    }

    // Get existing bet_markets to avoid duplicates
    const matchIds = matches.map(m => m.id)
    const { data: existing } = await supabaseAdmin
      .from('bet_markets')
      .select('match_id, market_type')
      .in('match_id', matchIds)

    const existingSet = new Set(
      (existing || []).map(e => `${e.match_id}-${e.market_type}`)
    )

    const created: string[] = []
    const errors: string[] = []

    for (const match of matches) {
      const closingTime = Math.floor(new Date(match.kickoff).getTime() / 1000)

      for (const marketType of ['result', 'goals'] as const) {
        const key = `${match.id}-${marketType}`
        if (existingSet.has(key)) continue

        try {
          const contractMarketId = computeMarketId(match.id, marketType)
          const txHash = await createMarketOnChain(match.id, marketType, closingTime)

          // Store in bet_markets
          const { error: insertErr } = await supabaseAdmin
            .from('bet_markets')
            .insert({
              match_id: match.id,
              market_type: marketType,
              contract_market_id: contractMarketId,
              status: 'open',
              tx_hash_create: txHash,
            })

          if (insertErr) {
            errors.push(`DB insert ${key}: ${insertErr.message}`)
          } else {
            created.push(key)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          errors.push(`${key}: ${msg}`)
          console.error(`Failed to create market ${key}:`, err)
        }
      }
    }

    return NextResponse.json({
      matches_checked: matches.length,
      created: created.length,
      created_ids: created,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('Create markets error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
