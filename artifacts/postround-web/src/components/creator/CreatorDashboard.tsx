'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { CreatorProfile, CreatorStory } from '@/lib/creator-stories/contracts'
import {
  fetchOwnedActiveCreatorProfile,
  fetchPermissionedCreatorStories,
} from '@/lib/creator-stories/client'
import { CreatorShell } from './CreatorShell'
import { StoryQueue } from './StoryQueue'

type DashboardState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'ready'; profile: CreatorProfile; stories: CreatorStory[] }

export function CreatorDashboard() {
  const [state, setState] = useState<DashboardState>({ kind: 'loading' })

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    const supabase = createClient()

    if (!supabase) {
      setState({ kind: 'error' })
      return
    }

    try {
      const profile = await fetchOwnedActiveCreatorProfile(supabase)

      if (!profile) {
        setState({ kind: 'unavailable' })
        return
      }

      const stories = await fetchPermissionedCreatorStories(supabase, profile.id)
      setState({ kind: 'ready', profile, stories })
    } catch {
      setState({ kind: 'error' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (state.kind === 'loading') {
    return (
      <CreatorShell profile={null}>
        <div
          className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
          data-testid="status-creator-loading"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your follower stories…</p>
        </div>
      </CreatorShell>
    )
  }

  if (state.kind === 'unavailable') {
    return (
      <CreatorShell profile={null}>
        <div
          className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center text-center"
          data-testid="status-creator-unavailable"
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="font-serif text-3xl font-bold">Creator Studio unavailable</h1>
          <p className="mt-3 text-muted-foreground">
            This account does not control an active creator profile.
          </p>
        </div>
      </CreatorShell>
    )
  }

  if (state.kind === 'error') {
    return (
      <CreatorShell profile={null}>
        <div
          className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center text-center"
          data-testid="status-creator-error"
        >
          <RefreshCw className="mb-5 h-8 w-8 text-destructive" />
          <h1 className="font-serif text-3xl font-bold">We couldn’t load Creator Studio</h1>
          <p className="mt-3 text-muted-foreground">
            Your stories remain private. Please try again.
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => void load()}
            data-testid="button-retry-creator-dashboard"
          >
            Try again
          </Button>
        </div>
      </CreatorShell>
    )
  }

  return (
    <CreatorShell profile={state.profile}>
      <StoryQueue
        stories={state.stories}
        profile={state.profile}
      />
    </CreatorShell>
  )
}
