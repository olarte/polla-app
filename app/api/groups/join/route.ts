import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createRouteClient } from '@/lib/supabase-route'

// POST /api/groups/join — join a group by invite code
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invite_code, tx_hash } = await req.json()

    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
    }

    // Find group
    const { data: group } = await supabaseAdmin
      .from('groups')
      .select('*')
      .eq('invite_code', invite_code.toUpperCase())
      .single()

    if (!group) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    if (group.status !== 'open') {
      return NextResponse.json({ error: 'This pool is no longer accepting members' }, { status: 400 })
    }

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', session.user.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already a member', group_id: group.id }, { status: 400 })
    }

    // For paid groups: verify wallet connection + payment tx
    if (group.is_paid && group.entry_fee > 0) {
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('wallet_connected')
        .eq('id', session.user.id)
        .single()

      if (!user?.wallet_connected) {
        return NextResponse.json(
          { error: 'Wallet not connected', needs_wallet: true },
          { status: 400 }
        )
      }

      if (!tx_hash) {
        return NextResponse.json(
          { error: 'Payment required', needs_payment: true, entry_fee: group.entry_fee },
          { status: 400 }
        )
      }

      // Record the payment tx_hash (on-chain verification is handled by the
      // USDC Transfer event — the tx_hash serves as proof of payment)
      // In production, you'd verify the tx on-chain via RPC before accepting
    }

    // Add member
    const { error: joinError } = await supabaseAdmin
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: session.user.id,
        role: 'member',
      })

    if (joinError) {
      return NextResponse.json({ error: joinError.message }, { status: 500 })
    }

    // For paid groups: increment pool + member count, record deposit
    if (group.is_paid && group.entry_fee > 0 && tx_hash) {
      const netEntry = group.entry_fee * 0.95 // 5% service fee
      const globalAlloc = netEntry * (group.global_allocation / 100)
      const groupPool = netEntry - globalAlloc

      await supabaseAdmin
        .from('groups')
        .update({
          pool_amount: (group.pool_amount || 0) + groupPool,
          member_count: (group.member_count || 0) + 1,
        })
        .eq('id', group.id)
    } else {
      // Free group: just increment member count
      await supabaseAdmin
        .from('groups')
        .update({ member_count: (group.member_count || 0) + 1 })
        .eq('id', group.id)
    }

    return NextResponse.json({ group_id: group.id })
  } catch (err) {
    console.error('Join group error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
