import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

// GET /api/cards — Get all cards catalog + user's collection
export async function GET() {
  const supabase = createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get full card catalog
  const { data: cards, error: cardsErr } = await supabase
    .from('cards')
    .select('*')
    .order('card_number', { ascending: true })

  if (cardsErr) {
    return NextResponse.json({ error: cardsErr.message }, { status: 500 })
  }

  // Get user's collected cards (with counts for duplicates)
  const { data: userCards } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('user_id', session.user.id)

  // Build ownership map: card_id -> count
  const owned: Record<string, number> = {}
  if (userCards) {
    for (const uc of userCards) {
      owned[uc.card_id] = (owned[uc.card_id] || 0) + 1
    }
  }

  const uniqueOwned = Object.keys(owned).length

  return NextResponse.json({
    cards: cards || [],
    owned,
    uniqueOwned,
    total: (cards || []).length,
  })
}
