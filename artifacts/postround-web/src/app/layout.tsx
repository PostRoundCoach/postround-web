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
  description: 'Your golf round is more than a score. Capture the story, learn from your game, and follow what Post Round is building next.',
  openGraph: {
    title: 'Post Round — Play. Learn. Share.',
    description: 'Your golf round is more than a score.',
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
