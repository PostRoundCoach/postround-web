'use client'

import { useState } from 'react'
import { Calendar, CircleCheck, Loader2, MapPin, RefreshCw, Sparkles, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import type { CreatorStory, GeneratedIdea } from '@/lib/creator-stories/contracts'
import {
  fetchGeneratedCreatorStoryIdeas,
  generateCreatorStoryContent,
  revokeCreatorStoryPermission,
} from '@/lib/creator-stories/client'
import { GeneratedIdeaCard } from './GeneratedIdeaCard'

export function StoryCard({
  story,
  creatorId,
  onDismissed,
}: {
  story: CreatorStory
  creatorId: string
  onDismissed: (storyId: string) => void
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFetchingIdeas, setIsFetchingIdeas] = useState(false)
  const [generatedCount, setGeneratedCount] = useState<number | null>(null)
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[] | null>(null)
  const [generationFailed, setGenerationFailed] = useState(false)
  const [retrievalFailed, setRetrievalFailed] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [dismissalFailed, setDismissalFailed] = useState(false)

  const loadGeneratedIdeas = async (
    supabase: NonNullable<ReturnType<typeof createClient>>,
  ) => {
    setIsFetchingIdeas(true)
    setRetrievalFailed(false)

    try {
      const result = await fetchGeneratedCreatorStoryIdeas(supabase, story.id)
      setGeneratedIdeas(result.ideas)
    } catch {
      setRetrievalFailed(true)
    } finally {
      setIsFetchingIdeas(false)
    }
  }

  const handleGenerate = async () => {
    if (isGenerating || isFetchingIdeas) return

    const supabase = createClient()
    if (!supabase) {
      setGenerationFailed(true)
      return
    }

    setIsGenerating(true)
    setGenerationFailed(false)
    setRetrievalFailed(false)
    setGeneratedCount(null)
    setGeneratedIdeas(null)

    try {
      const result = await generateCreatorStoryContent(supabase, {
        creator_id: creatorId,
        story_id: story.id,
      })
      setGeneratedCount(result.count)
      setIsGenerating(false)
      await loadGeneratedIdeas(supabase)
    } catch {
      setGenerationFailed(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetryIdeas = async () => {
    if (isGenerating || isFetchingIdeas) return

    const supabase = createClient()
    if (!supabase) {
      setRetrievalFailed(true)
      return
    }

    await loadGeneratedIdeas(supabase)
  }

  const handleDismiss = async () => {
    if (isDismissing || isGenerating || isFetchingIdeas) return

    const supabase = createClient()
    if (!supabase) {
      setDismissalFailed(true)
      return
    }

    setIsDismissing(true)
    setDismissalFailed(false)

    try {
      await revokeCreatorStoryPermission(supabase, story.id)
      onDismissed(story.id)
    } catch {
      setDismissalFailed(true)
    } finally {
      setIsDismissing(false)
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
            <h3 className="font-serif text-xl font-bold">Create social content</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Generate content ideas from this approved follower story.
            </p>

            <Button
              className="mt-6 w-full"
              onClick={() => void handleGenerate()}
              disabled={isGenerating || isFetchingIdeas}
              data-testid={`button-generate-story-${story.id}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate content
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full text-muted-foreground hover:text-destructive"
              onClick={() => void handleDismiss()}
              disabled={isDismissing || isGenerating || isFetchingIdeas}
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
                <AlertTitle>Loading your ideas</AlertTitle>
                <AlertDescription>
                  Generation completed. Retrieving the saved content now.
                </AlertDescription>
              </Alert>
            )}

            {generatedCount !== null && !isFetchingIdeas && !retrievalFailed && (
              <Alert
                className="mt-5 text-left"
                data-testid={`status-generation-success-${story.id}`}
              >
                <CircleCheck className="h-4 w-4" />
                <AlertTitle>Content generated</AlertTitle>
                <AlertDescription>
                  {generatedCount} idea{generatedCount === 1 ? '' : 's'} created from
                  “{story.headline}”.
                </AlertDescription>
              </Alert>
            )}

            {generationFailed && (
              <Alert
                variant="destructive"
                className="mt-5 text-left"
                data-testid={`status-generation-error-${story.id}`}
              >
                <AlertTitle>Generation didn’t complete</AlertTitle>
                <AlertDescription>
                  Please try again. This story remains available in your queue.
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
                    Generation completed, but the saved ideas could not be retrieved.
                    This story remains available.
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
                    Retry loading ideas
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {generatedIdeas !== null && !isFetchingIdeas && !retrievalFailed && (
        <div
          className="border-t border-border bg-muted/10 p-6 sm:p-8"
          data-testid={`section-generated-ideas-${story.id}`}
        >
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Generated from this follower story
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold">{story.headline}</h3>
          </div>

          {generatedIdeas.length === 0 ? (
            <div
              className="rounded-xl border border-dashed border-border bg-background px-5 py-8 text-center"
              data-testid={`status-ideas-empty-${story.id}`}
            >
              <p className="font-medium">No generated ideas are available yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can generate content from this story again when you’re ready.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {generatedIdeas.map((idea) => (
                <GeneratedIdeaCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
