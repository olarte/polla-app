import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

type Props = {
  params: { code: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://polla.football'

  // Fetch group preview for OG tags
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: group } = await supabase
    .from('groups')
    .select('name, emoji, is_paid, entry_fee, member_count:group_members(count)')
    .eq('invite_code', code)
    .single()

  const groupName = group?.name || 'Polla'
  const emoji = group?.emoji || '🐔'
  const title = `Join ${emoji} ${groupName} on Polla`
  const description = group?.is_paid
    ? `$${group.entry_fee} entry • Predict the World Cup 2026 with friends`
    : 'Free to play • Predict the World Cup 2026 with friends'

  const ogImageUrl = `${baseUrl}/api/share/generate?template=invite&group_name=${encodeURIComponent(groupName)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/join/${code}`,
      siteName: 'Polla Football',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  }
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
