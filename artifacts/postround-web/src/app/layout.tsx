import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

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

export const metadata: Metadata = {
  title: 'Post Round Coach — Your AI Golf Coach',
  description: 'Your AI golf coach after every round. Understand your game, identify your patterns, and build your Player DNA.',
  openGraph: {
    title: 'Post Round Coach',
    description: 'Your AI golf coach after every round.',
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
      <body className={`${playfair.variable} ${dmSans.variable}`}>{children}</body>
    </html>
  )
}
