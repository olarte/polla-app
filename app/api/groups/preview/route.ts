import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/groups/preview?code=XXXXXX — public group preview (no auth needed)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }

  const { data: group } = await supabaseAdmin
    .from('groups')
    .select('id, name, emoji, is_paid, entry_fee, payout_model, member_count, pool_amount, status, created_by')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (!group) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  // Get creator display name
  const { data: creator } = await supabaseAdmin
    .from('users')
    .select('display_name, avatar_emoji')
    .eq('id', group.created_by)
    .single()

  return NextResponse.json({
    group: {
      ...group,
      creator_name: creator?.display_name ?? 'Unknown',
      creator_emoji: creator?.avatar_emoji ?? '⚽',
    },
  })
}
