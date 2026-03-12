import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

const BLOCKRADAR_API = 'https://api.blockradar.io/v1'

const CHAIN_CONFIG: Record<string, { walletIdEnv: string; chain: string }> = {
  celo: { walletIdEnv: 'BLOCKRADAR_CELO_WALLET_ID', chain: 'celo' },
  base: { walletIdEnv: 'BLOCKRADAR_BASE_WALLET_ID', chain: 'base' },
  polygon: { walletIdEnv: 'BLOCKRADAR_POLYGON_WALLET_ID', chain: 'polygon' },
  tron: { walletIdEnv: 'BLOCKRADAR_TRON_WALLET_ID', chain: 'tron' },
  ethereum: { walletIdEnv: 'BLOCKRADAR_ETHEREUM_WALLET_ID', chain: 'ethereum' },
}

async function createBlockradarAddress(
  chain: string,
  walletId: string,
  userId: string
): Promise<string | null> {
  try {
    const res = await fetch(`${BLOCKRADAR_API}/wallets/${walletId}/addresses`, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.BLOCKRADAR_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `polla-user-${userId}-${chain}`,
        network: chain,
      }),
    })

    if (!res.ok) {
      console.error(`Blockradar ${chain} error:`, await res.text())
      return null
    }

    const data = await res.json()
    return data.data?.address || null
  } catch (error) {
    console.error(`Blockradar ${chain} error:`, error)
    return null
  }
}

export async function POST() {
  try {
    const supabase = createRouteClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    // Check if user is MiniPay — skip wallet creation
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('is_minipay_user, wallet_celo')
      .eq('id', userId)
      .single()

    if (user?.is_minipay_user) {
      return NextResponse.json({ success: true, message: 'MiniPay user — using existing wallet' })
    }

    if (user?.wallet_celo) {
      return NextResponse.json({ success: true, message: 'Wallets already created' })
    }

    // Create addresses on all 5 chains in parallel
    const results = await Promise.allSettled(
      Object.entries(CHAIN_CONFIG).map(async ([key, config]) => {
        const walletId = process.env[config.walletIdEnv]
        if (!walletId) return { chain: key, address: null }
        const address = await createBlockradarAddress(config.chain, walletId, userId)
        return { chain: key, address }
      })
    )

    const addresses: Record<string, string | null> = {}
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        addresses[result.value.chain] = result.value.address
      }
    }

    await supabaseAdmin
      .from('users')
      .update({
        wallet_celo: addresses.celo || null,
        wallet_base: addresses.base || null,
        wallet_polygon: addresses.polygon || null,
        wallet_tron: addresses.tron || null,
        wallet_ethereum: addresses.ethereum || null,
      })
      .eq('id', userId)

    return NextResponse.json({ success: true, wallets: addresses })
  } catch (error) {
    console.error('create-wallet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
