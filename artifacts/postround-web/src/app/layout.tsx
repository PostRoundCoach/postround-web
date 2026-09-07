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
  description: 'Capture your golf round while you play, learn from every score and story, and share the moments that made it yours.',
  openGraph: {
    title: 'Post Round — Play. Learn. Share.',
    description: 'Capture your round. Learn from your game. Share your story.',
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
