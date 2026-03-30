import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { refreshGlobalLeaderboard } from '@/lib/scoring'

/**
 * POST /api/scoring/refresh-leaderboards
 *
 * Manually trigger a full leaderboard refresh.
 * Refreshes all group leaderboards + global leaderboard + tiers.
 *
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Refresh all group leaderboards
    const { data: groups, error: groupsErr } = await supabaseAdmin
      .from('groups')
      .select('id')
      .in('status', ['open', 'locked'])

    if (groupsErr) throw new Error(`Failed to fetch groups: ${groupsErr.message}`)

    let groupsRefreshed = 0
    for (const group of groups ?? []) {
      const { error } = await supabaseAdmin.rpc('refresh_group_leaderboard', {
        p_group_id: group.id,
      })
      if (error) {
        console.error(`Failed to refresh group ${group.id}: ${error.message}`)
      } else {
        groupsRefreshed++
      }
    }

    // Refresh global leaderboard
    const globalResult = await refreshGlobalLeaderboard()

    return NextResponse.json({
      success: true,
      groups_refreshed: groupsRefreshed,
      ...globalResult,
    })
  } catch (err) {
    console.error('Refresh leaderboards error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
