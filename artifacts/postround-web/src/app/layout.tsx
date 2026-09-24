import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import { PortalTransitionProvider } from '@/components/portal/PortalTransition'

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--app-font-serif',
  display: 'swap',
})

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--app-font-sans',
  display: 'swap',
})

function siteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')

  return new URL(configuredUrl)
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: 'Post Round — Play. Learn. Share.',
  description: 'Post Round captures your golf round while you play, helps you understand it afterward, and turns the moments that mattered into stories worth sharing.',
  openGraph: {
    title: 'Post Round — Play. Learn. Share.',
    description: 'Your game. Your story. Your people. Play your round, learn from it, and share what mattered.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${playfair.variable} ${dmSans.variable}`}>
        <PortalTransitionProvider>{children}</PortalTransitionProvider>
      </body>
    </html>
  )
}
