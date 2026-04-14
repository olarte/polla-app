import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sabi — Predict football, win real money',
  description:
    'Predict football, win real money. Create pools, predict matches, win prizes.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/sabi_pwa.png', type: 'image/png' },
    ],
    shortcut: '/sabi_pwa.png',
    apple: '/sabi_pwa.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sabi',
  },
  openGraph: {
    title: 'Sabi — Predict football, win real money',
    description: 'Predict football, win real money. Create pools, predict matches, win prizes.',
    url: 'https://sabi.gg',
    siteName: 'Sabi',
    images: [
      {
        url: 'https://sabi.gg/api/share/generate?template=invite&group_name=Sabi',
        width: 1200,
        height: 630,
        alt: 'Sabi — Predict football, win real money',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sabi — Predict football, win real money',
    description: 'Predict football, win real money.',
    images: ['https://sabi.gg/api/share/generate?template=invite&group_name=Sabi'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0714',
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
