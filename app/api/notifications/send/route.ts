import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

// This endpoint is called by cron jobs or internal services to send push notifications.
// Protected by API key — not called by clients directly.

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expectedKey = process.env.CRON_SECRET || process.env.API_SECRET_KEY

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user_ids, title, body, url, icon } = await req.json()

  if (!user_ids?.length || !title) {
    return NextResponse.json({ error: 'user_ids and title required' }, { status: 400 })
  }

  // Configure web-push
  webpush.setVapidDetails(
    'mailto:hello@polla.football',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get subscriptions for target users
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys, user_id')
    .in('user_id', user_ids)

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0, reason: 'No subscriptions found' })
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/icon-192.png',
    data: { url: url || '/' },
  })

  let sent = 0
  let failed = 0
  const staleEndpoints: string[] = []

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      )
      sent++
    } catch (err: unknown) {
      failed++
      // Remove stale subscriptions (410 Gone or 404)
      if (err && typeof err === 'object' && 'statusCode' in err) {
        const statusCode = (err as { statusCode: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          staleEndpoints.push(sub.endpoint)
        }
      }
    }
  }

  // Clean up stale subscriptions
  if (staleEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', staleEndpoints)
  }

  return NextResponse.json({ sent, failed, cleaned: staleEndpoints.length })
}
