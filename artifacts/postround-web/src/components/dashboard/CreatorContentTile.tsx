'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PortalTransitionLink } from '@/components/portal/PortalTransition'
import { ArrowRight, PenLine } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { CreatorLandingSummary } from '@/lib/creator-stories/client'
import { creatorTileMetrics } from './creator-tile-metrics'

export function CreatorContentTile({ summary, error, sessionId }: { summary: CreatorLandingSummary | null; error?: string; sessionId: string }) {
  const router = useRouter()
  const [currentSession, setCurrentSession] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentSession(session?.user.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  const visibleSummary = currentSession === sessionId ? summary : null
  return (
    <Card className="mb-6 border-[#D4AF37]/30">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PenLine className="h-5 w-5 shrink-0 text-[#D4AF37]" aria-hidden="true" />
            <h2 className="font-serif text-xl font-semibold">Creator Content</h2>
          </div>
          {currentSession === undefined && <p className="mt-2 text-sm text-muted-foreground">Checking session…</p>}
          {currentSession !== undefined && !visibleSummary && <p className="mt-2 text-sm text-destructive" role="alert">
            {currentSession === sessionId ? error ?? 'Story count unavailable.' : 'Story count unavailable for this session.'}
            {' '}<button type="button" onClick={() => router.refresh()} className="underline">Retry count</button>
            {' '}<Link href="/login" className="underline">Sign in again</Link>
          </p>}
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {creatorTileMetrics(visibleSummary).map((metric) => <span key={metric}>{metric}</span>)}
          </div>
        </div>
        <PortalTransitionLink
          href="/creator"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0D1B12] hover:bg-[#C19F27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
        >
          Open Creator Studio <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PortalTransitionLink>
      </CardContent>
    </Card>
  )
}