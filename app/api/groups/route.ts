import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createRouteClient } from '@/lib/supabase-route'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// POST /api/groups — create a new group
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, emoji, is_paid, entry_fee, payout_model, global_allocation } = body

    if (!name || name.length < 2 || name.length > 40) {
      return NextResponse.json({ error: 'Name must be 2-40 characters' }, { status: 400 })
    }

    // Generate unique invite code
    let invite_code = ''
    let attempts = 0
    while (attempts < 10) {
      invite_code = generateCode()
      const { data: existing } = await supabaseAdmin
        .from('groups')
        .select('id')
        .eq('invite_code', invite_code)
        .single()
      if (!existing) break
      attempts++
    }

    if (!invite_code) {
      return NextResponse.json({ error: 'Failed to generate invite code' }, { status: 500 })
    }

    // Validate paid group params
    const fee = is_paid ? Number(entry_fee) : 0
    if (is_paid) {
      if (fee < 5 || fee > 500) {
        return NextResponse.json({ error: 'Entry fee must be $5-$500' }, { status: 400 })
      }

      // For paid groups, check wallet is connected (actual payment handled on-chain in P3)
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('wallet_connected')
        .eq('id', session.user.id)
        .single()

      if (!user?.wallet_connected) {
        return NextResponse.json({ error: 'Wallet not connected', needs_wallet: true }, { status: 400 })
      }
    }

    const model = is_paid ? (payout_model || 'podium_split') : 'podium_split'
    const allocation = is_paid ? (global_allocation || 20) : 20

    // Create group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert({
        name,
        emoji: emoji || '⚽',
        created_by: session.user.id,
        is_paid: !!is_paid,
        entry_fee: fee,
        payout_model: model,
        global_allocation: allocation,
        invite_code,
      })
      .select()
      .single()

    if (groupError) {
      return NextResponse.json({ error: groupError.message }, { status: 500 })
    }

    // Add creator as admin member
    await supabaseAdmin
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: session.user.id,
        role: 'admin',
      })

    return NextResponse.json({ group })
  } catch (err) {
    console.error('Create group error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
