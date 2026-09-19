import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/Footer'

export function LegalPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <>
      <main className="min-h-screen">
        <header className="border-b border-border/60 bg-card/30">
          <div className="container mx-auto max-w-4xl px-6 pb-12 pt-10 md:pb-16 md:pt-14">
            <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Post Round
            </Link>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">{eyebrow}</p>
            <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight md:text-6xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </header>
        <div className="container mx-auto max-w-4xl px-6 py-12 md:py-16">
          <article className="legal-content">{children}</article>
        </div>
      </main>
      <Footer />
    </>
  )
}