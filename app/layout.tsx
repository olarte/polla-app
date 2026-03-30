import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Polla Football — Predict the World Cup 2026',
  description:
    'The ultimate social prediction game for FIFA World Cup 2026. Create groups, predict matches, win prizes.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Polla',
  },
  openGraph: {
    title: 'Polla Football — Predict the World Cup 2026',
    description: 'The ultimate social prediction game for FIFA World Cup 2026. Create groups, predict matches, win prizes.',
    url: 'https://polla.football',
    siteName: 'Polla Football',
    images: [
      {
        url: 'https://polla.football/api/share/generate?template=invite&group_name=Polla%20Football',
        width: 1200,
        height: 630,
        alt: 'Polla Football — Predict the World Cup 2026',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Polla Football — Predict the World Cup 2026',
    description: 'The ultimate social prediction game for FIFA World Cup 2026.',
    images: ['https://polla.football/api/share/generate?template=invite&group_name=Polla%20Football'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A0A12',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className="bg-polla-bg text-text-100 antialiased font-sans selection:bg-polla-accent/30"
        style={{ overscrollBehavior: 'none' }}
      >
        {children}
      </body>
    </html>
  )
}
