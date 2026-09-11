'use client'

import { Badge } from '@/components/ui/badge'
import type { CreatorContentIdea } from '@/lib/creator-stories/contracts'

export function StoryCandidateCard({
  candidate: idea,
}: {
  candidate: CreatorContentIdea
}) {
  return (
    <details className="group min-w-0 rounded-xl border border-border/70 bg-background p-5 shadow-sm" data-testid={`card-story-candidate-${idea.id}`}>
      <summary className="cursor-pointer list-none">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge className="max-w-full whitespace-normal break-words text-left" variant="secondary" data-testid={`badge-story-candidate-archetype-${idea.id}`}>{idea.category}</Badge>
          <h4 className="mt-3 break-words font-serif text-xl font-bold" data-testid={`text-story-candidate-title-${idea.id}`}>{idea.title}</h4>
        </div>
      </div>
      <p className="mt-4 break-words text-sm font-medium">{idea.hook}</p>
      <p className="mt-3 text-xs font-semibold text-primary group-open:hidden">Open opportunity</p>
      </summary>
      <div className="mt-5 space-y-4 text-sm leading-relaxed">
        <div><p className="text-xs font-bold uppercase tracking-widest text-primary">Ready-to-use script</p><p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{idea.script}</p></div>
      </div>
    </details>
  )
}