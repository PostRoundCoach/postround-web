'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { CreatorProfile, CreatorStoriesResponse } from '@/lib/creator-stories/contracts'
import { creatorReadFailure, CreatorStoryApiError, fetchPermissionedCreatorStories } from '@/lib/creator-stories/client'
import { CreatorShell } from './CreatorShell'
import { StoryQueue } from './StoryQueue'

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; session: boolean }
  | { kind: 'ready'; data: CreatorStoriesResponse; sessionId: string }

export function CreatorDashboard({ initialProfile }: { initialProfile?: CreatorProfile }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const sequence = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const sessionId = useRef<string | null>(null)
  const mounted = useRef(false)

  const load = useCallback(async (refresh = false) => {
    const request = ++sequence.current
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setRefreshError(null)
    setRefreshing(refresh)
    if (!refresh) setState({ kind: 'loading' })
    const supabase = createClient()
    try {
      if (!supabase) throw new Error('Authentication unavailable')
      const { data: { session } } = await supabase.auth.getSession()
      const owner = session?.user.id ?? null
      if (!owner) throw new CreatorStoryApiError(401)
      const data = await fetchPermissionedCreatorStories(supabase, { signal: abort.signal })
      if (!mounted.current || abort.signal.aborted || request !== sequence.current || sessionId.current !== owner) return
      setState({ kind: 'ready', data, sessionId: owner })
    } catch (error) {
      if (!mounted.current || abort.signal.aborted || request !== sequence.current) return
      const message = creatorReadFailure(error)
      const authFailure = error instanceof CreatorStoryApiError && [401, 403].includes(error.status)
      if (refresh && !authFailure) setRefreshError(message)
      else setState({ kind: 'error', message, session: error instanceof CreatorStoryApiError && error.status === 401 })
    } finally {
      if (mounted.current && request === sequence.current) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    const supabase = createClient()
    if (!supabase) { void load(); return () => { mounted.current = false } }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user.id ?? null
      if (nextId === sessionId.current && _event !== 'INITIAL_SESSION') return
      sessionId.current = nextId
      sequence.current += 1
      controller.current?.abort()
      setRefreshError(null)
      setRefreshing(false)
      setState(nextId ? { kind: 'loading' } : { kind: 'error', message: creatorReadFailure(new CreatorStoryApiError(401)), session: true })
      // Do not await Supabase methods inside its auth callback.
      if (nextId) queueMicrotask(() => { if (mounted.current) void load() })
    })
    return () => {
      mounted.current = false
      sequence.current += 1
      controller.current?.abort()
      subscription.unsubscribe()
    }
  }, [load])

  return (
    <CreatorShell profile={state.kind === 'ready' ? state.data.creator : null}>
      {state.kind === 'loading' ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" data-testid="status-creator-loading">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading your shared stories…</p>
        </div>
      ) : state.kind === 'error' ? (
        <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center text-center" data-testid="status-creator-error">
          <h1 className="font-serif text-3xl font-bold">We couldn’t load Creator Studio</h1>
          <p className="mt-3" role="alert">{state.message}</p>
          {state.session ? <Link className="mt-6 underline" href="/login">Sign in again</Link> : (
            <Button className="mt-6" variant="outline" onClick={() => void load()} data-testid="button-retry-creator-dashboard">Try again</Button>
          )}
        </div>
      ) : (
        <div key={state.sessionId}>
          <div className="mb-6">
            <Button variant="outline" disabled={refreshing} aria-busy={refreshing} onClick={() => void load(true)} data-testid="button-refresh-available-content">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing available content…' : 'Refresh Available Content'}
            </Button>
            {refreshError && <p className="mt-2 text-sm text-destructive" role="alert" data-testid="status-refresh-stories-error">{refreshError} Your current stories are still here.</p>}
          </div>
          <StoryQueue stories={state.data.stories}
            profile={initialProfile?.id === state.data.creator.id ? initialProfile : undefined}
            onStoryDismissed={(id) => setState((current) => current.kind === 'ready'
              ? { ...current, data: { ...current.data, stories: current.data.stories.filter((story) => story.id !== id) } }
              : current)} />
        </div>
      )}
    </CreatorShell>
  )
}
