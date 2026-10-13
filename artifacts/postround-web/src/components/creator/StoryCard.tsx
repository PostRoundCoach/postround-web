'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown, CircleCheck, Clock3, Loader2, MapPin, RefreshCw, Send, Sparkles, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import type { CreatorContentIdea, CreatorStory, RoundWebContract, StoryPermissionStatus } from '@/lib/creator-stories/contracts'
import { CreatorStoryApiError, creatorReadFailure, fetchRoundContract, dismissCreatorStory, requestStoryApproval } from '@/lib/creator-stories/client'
import { StoryCandidateCard } from './StoryCandidateCard'
import { CreatorRoundScorecard } from './CreatorRoundScorecard'
import { ShareableScorecardGraphic } from './ShareableScorecardGraphic'
import { ShareableAssets } from './ShareableAssets'
import { CreatorCopyButton, creatorCopyText } from './CreatorCopyButton'
import { permissionStatusFromDetail } from '@/lib/creator-stories/approval-state'

export function StoryCard({
  story,
  onDismissed,
}: {
  story: CreatorStory
  onDismissed: (storyId: string) => void
}) {
  const [isFetchingIdeas, setIsFetchingIdeas] = useState(false)
  const [candidates, setCandidates] = useState<CreatorContentIdea[] | null>(null)
  const [roundContract, setRoundContract] = useState<RoundWebContract | null>(null)
  const [retrievalFailed, setRetrievalFailed] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [dismissalFailed, setDismissalFailed] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<StoryPermissionStatus | 'unknown'>('unknown')
  const [isRequestingApproval, setIsRequestingApproval] = useState(false)
  const [approvalRequestFailed, setApprovalRequestFailed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const requestSequence = useRef(0)
  const activeRequest = useRef<AbortController | null>(null)

  const loadCandidates = useCallback(async (
    supabase: NonNullable<ReturnType<typeof createClient>>,
  ) => {
    const sequence = ++requestSequence.current
    activeRequest.current?.abort()
    const controller = new AbortController()
    activeRequest.current = controller
    setIsFetchingIdeas(true)
    setRetrievalFailed(false)
    setRoundContract(null)
    setCandidates(null)
    setPermissionStatus('unknown')
    setAccessDenied(false)

    try {
      const result = await fetchRoundContract(supabase, story.roundId, {
        signal: controller.signal,
      })
      if (sequence !== requestSequence.current) return
      const content = result.contract.creatorContentStory
      if (!content.available || content.candidate.id !== story.id || content.permission.revoked_at !== null) {
        throw new CreatorStoryApiError(403)
      }
      setRoundContract(result.contract)
      const idea = result.contract.creatorContentStory.available
        ? result.contract.creatorContentStory.contentIdea
        : null
      setCandidates(idea ? [{
        id: idea.id,
        story_id: story.id,
        category: idea.category,
        story_angle: idea.story_angle,
        title: idea.title,
        hook: idea.hook,
        script: idea.script ?? '',
        created_at: idea.created_at,
        round: null,
      }] : [])
      const trustedStatus = permissionStatusFromDetail(content.permission)
      setPermissionStatus(trustedStatus)
    } catch (error) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return
      setRoundContract(null)
      setCandidates(null)
      setPermissionStatus('unknown')
      setAccessDenied(error instanceof CreatorStoryApiError && [401, 403].includes(error.status))
      setDetailError(creatorReadFailure(error))
      setRetrievalFailed(true)
    } finally {
      if (sequence !== requestSequence.current) return
      activeRequest.current = null
      setIsFetchingIdeas(false)
    }
  }, [story.id, story.roundId])

  useEffect(() => {
    const supabase = createClient()
    if (supabase && isExpanded && candidates === null && !retrievalFailed) void loadCandidates(supabase)
    return () => {
      requestSequence.current += 1
      activeRequest.current?.abort()
      activeRequest.current = null
    }
  }, [loadCandidates, isExpanded])

  const handleRetryIdeas = async () => {
    if (isFetchingIdeas) return

    const supabase = createClient()
    if (!supabase) {
      setRetrievalFailed(true)
      return
    }

    await loadCandidates(supabase)
  }

  const clearDeniedDetail = (error: unknown) => {
    if (!(error instanceof CreatorStoryApiError) || ![401, 403].includes(error.status)) return
    setRoundContract(null)
    setCandidates(null)
    setPermissionStatus('unknown')
    setAccessDenied(true)
    setDetailError(creatorReadFailure(error))
    setRetrievalFailed(true)
  }

  const handleDismiss = async () => {
    if (isDismissing || isFetchingIdeas || accessDenied) return
    const sequence = requestSequence.current

    const supabase = createClient()
    if (!supabase) {
      setDismissalFailed(true)
      return
    }

    setIsDismissing(true)
    setDismissalFailed(false)

    try {
      await dismissCreatorStory(supabase, story.id)
      if (sequence !== requestSequence.current) return
      onDismissed(story.id)
    } catch (error) {
      if (sequence !== requestSequence.current) return
      clearDeniedDetail(error)
      setDismissalFailed(true)
    } finally {
      setIsDismissing(false)
    }
  }

  const handleRequestApproval = async () => {
    if (isRequestingApproval || permissionStatus === 'approved' || permissionStatus === 'unknown' || accessDenied) return
    const supabase = createClient()
    if (!supabase) {
      setApprovalRequestFailed(true)
      return
    }
    setIsRequestingApproval(true)
    const sequence = requestSequence.current
    setApprovalRequestFailed(false)
    try {
      const result = await requestStoryApproval(supabase, story.id)
      if (sequence !== requestSequence.current) return
      setPermissionStatus(result.permission_status)
    } catch (error) {
      if (sequence !== requestSequence.current) return
      clearDeniedDetail(error)
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
      <div className="p-6 sm:p-8">
        <div className="mb-3 flex items-start justify-between gap-4">
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {story.status === 'shared' ? 'Shared' : 'Offered'}
          </span>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={isExpanded ? 'Collapse story' : 'Expand story'}
            aria-expanded={isExpanded}
            aria-controls={`story-details-${story.id}`}
            onClick={() => setIsExpanded((open) => !open)}
            data-testid={`button-toggle-story-${story.id}`}
          >
            <ChevronDown className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
        <h2 className="break-words font-serif text-2xl font-bold leading-normal" data-testid={`text-story-headline-${story.id}`}>
          {story.headline}
        </h2>
        <p className="mt-3 text-base leading-normal text-muted-foreground">{story.summary}</p>
        {story.significanceScore !== undefined && <p className="mt-2 text-xs text-muted-foreground">
          Relevance score: {story.significanceScore}
        </p>}
      </div>

      <div id={`story-details-${story.id}`} hidden={!isExpanded} className={isExpanded ? undefined : 'hidden'}>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">


          {roundContract && (
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {roundContract.round.played_at && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {roundContract.round.played_at}
                </span>
              )}
              {roundContract.round.course_name && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {roundContract.round.course_name}
                </span>
              )}
              {roundContract.round.player_display_name && (
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {roundContract.round.player_display_name}
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
                Content generated from this player’s Story and source round appears below.
             </p>

            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full text-muted-foreground hover:text-destructive"
              onClick={() => void handleDismiss()}
              disabled={isDismissing || isFetchingIdeas || accessDenied}
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
                     {detailError} The candidate story remains in your queue.
                  </p>
                  {accessDenied && <a href="/login" className="block underline">Sign in again or check creator access</a>}
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
                  disabled={isRequestingApproval || permissionStatus === 'requested' || permissionStatus === 'unknown' || accessDenied}
                  data-testid={`button-request-approval-${story.id}`}
                >
                  {isRequestingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isRequestingApproval ? 'Requesting…' : permissionStatus === 'requested' ? 'Approval requested' : 'Request approval'}
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
             <div className="space-y-6">
               <div className="grid gap-6">
                 {candidates.map((candidate) => (
                   <StoryCandidateCard
                     key={candidate.id}
                     candidate={candidate}
                   />
                 ))}
               </div>
             </div>
           )}
             {roundContract?.coachingReflection.available && (
                <section className="mt-8 rounded-xl border border-border bg-background p-5" data-testid={`section-coaching-reflection-${story.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Coaching reflection</p>
                    <CreatorCopyButton
                      text={creatorCopyText(
                        roundContract.coachingReflection.content.title,
                        roundContract.coachingReflection.content.hook,
                        roundContract.coachingReflection.content.reflection ?? roundContract.coachingReflection.content.script,
                      )}
                      name="Coaching Reflection"
                      testId={`button-copy-reflection-${story.id}`}
                    />
                  </div>
                 <h3 className="mt-2 font-serif text-2xl font-bold">{roundContract.coachingReflection.content.title}</h3>
                 <p className="mt-3 font-medium">{roundContract.coachingReflection.content.hook}</p>
                 {(roundContract.coachingReflection.content.reflection ?? roundContract.coachingReflection.content.script) && (
                   <p className="mt-4 whitespace-pre-wrap text-muted-foreground">
                     {roundContract.coachingReflection.content.reflection ?? roundContract.coachingReflection.content.script}
                   </p>
                 )}
               </section>
             )}
             {roundContract && !roundContract.coachingReflection.available && (
                <div className="mt-8 rounded-xl border border-dashed border-border px-5 py-6" data-testid={`status-coaching-reflection-unavailable-${story.id}`}>
                 <p className="font-medium">Coaching reflection is not available yet.</p>
                 <p className="mt-1 text-sm text-muted-foreground">This experience is generated independently from Creator Content Story.</p>
               </div>
             )}
              {roundContract && (
                <div className="mt-8">
                  <CreatorRoundScorecard
                    round={roundContract.round}
                    roundHighlights={roundContract.roundHighlights}
                    scorecard={roundContract.scorecard}
                  />
                </div>
              )}
            {roundContract && roundContract.creatorContentStory.available
              && roundContract.creatorContentStory.candidate.id === story.id && (
             <div className="mt-8">
                <ShareableAssets contract={roundContract} storyId={story.id}
                  approved={permissionStatus === 'approved' && !!roundContract.creatorContentStory.permission.granted_at
                    && roundContract.creatorContentStory.permission.revoked_at === null} />
                <div className="mt-4" />
               <ShareableScorecardGraphic
                 graphicId={story.id}
                 round={roundContract.round}
                 roundHighlights={roundContract.roundHighlights}
                 scorecard={roundContract.scorecard}
                  permissionStatus={permissionStatus === 'approved' && !!roundContract.creatorContentStory.permission.granted_at
                    && roundContract.creatorContentStory.permission.revoked_at === null ? 'approved' : 'pending'}
               />
             </div>
           )}
        </div>
      )}
      </div>
    </article>
  )
}
