'use client'

import { useEffect, useState } from 'react'
import { Calendar, CircleCheck, Clock3, Loader2, MapPin, RefreshCw, Send, Sparkles, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import type { CreatorContentIdea, CreatorStory } from '@/lib/creator-stories/contracts'
import {
  fetchStoryCandidates,
  dismissCreatorStory,
  requestStoryApproval,
} from '@/lib/creator-stories/client'
import { StoryCandidateCard } from './StoryCandidateCard'

export function StoryCard({
  story,
  onDismissed,
}: {
  story: CreatorStory
  onDismissed: (storyId: string) => void
}) {
  const [isFetchingIdeas, setIsFetchingIdeas] = useState(false)
  const [candidates, setCandidates] = useState<CreatorContentIdea[] | null>(null)
  const [retrievalFailed, setRetrievalFailed] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [dismissalFailed, setDismissalFailed] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState(story.permissionStatus)
  const [isRequestingApproval, setIsRequestingApproval] = useState(false)
  const [approvalRequested, setApprovalRequested] = useState(false)
  const [approvalRequestFailed, setApprovalRequestFailed] = useState(false)

  const loadCandidates = async (
    supabase: NonNullable<ReturnType<typeof createClient>>,
  ) => {
    setIsFetchingIdeas(true)
    setRetrievalFailed(false)

    try {
      const result = await fetchStoryCandidates(supabase, story.id)
      setCandidates(result.ideas)
      setPermissionStatus(result.permission_status)
    } catch {
      setRetrievalFailed(true)
    } finally {
      setIsFetchingIdeas(false)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    void loadCandidates(supabase)
    // The story ID is stable for the lifetime of this card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id])

  const handleRetryIdeas = async () => {
    if (isFetchingIdeas) return

    const supabase = createClient()
    if (!supabase) {
      setRetrievalFailed(true)
      return
    }

    await loadCandidates(supabase)
  }

  const handleDismiss = async () => {
    if (isDismissing || isFetchingIdeas) return

    const supabase = createClient()
    if (!supabase) {
      setDismissalFailed(true)
      return
    }

    setIsDismissing(true)
    setDismissalFailed(false)

    try {
      await dismissCreatorStory(supabase, story.id)
      onDismissed(story.id)
    } catch {
      setDismissalFailed(true)
    } finally {
      setIsDismissing(false)
    }
  }

  const handleRequestApproval = async () => {
    if (isRequestingApproval || permissionStatus === 'approved') return
    const supabase = createClient()
    if (!supabase) {
      setApprovalRequestFailed(true)
      return
    }
    setIsRequestingApproval(true)
    setApprovalRequestFailed(false)
    try {
      const result = await requestStoryApproval(supabase, story.id)
      setPermissionStatus(result.permission_status)
      setApprovalRequested(result.permission_status === 'pending')
    } catch {
      setApprovalRequestFailed(true)
    } finally {
      setIsRequestingApproval(false)
    }
  }

  return (
    <article
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      data-testid={`card-story-${story.id}`}
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6 p-6 sm:p-8">
          <div>
            <Badge
              variant="secondary"
              className="mb-3 border-transparent bg-primary/10 text-primary"
            >
              Post Round follower story
            </Badge>
            <h2
              className="font-serif text-2xl font-bold leading-tight sm:text-3xl"
              data-testid={`text-story-headline-${story.id}`}
            >
              {story.headline}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {story.summary}
            </p>
          </div>

          {story.supportingFacts.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest">
                Supporting details
              </p>
              <ul className="space-y-2.5">
                {story.supportingFacts.map((fact, index) => (
                  <li
                    key={`${fact}-${index}`}
                    className="flex gap-3 text-sm text-muted-foreground"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(story.roundDate || story.course || story.golferDisplayName) && (
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {story.roundDate && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {story.roundDate}
                </span>
              )}
              {story.course && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {story.course}
                </span>
              )}
              {story.golferDisplayName && (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {story.golferDisplayName}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center border-t border-border bg-muted/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="mx-auto w-full max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-serif text-xl font-bold">Find the story in this round</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
               View content already generated from this player’s Story and source round.
            </p>

            <Button
              className="mt-6 w-full"
              onClick={() => void handleRetryIdeas()}
              disabled={isFetchingIdeas}
              data-testid={`button-view-content-${story.id}`}
            >
              {isFetchingIdeas ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                   Loading…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                   View generated content
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full text-muted-foreground hover:text-destructive"
              onClick={() => void handleDismiss()}
              disabled={isDismissing || isFetchingIdeas}
              data-testid={`button-dismiss-story-${story.id}`}
            >
              {isDismissing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dismissing…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Dismiss
                </>
              )}
            </Button>

            {dismissalFailed && (
              <Alert
                variant="destructive"
                className="mt-5 text-left"
                data-testid={`status-dismiss-error-${story.id}`}
              >
                <AlertTitle>Story couldn’t be dismissed</AlertTitle>
                <AlertDescription>
                  <p>This story is still in your queue. Please try again.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void handleDismiss()}
                    disabled={isDismissing}
                    data-testid={`button-retry-dismiss-story-${story.id}`}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry dismissal
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {isFetchingIdeas && (
              <Alert
                className="mt-5 text-left"
                data-testid={`status-ideas-loading-${story.id}`}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertTitle>Retrieving saved story candidates</AlertTitle>
                <AlertDescription>
                   Loading the content already generated for this round.
                </AlertDescription>
              </Alert>
            )}

            {retrievalFailed && (
              <Alert
                variant="destructive"
                className="mt-5 text-left"
                data-testid={`status-ideas-error-${story.id}`}
              >
                <AlertTitle>Ideas couldn’t be loaded</AlertTitle>
                <AlertDescription>
                  <p>
                     Existing content for this Story’s round could not be retrieved.
                     The Story remains available.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void handleRetryIdeas()}
                    disabled={isFetchingIdeas}
                    data-testid={`button-retry-ideas-${story.id}`}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry retrieval
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {candidates !== null && !isFetchingIdeas && !retrievalFailed && (
        <div
          className="border-t border-border bg-muted/10 p-6 sm:p-8"
          data-testid={`section-story-candidates-${story.id}`}
        >
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
               Generated content ideas
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold">{story.headline}</h3>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                {permissionStatus === 'approved'
                  ? <CircleCheck className="mt-0.5 h-5 w-5 text-primary" />
                  : <Clock3 className="mt-0.5 h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="font-semibold">
                    {permissionStatus === 'approved' ? 'Approved by player' : 'Player approval required'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {permissionStatus === 'approved'
                       ? 'This Story and its generated content are now publishable.'
                       : 'You can review the generated content while player approval is pending.'}
                  </p>
                </div>
              </div>
              {permissionStatus !== 'approved' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleRequestApproval()}
                  disabled={isRequestingApproval || approvalRequested}
                  data-testid={`button-request-approval-${story.id}`}
                >
                  {isRequestingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isRequestingApproval ? 'Requesting…' : approvalRequested ? 'Approval requested' : 'Request approval'}
                </Button>
              )}
            </div>
            {approvalRequestFailed && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                Approval could not be requested. Please try again.
              </p>
            )}
          </div>

          {candidates.length === 0 ? (
            <div
              className="rounded-xl border border-dashed border-border bg-background px-5 py-8 text-center"
              data-testid={`status-candidates-empty-${story.id}`}
            >
               <p className="font-medium">Generated content is not available yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                 No existing content ideas were found for this Story’s source round. You can retry retrieval later.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {candidates.map((candidate) => (
                <StoryCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  permissionStatus={permissionStatus}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
