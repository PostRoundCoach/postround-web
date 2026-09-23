'use client'

import { Badge } from '@/components/ui/badge'
import type { CreatorContentIdea } from '@/lib/creator-stories/contracts'

export function StoryCandidateCard({
  candidate: idea,
}: {
  candidate: CreatorContentIdea
}) {
  return (
    <details className="group min-w-0 rounded-xl border border-border/70 bg-background p-6 shadow-sm" data-testid={`card-story-candidate-${idea.id}`}>
      <summary className="cursor-pointer list-none">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge className="max-w-full whitespace-normal break-words text-left" variant="secondary" data-testid={`badge-story-candidate-archetype-${idea.id}`}>{idea.category}</Badge>
            <h4 className="mt-4 break-words font-serif text-2xl font-bold leading-normal" data-testid={`text-story-candidate-title-${idea.id}`}>{idea.title}</h4>
          </div>
        </div>
        <p className="mt-4 break-words text-base font-medium leading-normal">{idea.hook}</p>
        <p className="mt-4 text-xs font-semibold text-primary group-open:hidden">View full details and context</p>
      </summary>

       <div className="mt-8 space-y-8 border-t border-border pt-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Ready-to-use script</p>
          <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
            <p className="whitespace-pre-wrap break-words text-base leading-normal text-foreground">{idea.script}</p>
          </div>
        </div>

      </div>
    </details>
  )
}