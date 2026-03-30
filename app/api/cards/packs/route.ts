import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// GET /api/cards/packs — Get user's booster packs
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: packs, error } = await supabase
    .from('booster_packs')
    .select('*')
    .eq('user_id', session.user.id)
    .order('pack_number', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('total_xp, packs_earned, cards_collected')
    .eq('id', session.user.id)
    .single()

  return NextResponse.json({
    packs: packs || [],
    xp: profile?.total_xp ?? 0,
    packsEarned: profile?.packs_earned ?? 0,
    cardsCollected: profile?.cards_collected ?? 0,
  })
}

// POST /api/cards/packs — Open a booster pack
export async function POST(request: Request) {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { packId } = await request.json()
  if (!packId) {
    return NextResponse.json({ error: 'packId required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('open_booster_pack', {
    p_user_id: session.user.id,
    p_pack_id: packId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ cards: data })
}
