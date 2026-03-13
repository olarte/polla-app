import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'
import { createWalletsForUser } from '@/lib/create-wallets'

export async function POST() {
  try {
    const supabase = createRouteClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await createWalletsForUser(session.user.id)

    if (result === null) {
      return NextResponse.json({ success: true, message: 'Skipped — MiniPay user or wallets already exist' })
    }

    return NextResponse.json({ success: true, wallets: result })
  } catch (error) {
    console.error('create-wallet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
