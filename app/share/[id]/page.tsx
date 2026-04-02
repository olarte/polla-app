import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

type Props = {
  params: { id: string }
  searchParams: Record<string, string>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sabi.gg'
  const template = searchParams.template || 'invite'
  const title = searchParams.title || 'Sabi — Predict football, win real money'
  const description =
    searchParams.description || 'The ultimate social prediction game for FIFA World Cup 2026'

  // Build OG image URL from all search params
  const ogParams = new URLSearchParams(searchParams)
  ogParams.set('template', template)
  const ogImageUrl = `${baseUrl}/api/share/generate?${ogParams.toString()}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Sabi',
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

export default function SharePage({ searchParams }: Props) {
  // Redirect to app — the share page only exists for OG previews
  const redirectTo = searchParams.redirect || '/app'
  redirect(redirectTo)
}
