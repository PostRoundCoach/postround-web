'use client'

import { Badge } from '@/components/ui/badge'
import type { CreatorContentIdea } from '@/lib/creator-stories/contracts'
import { CreatorCopyButton, creatorCopyText } from './CreatorCopyButton'

export function StoryCandidateCard({
  candidate: idea,
}: {
  candidate: CreatorContentIdea
}) {
  const angle = idea.story_angle && idea.story_angle !== idea.category ? idea.story_angle : null
  const copyText = creatorCopyText(idea.category, angle, idea.title, idea.hook, idea.script)

  return (
    <section className="min-w-0 rounded-xl border border-border bg-background p-5" data-testid={`card-story-candidate-${idea.id}`}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {idea.category && <Badge className="max-w-full whitespace-normal break-words text-left" variant="secondary" data-testid={`badge-story-candidate-archetype-${idea.id}`}>{idea.category}</Badge>}
          {angle && <p className="mt-2 break-words text-sm text-muted-foreground">{angle}</p>}
        </div>
        <CreatorCopyButton text={copyText} name="Creator Story" testId={`button-copy-story-${idea.id}`} />
      </div>
      {idea.title && <h4 className="mt-2 break-words font-serif text-2xl font-bold leading-normal" data-testid={`text-story-candidate-title-${idea.id}`}>{idea.title}</h4>}
      {idea.hook && <p className="mt-3 break-words font-medium">{idea.hook}</p>}
      {idea.script && <p className="mt-4 whitespace-pre-wrap break-words text-muted-foreground">{idea.script}</p>}
    </section>
  )
}