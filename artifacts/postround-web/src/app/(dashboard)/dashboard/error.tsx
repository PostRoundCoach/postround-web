'use client'

import { useEffect } from 'react'
import { usePortalTransition } from '@/components/portal/PortalTransition'

export default function DashboardError() {
  const { end } = usePortalTransition()
  useEffect(() => { end() }, [end])
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-serif text-2xl font-bold">We couldn’t load your dashboard</h1>
      <p className="text-muted-foreground">Please try again.</p>
      <button type="button" onClick={() => window.location.reload()} className="rounded-md bg-[#D4AF37] px-4 py-2 font-semibold text-[#0D1B12]">Try again</button>
    </div>
  )
}