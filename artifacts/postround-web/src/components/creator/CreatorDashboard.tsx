'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

interface CreatorDashboardProps {
  initialProfile?: CreatorProfile
}

export function CreatorDashboard({ initialProfile }: CreatorDashboardProps) {
  const [state, setState] = useState<DashboardState>({ kind: 'loading' })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  const refreshInProgress = useRef(false)

  const load = useCallback(async () => {
    setState({ kind: 'loading' })
    const supabase = createClient()

    if (!supabase) {
      setState({ kind: 'error' })
      return
    }

    try {
      const profile = initialProfile
        ?? await fetchOwnedActiveCreatorProfile(supabase)

      if (!profile) {
        setState({ kind: 'unavailable' })
        return
      }

      const stories = await fetchPermissionedCreatorStories(supabase, profile.id)
      setState({ kind: 'ready', profile, stories })
    } catch {
      setState({ kind: 'error' })
    }
  }, [initialProfile])

  const refreshStories = useCallback(async () => {
    if (refreshInProgress.current || state.kind !== 'ready') return
    refreshInProgress.current = true
    setIsRefreshing(true)
    setRefreshError(false)
    try {
      const supabase = createClient()
      if (!supabase) throw new Error('Authentication unavailable')
      const stories = await fetchPermissionedCreatorStories(supabase, state.profile.id)
      setState((current) => current.kind === 'ready' ? { ...current, stories } : current)
    } catch {
      setRefreshError(true)
    } finally {
      refreshInProgress.current = false
      setIsRefreshing(false)
    }
  }, [state])

  useEffect(() => {
    void load()
  }, [load])

  const handleStoryDismissed = useCallback((storyId: string) => {
    setState((current) => current.kind === 'ready'
      ? {
          ...current,
          stories: current.stories.filter((story) => story.id !== storyId),
        }
      : current)
  }, [])

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
      <div className="mb-6">
        <Button
          type="button"
          variant="outline"
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          onClick={() => void refreshStories()}
          data-testid="button-refresh-available-content"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isRefreshing ? 'Refreshing available content…' : 'Refresh Available Content'}
        </Button>
        {refreshError && (
          <p className="mt-2 text-sm text-destructive" role="alert" data-testid="status-refresh-stories-error">
            Couldn&apos;t refresh available content. Your current stories are still here. Try again.
          </p>
        )}
      </div>
      <StoryQueue
        stories={state.stories}
        profile={state.profile}
        onStoryDismissed={handleStoryDismissed}
      />
    </CreatorShell>
  )
}
