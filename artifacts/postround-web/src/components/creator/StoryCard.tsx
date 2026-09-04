'use client'

import { useState } from 'react'
import { Calendar, CircleCheck, Loader2, MapPin, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import type { CreatorStory } from '@/lib/creator-stories/contracts'
import { generateCreatorStoryContent } from '@/lib/creator-stories/client'

export function StoryCard({
  story,
  creatorId,
}: {
  story: CreatorStory
  creatorId: string
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCount, setGeneratedCount] = useState<number | null>(null)
  const [generationFailed, setGenerationFailed] = useState(false)

  const handleGenerate = async () => {
    if (isGenerating) return

    const supabase = createClient()
    if (!supabase) {
      setGenerationFailed(true)
      return
    }

    setIsGenerating(true)
    setGenerationFailed(false)

    try {
      const result = await generateCreatorStoryContent(supabase, {
        creator_id: creatorId,
        story_id: story.id,
      })
      setGeneratedCount(result.count)
    } catch {
      setGenerationFailed(true)
    } finally {
      setIsGenerating(false)
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
              disabled={isGenerating}
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

            {generatedCount !== null && (
              <Alert
                className="mt-5 text-left"
                data-testid={`status-generation-success-${story.id}`}
              >
                <CircleCheck className="h-4 w-4" />
                <AlertTitle>Content generated</AlertTitle>
                <AlertDescription>
                  {generatedCount} idea{generatedCount === 1 ? '' : 's'} created from
                  “{story.headline}”. Creator access to the generated ideas is not
                  available yet.
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
          </div>
        </div>
      </div>
    </article>
  )
}
