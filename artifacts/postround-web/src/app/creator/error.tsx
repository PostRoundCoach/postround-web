'use client'

import { useEffect } from 'react'
import { PortalTransitionLink, usePortalTransition } from '@/components/portal/PortalTransition'

export default function CreatorError() {
  const { end } = usePortalTransition()
  useEffect(() => { end() }, [end])
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl font-bold">We couldn’t load Creator Studio</h1>
      <p className="text-muted-foreground">Please try again or return to your dashboard.</p>
      <button type="button" onClick={() => window.location.reload()} className="rounded-md bg-[#D4AF37] px-4 py-2 font-semibold text-[#0D1B12]">Try again</button>
      <PortalTransitionLink href="/dashboard" className="text-[#D4AF37] underline">Back to Dashboard</PortalTransitionLink>
    </main>
  )
}