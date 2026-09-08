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
      <body className={`${playfair.variable} ${dmSans.variable}`}>{children}</body>
    </html>
  )
}
